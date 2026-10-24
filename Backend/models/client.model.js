// Client queries and changes for the admin Clients page (database/handoff.md §4.1, §4.2, §5.2,
// §5.3). A client's segment, returning flag, received/balance and login state are computed on
// every read (services/client-derive.js), never stored.
//
// Soft delete: `deletedAt` hides the client from this page, from the client picker and from login.
// Their bookings, payments and galleries are not touched, and their email/phone stay taken.
//
// Scale note: "Recent activity" and "Most received" order the whole filtered set in memory
// (ids + one aggregate query) before paging — a studio has hundreds of clients, not millions.
import { DateTime } from 'luxon';
import prisma from '../config/db.js';
import { STUDIO_ZONE, nowInStudio, toStudio } from '../utils/date.js';
import { toE164 } from '../utils/phone.js';
import { HttpError } from '../utils/http.js';
import { deriveContext, deriveBooking, formatCents, withSettingsFallback } from '../services/booking-derive.js';
import { CLIENT_TABS, REACH_OUT_DAYS, clientLoginWhere, clientTabWhere, deriveClient } from '../services/client-derive.js';
import { REBOOK_LABEL, defaultRebookDay } from './booking.model.js';
import { syncLoginEmail } from './login-email.js';

const MAX_PAGE_SIZE = 100;
const HISTORY_LIMIT = 50;

const PROFILE = {
  id: true,
  displayName: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  phoneE164: true,
  instagram: true,
  heardFrom: true,
  privateNotes: true,
  createdAt: true,
};

// What deriveBooking needs on each booking, plus the login and the open reminders.
const DERIVE_BOOKING = {
  payments: { select: { kind: true, method: true, amountCents: true, receivedAt: true } },
  gallery: { select: { id: true, status: true, deliveredAt: true, expiresAt: true } },
  rebookReminders: { where: { doneAt: null }, select: { id: true } },
};
const DERIVE_INCLUDE = {
  user: { select: { mustChangePassword: true, invitedAt: true, lastLoginAt: true } },
  rebookReminders: { where: { doneAt: null }, select: { id: true, kind: true, label: true, dueOn: true } },
  bookings: { include: DERIVE_BOOKING },
};

const orNull = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
const fullName = (first, last) => [first, last].filter(Boolean).join(' ').trim();

async function context() {
  const settings = await prisma.studioSettings.findUnique({ where: { id: 1 } });
  return deriveContext(withSettingsFallback(settings));
}

function searchClause(q) {
  const term = typeof q === 'string' ? q.trim() : '';
  if (!term) return {};
  const or = [
    { displayName: { contains: term } },
    { firstName: { contains: term } },
    { lastName: { contains: term } },
    { email: { contains: term } },
    { phone: { contains: term } },
    { instagram: { contains: term } },
  ];
  // A full phone number in any format also finds the client by its normalized phone.
  const e164 = toE164(term);
  if (e164) or.push({ phoneE164: e164 });
  return { OR: or };
}

// A unique email/phone already used by a different client → 409 with who owns it (§4.4).
// `details` lets the page offer "Open that client" (or "Restore" if they were deleted).
async function assertFree(tx, clientId, { email, phoneE164 }) {
  const taken = async (field, value, label) => {
    if (!value) return;
    const owner = await tx.client.findUnique({ where: { [field]: value }, select: { id: true, displayName: true, deletedAt: true } });
    if (!owner || owner.id === clientId) return;
    const deleted = Boolean(owner.deletedAt);
    throw new HttpError(
      409,
      deleted ? `This ${label} belongs to ${owner.displayName}, who was deleted` : `This ${label} belongs to ${owner.displayName}`,
      { field: label, clientId: owner.id, name: owner.displayName, deleted },
    );
  };
  await taken('email', email, 'email');
  await taken('phoneE164', phoneE164, 'phone');
}

const event = (tx, client, actorId, type, message, metadata) =>
  tx.activityEvent.create({
    data: { type, actorType: 'ADMIN', actorId, clientId: client.id, message, metadata },
  });

// Booking rows shown in the profile ("Sessions"): the booking plus what its tags need.
function sessionRow(booking, ctx) {
  const d = deriveBooking(booking, ctx);
  return {
    id: booking.id,
    code: booking.code,
    status: booking.status,
    startsAt: booking.startsAt,
    serviceNameSnapshot: booking.serviceNameSnapshot,
    packageNameSnapshot: booking.packageNameSnapshot,
    locationName: booking.locationName,
    totalCents: booking.totalCents,
    derived: {
      tab: d.tab,
      status: d.status,
      payment: d.payment,
      paidCents: d.paidCents,
      balanceCents: d.balanceCents,
      galleryState: d.galleryState,
    },
  };
}

class ClientModel {
  // Header numbers + tab counts. Deleted clients count for nothing.
  static async summary() {
    const ctx = await context();
    const live = { deletedAt: null };
    const year = ctx.now.year;
    const yearStart = DateTime.fromObject({ year }, { zone: STUDIO_ZONE });
    const reachBy = DateTime.fromISO(ctx.now.toISODate(), { zone: 'utc' }).plus({ days: REACH_OUT_DAYS });
    const noUpcoming = clientTabWhere('upcoming', ctx.pastCutoff).bookings;

    const [counts, returning, payments, reach] = await Promise.all([
      Promise.all(CLIENT_TABS.map((tab) => prisma.client.count({ where: { ...live, ...clientTabWhere(tab, ctx.pastCutoff) } }))),
      // Two or more active bookings = returning. Grouped, not loaded.
      prisma.booking.groupBy({
        by: ['clientId'],
        where: { status: { in: ['AWAITING_DEPOSIT', 'CONFIRMED'] }, client: live },
        _count: { _all: true },
      }),
      prisma.payment.findMany({
        where: { receivedAt: { gte: yearStart.toJSDate(), lt: yearStart.plus({ years: 1 }).toJSDate() }, booking: { client: live } },
        select: { kind: true, amountCents: true },
      }),
      prisma.client.count({
        where: {
          ...live,
          rebookReminders: { some: { doneAt: null, dueOn: { lte: reachBy.toJSDate() } } },
          bookings: { none: noUpcoming.some },
        },
      }),
    ]);

    return {
      total: counts[0],
      returning: returning.filter((r) => r._count._all >= 2).length,
      year,
      receivedYearCents: payments.reduce((sum, p) => sum + (p.kind === 'REFUND' ? -p.amountCents : p.amountCents), 0),
      reachOutSoon: reach,
      counts: Object.fromEntries(CLIENT_TABS.map((tab, i) => [tab, counts[i]])),
    };
  }

  static async list({ tab = 'all', q, heardFrom, login, sort, dir = 'asc', page = 1, pageSize = 25 }) {
    const ctx = await context();
    const take = Math.min(Math.max(Number(pageSize) || 25, 1), MAX_PAGE_SIZE);
    const currentPage = Math.max(Number(page) || 1, 1);
    const where = {
      deletedAt: null,
      ...clientTabWhere(tab, ctx.pastCutoff),
      ...searchClause(q),
      ...(heardFrom ? { heardFrom } : {}),
      ...clientLoginWhere(login),
    };
    const total = await prisma.client.count({ where });

    let ids;
    if (sort === 'name') {
      const d = dir === 'desc' ? 'desc' : 'asc';
      const rows = await prisma.client.findMany({
        where,
        select: { id: true },
        orderBy: [{ displayName: d }, { id: d }],
        skip: (currentPage - 1) * take,
        take,
      });
      ids = rows.map((r) => r.id);
    } else {
      const all = await prisma.client.findMany({ where, select: { id: true, createdAt: true } });
      const allIds = all.map((c) => c.id);
      const score = new Map();
      if (sort === 'received') {
        const pays = await prisma.payment.findMany({
          where: { booking: { clientId: { in: allIds } } },
          select: { kind: true, amountCents: true, booking: { select: { clientId: true } } },
        });
        for (const p of pays) {
          const id = p.booking.clientId;
          score.set(id, (score.get(id) ?? 0) + (p.kind === 'REFUND' ? -p.amountCents : p.amountCents));
        }
      } else {
        const last = await prisma.activityEvent.groupBy({ by: ['clientId'], where: { clientId: { in: allIds } }, _max: { createdAt: true } });
        for (const l of last) score.set(l.clientId, l._max.createdAt.getTime());
        for (const c of all) if (!score.has(c.id)) score.set(c.id, c.createdAt.getTime());
      }
      // Most received / most recent first by default; "asc" flips it.
      const sign = dir === 'asc' && sort === 'received' ? 1 : -1;
      ids = all
        .sort((a, b) => sign * ((score.get(a.id) ?? 0) - (score.get(b.id) ?? 0)) || a.id - b.id)
        .slice((currentPage - 1) * take, currentPage * take)
        .map((c) => c.id);
    }

    const rows = await prisma.client.findMany({ where: { id: { in: ids } }, select: { ...PROFILE, ...DERIVE_INCLUDE } });
    const byId = new Map(rows.map((c) => [c.id, c]));
    const items = ids.map((id) => byId.get(id)).filter(Boolean).map((c) => ClientModel.toRow(c, ctx));
    return { items, total, page: currentPage, pageSize: take };
  }

  // A row: profile columns + computed block, without the raw bookings that only feed it.
  static toRow(client, ctx) {
    const { bookings, user, rebookReminders, ...profile } = client;
    return { ...profile, ...deriveClient(client, ctx) };
  }

  static async get(id) {
    const ctx = await context();
    const client = await prisma.client.findFirst({
      where: { id, deletedAt: null },
      select: { ...PROFILE, ...DERIVE_INCLUDE },
    });
    if (!client) throw new HttpError(404, 'Client not found');
    const history = await prisma.activityEvent.findMany({
      where: { clientId: id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: HISTORY_LIMIT,
      select: { id: true, type: true, message: true, createdAt: true },
    });
    const sessions = [...client.bookings]
      .sort((a, b) => toStudio(b.startsAt) - toStudio(a.startsAt))
      .map((b) => sessionRow(b, ctx));
    return { client: ClientModel.toRow(client, ctx), sessions, history };
  }

  static async create(input, actorId) {
    const email = orNull(input.email)?.toLowerCase();
    const phone = orNull(input.phone);
    const phoneE164 = phone ? toE164(phone) : null;
    if (phone && !phoneE164) throw new HttpError(400, 'Enter a valid US phone number');
    const firstName = orNull(input.firstName);
    const lastName = orNull(input.lastName);
    const displayName = orNull(input.displayName) ?? fullName(firstName, lastName);

    const id = await prisma.$transaction(async (tx) => {
      await assertFree(tx, null, { email, phoneE164 });
      const client = await tx.client.create({
        data: {
          displayName,
          firstName,
          lastName,
          email,
          phone,
          phoneE164,
          instagram: orNull(input.instagram),
          heardFrom: input.heardFrom ?? null,
          privateNotes: orNull(input.privateNotes),
        },
      });
      await event(tx, client, actorId, 'client.created', 'Client added by hand');
      return client.id;
    });
    return ClientModel.get(id);
  }

  // Edit details / notes: send only what changed. Email is also the login, so it follows to User.
  static async update(id, input, actorId) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.client.findFirst({ where: { id, deletedAt: null }, include: { user: { select: { id: true, email: true } } } });
      if (!current) throw new HttpError(404, 'Client not found');

      const data = {};
      for (const key of ['firstName', 'lastName', 'displayName', 'instagram', 'heardFrom', 'privateNotes']) {
        if (input[key] === undefined) continue;
        data[key] = key === 'heardFrom' ? input[key] : orNull(input[key]);
      }
      if (input.email !== undefined) data.email = orNull(input.email)?.toLowerCase();
      if (input.phone !== undefined) {
        const phone = orNull(input.phone);
        const phoneE164 = phone ? toE164(phone) : null;
        if (phone && !phoneE164) throw new HttpError(400, 'Enter a valid US phone number');
        data.phone = phone;
        data.phoneE164 = phoneE164;
      }
      const changed = Object.keys(data).filter((k) => (current[k] ?? null) !== data[k]);
      if (changed.length === 0) return;

      await assertFree(tx, id, { email: changed.includes('email') ? data.email : null, phoneE164: changed.includes('phoneE164') ? data.phoneE164 : null });
      if (changed.includes('email')) await syncLoginEmail(tx, current.user, data.email);
      await tx.client.update({ where: { id }, data: Object.fromEntries(changed.map((k) => [k, data[k]])) });

      if (changed.includes('email')) {
        // INTEGRATION(correos): queue the "your login email changed" notice to data.email here
        // (docs/clients-page-integraciones.md).
        await event(tx, current, actorId, 'client.email_changed', `Email changed from ${current.email} to ${data.email}`, {
          from: current.email,
          to: data.email,
        });
      }
      // Notes alone are not worth a History line.
      const shown = changed.filter((k) => !['privateNotes', 'email', 'phoneE164'].includes(k));
      if (shown.length > 0) {
        await event(tx, current, actorId, 'client.updated', `Details updated: ${shown.join(', ')}`, {
          fields: Object.fromEntries(shown.map((k) => [k, { from: current[k] ?? null, to: data[k] }])),
        });
      }
    });
    return ClientModel.get(id);
  }

  // One open reminder per client: setting one replaces the open ones, `kind: null` clears them.
  static async setReminder(id, { kind, dueOn, label }, actorId) {
    await prisma.$transaction(async (tx) => {
      const client = await tx.client.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, bookings: { select: { startsAt: true }, orderBy: { startsAt: 'desc' }, take: 1 } },
      });
      if (!client) throw new HttpError(404, 'Client not found');
      const now = DateTime.utc().toJSDate();
      const { count: closed } = await tx.rebookReminder.updateMany({ where: { clientId: id, doneAt: null }, data: { doneAt: now } });
      if (kind === null) {
        if (closed === 0) throw new HttpError(409, 'There is no open rebook reminder to clear');
        await event(tx, client, actorId, 'client.rebook_set', 'Rebook reminder cleared', { kind: null, closed });
        return;
      }
      const day = dueOn
        ? DateTime.fromISO(dueOn, { zone: STUDIO_ZONE })
        : defaultRebookDay(kind, client.bookings[0]?.startsAt ?? now);
      const text = label || REBOOK_LABEL[kind];
      const reminder = await tx.rebookReminder.create({
        data: { clientId: id, kind, label: text, dueOn: DateTime.fromISO(day.toISODate(), { zone: 'utc' }).toJSDate() },
      });
      await event(tx, client, actorId, 'client.rebook_set', `Rebook reminder set — ${text}, around ${day.toFormat('LLL d, yyyy')}`, {
        reminderId: reminder.id,
        kind,
        dueOn: day.toISODate(),
        label: text,
        closed,
      });
    });
    return ClientModel.get(id);
  }

  static async remove(id, actorId) {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.client.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: DateTime.utc().toJSDate() } });
      if (count === 0) throw new HttpError(404, 'Client not found');
      await event(tx, { id }, actorId, 'client.deleted', 'Client deleted (hidden from the studio)');
    });
    return { id };
  }

  static async restore(id, actorId) {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.client.updateMany({ where: { id, deletedAt: { not: null } }, data: { deletedAt: null } });
      if (count === 0) throw new HttpError(404, 'Client not found');
      await event(tx, { id }, actorId, 'client.restored', 'Client restored');
    });
    return ClientModel.get(id);
  }
}

export default ClientModel;
