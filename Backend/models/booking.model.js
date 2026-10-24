// Booking queries for the admin Bookings page. The schema lives in database/prisma/schema.prisma.
// Matching rules ("Cliente que vuelve" — database/handoff.md §4.4) show up in the Booking
// fields `clientMatchedBy` / `matchReviewedAt` and in `contact*` (what was typed on /book,
// which never overwrites Client on its own).
//
// Every state change writes its ActivityEvent in the same transaction, so the History in the
// drawer can't disagree with the booking.
import { DateTime } from 'luxon';
import prisma from '../config/db.js';
import { STUDIO_ZONE, nowInStudio, studioDayKey, studioMonthRange, toStudio } from '../utils/date.js';
import { toE164 } from '../utils/phone.js';
import { HttpError } from '../utils/http.js';
import {
  ACTIVE_STATUSES,
  archiveBlocker,
  deriveBooking,
  deriveContext,
  formatCents,
  isPastSession,
  paidCents,
  pendingCents,
  sortOrderBy,
  tabOrderBy,
  tabWhere,
  TABS,
  withSettingsFallback,
} from '../services/booking-derive.js';
import { syncLoginEmail } from './login-email.js';

const MAX_PAGE_SIZE = 100;
const REVIEWABLE_MATCHES = ['PHONE', 'CONFLICT'];

const CLIENT_SUMMARY = {
  select: {
    id: true,
    displayName: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    phoneE164: true,
  },
};

const LIST_INCLUDE = {
  client: CLIENT_SUMMARY,
  service: { select: { id: true, name: true, slug: true } },
  extras: { select: { extraId: true, nameSnapshot: true, priceCentsSnapshot: true, quantity: true } },
};

const fullName = (first, last) => [first, last].filter(Boolean).join(' ').trim();

function searchClause(q) {
  const term = typeof q === 'string' ? q.trim() : '';
  if (!term) return {};
  const or = [
    { code: { contains: term } },
    { contactFirstName: { contains: term } },
    { contactLastName: { contains: term } },
    { contactEmail: { contains: term } },
    { contactPhone: { contains: term } },
    { client: { displayName: { contains: term } } },
    { client: { email: { contains: term } } },
    { client: { phone: { contains: term } } },
  ];
  // A full phone number in any format also finds the client by its normalized phone.
  const e164 = toE164(term);
  if (e164) or.push({ client: { phoneE164: e164 } });
  return { OR: or };
}

// What was typed on /book that differs from the linked Client. Empty when nothing changed.
function detailChanges(booking) {
  const c = booking.client;
  if (!c) return [];
  const changes = [];
  const email = booking.contactEmail?.trim().toLowerCase();
  if (email && email !== c.email?.toLowerCase()) {
    changes.push({ field: 'email', from: c.email, to: booking.contactEmail });
  }
  const typedName = fullName(booking.contactFirstName?.trim(), booking.contactLastName?.trim());
  if (typedName && typedName !== fullName(c.firstName, c.lastName)) {
    changes.push({ field: 'name', from: fullName(c.firstName, c.lastName) || c.displayName, to: typedName });
  }
  // A client split off by "Not the same person" keeps the phone without phoneE164.
  const phoneE164 = toE164(booking.contactPhone);
  if (phoneE164 && phoneE164 !== (c.phoneE164 ?? toE164(c.phone))) {
    changes.push({ field: 'phone', from: c.phone, to: booking.contactPhone });
  }
  return changes;
}

async function studioSettings(tx = prisma) {
  return withSettingsFallback(await tx.studioSettings.findUnique({ where: { id: 1 } }));
}

// Moves a REQUEST to another status only if it is still a REQUEST — two tabs, or Areli on the
// phone and the laptop, can't both confirm/decline it.
async function transitionRequest(tx, id, data) {
  const { count } = await tx.booking.updateMany({ where: { id, status: 'REQUEST' }, data });
  if (count === 0) {
    const current = await tx.booking.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new HttpError(404, 'Booking not found');
    throw new HttpError(409, `This booking is already ${current.status.toLowerCase().replace('_', ' ')}`);
  }
  return tx.booking.findUnique({ where: { id } });
}

// A unique phone/email already used by a different client → 409 with who owns it (§4.4).
async function assertFreeForClient(tx, clientId, { email, phoneE164 }) {
  if (email) {
    const owner = await tx.client.findUnique({ where: { email }, select: { id: true, displayName: true } });
    if (owner && owner.id !== clientId) throw new HttpError(409, `This email belongs to ${owner.displayName}`);
  }
  if (phoneE164) {
    const owner = await tx.client.findUnique({ where: { phoneE164 }, select: { id: true, displayName: true } });
    if (owner && owner.id !== clientId) throw new HttpError(409, `This phone belongs to ${owner.displayName}`);
  }
}

// What booking-derive needs on top of the Booking columns. Only open rebook reminders.
const DERIVE_INCLUDE = {
  payments: { select: { kind: true, method: true, amountCents: true, receivedAt: true } },
  gallery: { select: { id: true, status: true, deliveredAt: true, expiresAt: true } },
  rebookReminders: { where: { doneAt: null }, select: { id: true } },
};

const ROW_INCLUDE = { ...LIST_INCLUDE, ...DERIVE_INCLUDE };

const SESSION_FORMAT = "ccc LLL d 'at' h:mm a"; // "Sat Oct 12 at 5:15 PM" (Phoenix)
const sessionLabel = (value) => toStudio(value).toFormat(SESSION_FORMAT);
const statusWord = (status) => status.toLowerCase().replace('_', ' ');

const METHOD_LABEL = { ZELLE: 'Zelle', CASH_APP: 'Cash App', CASH: 'Cash' };
const CANCEL_LABEL = {
  CLIENT_REQUEST: 'client asked to cancel',
  WEATHER: 'weather',
  PHOTOGRAPHER_UNAVAILABLE: 'Areli unavailable',
  NO_DEPOSIT: 'no deposit received',
  NO_SHOW: 'no-show',
};
export const REBOOK_LABEL = {
  SIX_MONTHS_FAMILY: 'In 6 months · family update',
  ONE_YEAR_ANNIVERSARY_BIRTHDAY: 'In 1 year · anniversary or birthday',
  NEXT_SPRING_GRADUATION: 'Next spring · graduation season',
  NEWBORN: 'When baby arrives · newborn session',
  CUSTOM: 'Custom reminder',
};

// A list row: Booking columns + client/extras/gallery + derived, without the raw inputs
// (payments, reminder ids) that only feed `derived`.
function toRow(booking, ctx, conflicts) {
  const { payments, rebookReminders, ...row } = booking;
  return { ...row, derived: deriveBooking(booking, ctx, { sameDayConflict: conflicts?.get(booking.id) ?? null }) };
}

// For each REQUEST: another active booking on the same Phoenix day (the "Date overlap" flag),
// found with one query for the whole page.
async function sameDayConflicts(bookings, db = prisma) {
  const result = new Map();
  const requests = bookings.filter((b) => b.status === 'REQUEST');
  if (requests.length === 0) return result;
  const ranges = new Map();
  for (const b of requests) {
    const day = toStudio(b.startsAt).startOf('day');
    ranges.set(day.toISODate(), { gte: day.toJSDate(), lte: day.endOf('day').toJSDate() });
  }
  const others = await db.booking.findMany({
    where: { status: { in: ACTIVE_STATUSES }, OR: [...ranges.values()].map((startsAt) => ({ startsAt })) },
    select: { id: true, code: true, startsAt: true, client: { select: { displayName: true } } },
    orderBy: { startsAt: 'asc' },
  });
  const byDay = new Map();
  for (const o of others) {
    const key = studioDayKey(o.startsAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(o);
  }
  for (const r of requests) {
    const hit = byDay.get(studioDayKey(r.startsAt))?.find((o) => o.id !== r.id);
    result.set(r.id, hit ? { id: hit.id, code: hit.code, clientName: hit.client.displayName, startsAt: hit.startsAt } : null);
  }
  return result;
}

// Bookings of the given statuses by the studio day of their session, for one "YYYY-MM" month.
async function calendarFor(month, statuses, extraSelect = {}) {
  const range = studioMonthRange(month);
  if (!range) throw new HttpError(400, 'month must look like 2026-10');
  const bookings = await prisma.booking.findMany({
    where: { status: { in: statuses }, startsAt: { gte: range.start, lte: range.end } },
    select: {
      id: true,
      code: true,
      startsAt: true,
      serviceNameSnapshot: true,
      ...extraSelect,
      client: { select: { firstName: true, displayName: true } },
    },
    orderBy: { startsAt: 'asc' },
  });
  const byDay = new Map();
  for (const booking of bookings) {
    const key = studioDayKey(booking.startsAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(booking);
  }
  return { days: [...byDay].map(([date, items]) => ({ date, items })) };
}

const CHANGED_MEANWHILE = 'This booking changed in the meantime — reload and try again';

/**
 * Conditional state change: updates the booking only while it still matches `where`
 * (two tabs, or phone + laptop, can't both act on the same state). The UPDATE also takes the
 * InnoDB row lock, so payments read after it in the same transaction can't change under us.
 * `conflict` is the 409 message, or a function of the current row that returns it.
 */
async function guardedUpdate(tx, id, where, data, conflict = CHANGED_MEANWHILE) {
  const { count } = await tx.booking.updateMany({ where: { id, ...where }, data });
  if (count > 0) return;
  const current = await tx.booking.findUnique({
    where: { id },
    select: { status: true, startsAt: true, archivedAt: true, reviewStatus: true },
  });
  if (!current) throw new HttpError(404, 'Booking not found');
  throw new HttpError(409, typeof conflict === 'function' ? conflict(current) : conflict);
}

const logEvent = (tx, booking, actorId, type, message, metadata) =>
  tx.activityEvent.create({
    data: { type, actorType: 'ADMIN', actorId, bookingId: booking.id, clientId: booking.clientId, message, metadata },
  });

async function findForAction(tx, id) {
  const booking = await tx.booking.findUnique({ where: { id }, include: DERIVE_INCLUDE });
  if (!booking) throw new HttpError(404, 'Booking not found');
  return booking;
}

// Default "around" date for a rebook reminder, from the session's studio day.
export function defaultRebookDay(kind, startsAt) {
  const session = toStudio(startsAt).startOf('day');
  if (kind === 'SIX_MONTHS_FAMILY') return session.plus({ months: 6 });
  if (kind === 'ONE_YEAR_ANNIVERSARY_BIRTHDAY') return session.plus({ years: 1 });
  // NEXT_SPRING_GRADUATION: the first March 1 after the session.
  const march = DateTime.fromObject({ year: session.year, month: 3, day: 1 }, { zone: STUDIO_ZONE });
  return march > session ? march : march.plus({ years: 1 });
}

class BookingModel {
  static async listRequests({ q, serviceId, from, to, page = 1, pageSize = 25 } = {}) {
    const take = Math.min(Math.max(Number(pageSize) || 25, 1), MAX_PAGE_SIZE);
    const currentPage = Math.max(Number(page) || 1, 1);
    const where = {
      status: 'REQUEST',
      ...searchClause(q),
      ...(serviceId ? { serviceId } : {}),
      ...(from || to ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {}),
    };
    const [items, total, summary] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], // oldest first — Areli answers them in order
        skip: (currentPage - 1) * take,
        take,
      }),
      prisma.booking.count({ where }),
      this.requestSummary(),
    ]);
    return { items, total, page: currentPage, pageSize: take, summary };
  }

  // The four numbers above the Requests table.
  static async requestSummary() {
    const startOfToday = nowInStudio().startOf('day').toJSDate();
    const [total, today, awaitingReply, returning] = await Promise.all([
      prisma.booking.count({ where: { status: 'REQUEST' } }),
      prisma.booking.count({ where: { status: 'REQUEST', createdAt: { gte: startOfToday } } }),
      // Nobody has written to the client yet: no email sent for this booking and nothing done
      // by Areli in its history.
      prisma.booking.count({
        where: {
          status: 'REQUEST',
          emails: { none: {} },
          events: { none: { actorType: 'ADMIN' } },
        },
      }),
      prisma.booking.count({ where: { status: 'REQUEST', clientMatchedBy: { not: 'NEW' } } }),
    ]);
    return { total, today, awaitingReply, returning };
  }

  // Requests by the studio day of their session, for one "YYYY-MM" month.
  static async listRequestsCalendar(month) {
    return calendarFor(month, ['REQUEST']);
  }

  // Everything holding a date (requests are drawn dotted by the admin), with its status.
  static async listCalendar(month) {
    return calendarFor(month, ['REQUEST', ...ACTIVE_STATUSES], { status: true });
  }

  static async deriveContext(db = prisma) {
    return deriveContext(await studioSettings(db));
  }

  // GET /?tab= — one tab of the Bookings table, filtered in the query.
  static async listBookings({ tab, q, serviceId, page = 1, pageSize = 25, sort, dir = 'asc' }) {
    const take = Math.min(Math.max(Number(pageSize) || 25, 1), MAX_PAGE_SIZE);
    const currentPage = Math.max(Number(page) || 1, 1);
    const ctx = await this.deriveContext();
    const where = { ...tabWhere(tab, ctx.pastCutoff), ...searchClause(q), ...(serviceId ? { serviceId } : {}) };
    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: ROW_INCLUDE,
        orderBy: sort ? sortOrderBy(sort, dir) : tabOrderBy(tab),
        skip: (currentPage - 1) * take,
        take,
      }),
      prisma.booking.count({ where }),
    ]);
    const conflicts = await sameDayConflicts(items);
    return { items: items.map((b) => toRow(b, ctx, conflicts)), total, page: currentPage, pageSize: take };
  }

  // GET /summary — the numbers above the table and the count on each tab.
  static async summary() {
    const ctx = await this.deriveContext();
    const sot = ctx.startOfToday;
    const cut = ctx.pastCutoff;
    const [counts, sessionsThisWeek, active, followups] = await Promise.all([
      Promise.all(TABS.map((tab) => prisma.booking.count({ where: tabWhere(tab, cut) }))),
      prisma.booking.count({
        where: {
          status: { in: ACTIVE_STATUSES },
          startsAt: { gte: sot.toJSDate(), lte: sot.plus({ days: 6 }).endOf('day').toJSDate() },
        },
      }),
      prisma.booking.findMany({
        where: { status: { in: ACTIVE_STATUSES } },
        select: {
          startsAt: true,
          totalCents: true,
          depositCents: true,
          payments: { select: { kind: true, amountCents: true } },
        },
      }),
      prisma.booking.findMany({ where: tabWhere('followup', cut), include: DERIVE_INCLUDE }),
    ]);
    const byTab = Object.fromEntries(TABS.map((tab, i) => [tab, counts[i]]));
    return {
      requests: byTab.requests,
      sessionsThisWeek,
      paymentsPendingCents: active.reduce((sum, b) => sum + pendingCents(b, ctx), 0),
      followupsDue: followups.filter((b) => ['alert', 'pending'].includes(deriveBooking(b, ctx).nextStep?.tone)).length,
      counts: byTab,
    };
  }

  static async getDetail(id) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: CLIENT_SUMMARY,
        service: { select: { id: true, name: true, slug: true } },
        package: { select: { id: true, name: true } },
        extras: { select: { extraId: true, nameSnapshot: true, priceCentsSnapshot: true, quantity: true } },
        payments: { orderBy: { receivedAt: 'asc' } },
        events: { orderBy: { createdAt: 'desc' }, take: 50 },
        gallery: { select: { id: true, slug: true, title: true, status: true, deliveredAt: true, expiresAt: true } },
        rebookReminders: { where: { doneAt: null }, orderBy: { dueOn: 'asc' } },
      },
    });
    if (!booking) return null;

    // "Keep" (or "Update client") answers the "Details changed" question for this booking.
    const answered = booking.events.some((e) => e.type === 'booking.details_kept' || e.type === 'client.updated');
    const changes = answered ? [] : detailChanges(booking);

    // CONFLICT: the phone typed on /book belongs to another client — show who.
    let conflictWith = null;
    const phoneE164 = toE164(booking.contactPhone);
    if (booking.clientMatchedBy === 'CONFLICT' && phoneE164) {
      conflictWith = await prisma.client.findFirst({
        where: { phoneE164, id: { not: booking.clientId } },
        ...CLIENT_SUMMARY,
      });
    }

    const [ctx, conflicts] = await Promise.all([this.deriveContext(), sameDayConflicts([booking])]);
    const derived = deriveBooking(booking, ctx, { sameDayConflict: conflicts.get(booking.id) ?? null });
    return { booking: { ...booking, detailChanges: changes, derived }, conflictWith };
  }

  static async confirm(id, { note } = {}, actorId = null) {
    return prisma.$transaction(async (tx) => {
      const { depositDueHours } = await studioSettings(tx);
      const now = DateTime.utc();
      const dueAt = now.plus({ hours: depositDueHours });
      const booking = await transitionRequest(tx, id, {
        status: 'AWAITING_DEPOSIT',
        confirmedAt: now.toJSDate(),
        depositDueAt: dueAt.toJSDate(),
      });
      const dueLabel = dueAt.setZone(STUDIO_ZONE).toFormat("ccc LLL d 'at' h:mm a");
      await tx.activityEvent.create({
        data: {
          type: 'booking.confirmed',
          actorType: 'ADMIN',
          actorId,
          bookingId: booking.id,
          clientId: booking.clientId,
          message: `Request accepted — deposit due ${dueLabel}`,
          metadata: note ? { note } : undefined,
        },
      });
      return booking;
    });
  }

  static async decline(id, reason, actorId = null) {
    return prisma.$transaction(async (tx) => {
      const booking = await transitionRequest(tx, id, { status: 'DECLINED', declinedAt: DateTime.utc().toJSDate() });
      await tx.activityEvent.create({
        data: {
          type: 'booking.declined',
          actorType: 'ADMIN',
          actorId,
          bookingId: booking.id,
          clientId: booking.clientId,
          message: `Request declined — ${reason}`,
          metadata: { reason },
        },
      });
      return booking;
    });
  }

  // Answers from the drawer:
  //   looks_right      PHONE/CONFLICT match is the same person → matchReviewedAt
  //   not_same         PHONE match is someone else → move the booking to a new Client
  //   update_client    copy what was typed on /book onto the Client ("Details changed")
  //   keep             leave the Client as it is ("Details changed")
  static async resolveMatch(id, action, actorId = null) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id }, include: { client: { include: { user: { select: { id: true, email: true } } } } } });
      if (!booking) throw new HttpError(404, 'Booking not found');
      const now = DateTime.utc().toJSDate();
      const event = (type, message, extra = {}) =>
        tx.activityEvent.create({
          data: { type, actorType: 'ADMIN', actorId, bookingId: booking.id, clientId: booking.clientId, message, ...extra },
        });

      if (action === 'looks_right') {
        if (!REVIEWABLE_MATCHES.includes(booking.clientMatchedBy)) {
          throw new HttpError(409, 'This booking has no client match to review');
        }
        await event('booking.match_reviewed', `Client match checked — same person as ${booking.client.displayName}`);
        return tx.booking.update({ where: { id }, data: { matchReviewedAt: now } });
      }

      if (action === 'not_same') {
        // CONFLICT is linked by email, which is the login and is unique: that client can't be
        // swapped for a new one with the same email.
        if (booking.clientMatchedBy !== 'PHONE') {
          throw new HttpError(409, 'Only a phone match can be moved to a new client');
        }
        const email = booking.contactEmail?.trim().toLowerCase();
        if (!email) throw new HttpError(400, 'This request has no email to create a client with');
        await assertFreeForClient(tx, null, { email });
        // The phone stays as typed but not as phoneE164: it is unique and belongs to the
        // client it matched.
        const fresh = await tx.client.create({
          data: {
            displayName: fullName(booking.contactFirstName, booking.contactLastName) || email,
            firstName: booking.contactFirstName,
            lastName: booking.contactLastName,
            email,
            phone: booking.contactPhone,
          },
        });
        await tx.activityEvent.create({
          data: {
            type: 'client.created',
            actorType: 'ADMIN',
            actorId,
            clientId: fresh.id,
            bookingId: booking.id,
            message: `Client created from ${booking.code} — not the same person as ${booking.client.displayName}`,
          },
        });
        return tx.booking.update({
          where: { id },
          data: { clientId: fresh.id, clientMatchedBy: 'NEW', matchReviewedAt: now },
        });
      }

      if (action === 'update_client') {
        const changes = detailChanges(booking);
        if (changes.length === 0) throw new HttpError(409, 'Nothing to update — the client already has these details');
        const data = {};
        for (const change of changes) {
          if (change.field === 'email') data.email = booking.contactEmail.trim().toLowerCase();
          if (change.field === 'phone') {
            data.phone = booking.contactPhone;
            data.phoneE164 = toE164(booking.contactPhone);
          }
          if (change.field === 'name') {
            data.firstName = booking.contactFirstName?.trim() || null;
            data.lastName = booking.contactLastName?.trim() || null;
            data.displayName = fullName(data.firstName, data.lastName);
          }
        }
        await assertFreeForClient(tx, booking.clientId, data);
        // The email is also the client's login: move it too, or they keep signing in with the old one.
        if (data.email) await syncLoginEmail(tx, booking.client.user, data.email);
        await tx.client.update({ where: { id: booking.clientId }, data });
        const summary = changes.map((c) => `${c.field} ${c.from ?? '—'} → ${c.to}`).join(', ');
        await event('client.updated', `Client updated from ${booking.code}: ${summary}`, {
          metadata: { changes },
        });
        return tx.booking.findUnique({ where: { id } });
      }

      if (action === 'keep') {
        await event('booking.details_kept', 'Kept the client details — the request had different ones');
        return booking;
      }

      throw new HttpError(400, 'Invalid match action');
    });
  }
  // ─── Bookings actions (docs/api-bookings.md §3) ─────────────────────────
  // Each runs in one transaction with its ActivityEvent and returns the booking as GET /:id
  // shows it (with `derived`), read after the commit.

  static async detailBooking(id) {
    return (await BookingModel.getDetail(id)).booking;
  }

  static async recordPayment(id, { kind, method, amountCents, note, allowOverpay = false }, actorId) {
    await prisma.$transaction(async (tx) => {
      const now = DateTime.utc().toJSDate();
      // Touch the row first: it locks it, so two payments can't both pass the total check.
      await guardedUpdate(tx, id, { status: { in: ACTIVE_STATUSES } }, { updatedAt: now }, (c) =>
        `Payments can only be recorded on active bookings — this one is ${statusWord(c.status)}`);
      const booking = await findForAction(tx, id);
      const paid = paidCents(booking.payments);
      const left = booking.totalCents - paid;
      // More than the balance is only accepted when the admin confirmed it (allowOverpay): a tip,
      // an extra person… Without the flag it is still a 400, so a typo never slips through.
      const overCents = Math.max(0, amountCents - Math.max(0, left));
      if (overCents > 0 && !allowOverpay) {
        throw new HttpError(400, left <= 0
          ? 'This booking is already paid in full'
          : `That's more than the ${formatCents(left)} left to pay`);
      }
      const payment = await tx.payment.create({
        data: { bookingId: id, kind, method, amountCents, note: note || null, receivedAt: now, recordedById: actorId },
      });
      const confirms = booking.status === 'AWAITING_DEPOSIT' && paid + amountCents >= booking.depositCents;
      if (confirms) await guardedUpdate(tx, id, { status: 'AWAITING_DEPOSIT' }, { status: 'CONFIRMED' });
      const what = kind === 'DEPOSIT' ? 'deposit' : 'balance';
      await logEvent(
        tx, booking, actorId, 'payment.recorded',
        `${formatCents(amountCents)} ${what} received · ${METHOD_LABEL[method]}${overCents ? ` · ${formatCents(overCents)} over the balance (confirmed by admin)` : ''}${confirms ? ' — booking confirmed' : ''}`,
        { paymentId: payment.id, kind, method, amountCents, note: note || undefined, confirmed: confirms, overCents: overCents || undefined },
      );
    });
    return this.detailBooking(id);
  }

  static async reschedule(id, startsAt /* Luxon DateTime */, actorId) {
    await prisma.$transaction(async (tx) => {
      const settings = await studioSettings(tx);
      const ctx = deriveContext(settings);
      const booking = await findForAction(tx, id);
      if (!ACTIVE_STATUSES.includes(booking.status)) {
        throw new HttpError(409, `Only active bookings can be rescheduled — this one is ${statusWord(booking.status)}`);
      }
      if (isPastSession(booking, ctx)) throw new HttpError(409, 'This session already happened');
      // No limit on reschedules (decided 2026-10-05); rescheduleCount only keeps the tally.
      const next = startsAt.toUTC();
      if (+next === +toStudio(booking.startsAt)) throw new HttpError(400, 'That is already the session date');
      await guardedUpdate(
        tx, id,
        { status: { in: ACTIVE_STATUSES }, startsAt: booking.startsAt, rescheduleCount: booking.rescheduleCount },
        { startsAt: next.toJSDate(), rescheduleCount: { increment: 1 } },
      );
      await logEvent(
        tx, booking, actorId, 'booking.rescheduled',
        `Rescheduled from ${sessionLabel(booking.startsAt)} to ${sessionLabel(next)}`,
        { from: toStudio(booking.startsAt).toUTC().toISO(), to: next.toISO(), rescheduleCount: booking.rescheduleCount + 1 },
      );
    });
    return this.detailBooking(id);
  }

  static async cancel(id, { reason, deposit }, actorId) {
    await prisma.$transaction(async (tx) => {
      const now = DateTime.utc().toJSDate();
      await guardedUpdate(
        tx, id,
        { status: { in: ACTIVE_STATUSES } },
        { status: 'CANCELLED', cancelledAt: now, cancelReason: reason },
        (c) => `Only active bookings can be cancelled — this one is ${statusWord(c.status)}`,
      );
      const booking = await findForAction(tx, id);
      const paid = paidCents(booking.payments);
      const refund = deposit === 'refund' && paid > 0;
      if (refund) {
        // The deposit goes back the way it came; Cash if nothing else is known.
        const last = [...booking.payments].reverse().find((p) => p.kind !== 'REFUND');
        await tx.payment.create({
          data: {
            bookingId: id,
            kind: 'REFUND',
            method: last?.method ?? 'CASH',
            amountCents: paid,
            receivedAt: now,
            note: 'Refunded on cancellation',
            recordedById: actorId,
          },
        });
      }
      await tx.booking.update({ where: { id }, data: { depositRefunded: paid > 0 ? refund : null } });
      const money = paid === 0 ? '' : refund ? ` · ${formatCents(paid)} refunded` : ` · ${formatCents(paid)} deposit kept`;
      await logEvent(
        tx, booking, actorId, 'booking.cancelled',
        `Booking cancelled — ${CANCEL_LABEL[reason]}${money}`,
        { reason, deposit, paidCents: paid, refundedCents: refund ? paid : 0 },
      );
    });
    return this.detailBooking(id);
  }

  static async expire(id, actorId) {
    await prisma.$transaction(async (tx) => {
      await guardedUpdate(
        tx, id,
        { status: 'AWAITING_DEPOSIT' },
        { status: 'EXPIRED', expiredAt: DateTime.utc().toJSDate() },
        (c) => `Only bookings awaiting a deposit can expire — this one is ${statusWord(c.status)}`,
      );
      const booking = await findForAction(tx, id);
      // Throwing here rolls the status change back.
      if (paidCents(booking.payments) >= booking.depositCents) {
        throw new HttpError(409, 'The deposit is already covered — this booking can’t expire');
      }
      await logEvent(tx, booking, actorId, 'booking.expired', 'Marked as expired — no deposit received', {
        depositDueAt: booking.depositDueAt ? toStudio(booking.depositDueAt).toUTC().toISO() : null,
      });
    });
    return this.detailBooking(id);
  }

  static async reopen(id, actorId) {
    await prisma.$transaction(async (tx) => {
      const { depositDueHours } = await studioSettings(tx);
      const now = DateTime.utc();
      const booking = await findForAction(tx, id);
      if (booking.status !== 'EXPIRED') {
        throw new HttpError(409, `Only expired bookings can be reopened — this one is ${statusWord(booking.status)}`);
      }
      if (toStudio(booking.startsAt) <= now) throw new HttpError(409, 'The session date has passed — create a new booking instead');
      const dueAt = now.plus({ hours: depositDueHours });
      await guardedUpdate(
        tx, id,
        { status: 'EXPIRED', startsAt: { gt: now.toJSDate() } },
        { status: 'AWAITING_DEPOSIT', expiredAt: null, depositDueAt: dueAt.toJSDate() },
      );
      await logEvent(tx, booking, actorId, 'booking.reopened', `Booking reopened — deposit due ${sessionLabel(dueAt)}`, {
        depositDueAt: dueAt.toISO(),
      });
    });
    return this.detailBooking(id);
  }

  static async archive(id, actorId) {
    await prisma.$transaction(async (tx) => {
      const ctx = deriveContext(await studioSettings(tx));
      const blocker = archiveBlocker(await findForAction(tx, id), ctx);
      if (blocker) throw new HttpError(409, blocker);
      await guardedUpdate(
        tx, id,
        {
          status: { in: ACTIVE_STATUSES },
          startsAt: { lt: ctx.pastCutoff.toJSDate() },
          archivedAt: null,
          gallery: { is: { status: 'DELIVERED' } },
        },
        { archivedAt: DateTime.utc().toJSDate() },
      );
      // Re-check the balance under the row lock (a refund could have landed in between).
      const booking = await findForAction(tx, id);
      const again = archiveBlocker({ ...booking, archivedAt: null }, ctx);
      if (again) throw new HttpError(409, again);
      await logEvent(tx, booking, actorId, 'booking.archived', 'Archived — all done');
    });
    return this.detailBooking(id);
  }

  static async unarchive(id, actorId) {
    await prisma.$transaction(async (tx) => {
      const { pastCutoff } = await this.deriveContext(tx);
      await guardedUpdate(
        tx, id,
        { status: { in: ACTIVE_STATUSES }, startsAt: { lt: pastCutoff.toJSDate() }, archivedAt: { not: null } },
        { archivedAt: null },
        'Only bookings in Done can be moved back to follow-up',
      );
      const booking = await findForAction(tx, id);
      await logEvent(tx, booking, actorId, 'booking.unarchived', 'Moved back to follow-up');
    });
    return this.detailBooking(id);
  }

  static async markReviewReceived(id, actorId) {
    await prisma.$transaction(async (tx) => {
      const { pastCutoff } = await this.deriveContext(tx);
      await guardedUpdate(
        tx, id,
        { status: { in: ACTIVE_STATUSES }, startsAt: { lt: pastCutoff.toJSDate() }, reviewStatus: { not: 'RECEIVED' } },
        { reviewStatus: 'RECEIVED', reviewReceivedAt: DateTime.utc().toJSDate() },
        (c) => (c.reviewStatus === 'RECEIVED'
          ? 'The review is already marked as received'
          : 'Reviews can only be marked on past sessions'),
      );
      const booking = await findForAction(tx, id);
      await logEvent(tx, booking, actorId, 'followup.review_received', 'Review received');
    });
    return this.detailBooking(id);
  }

  // kind = null closes the open reminders; otherwise the new one replaces them, so a booking
  // has at most one open reminder.
  static async setRebookReminder(id, { kind, dueOn, label }, actorId) {
    await prisma.$transaction(async (tx) => {
      const now = DateTime.utc().toJSDate();
      await guardedUpdate(tx, id, {}, { updatedAt: now }); // row lock: one reminder at a time
      const booking = await findForAction(tx, id);
      const { count: closed } = await tx.rebookReminder.updateMany({
        where: { bookingId: id, doneAt: null },
        data: { doneAt: now },
      });
      if (kind === null) {
        if (closed === 0) throw new HttpError(409, 'There is no open rebook reminder to clear');
        await logEvent(tx, booking, actorId, 'followup.rebook_set', 'Rebook reminder cleared', { kind: null, closed });
        return;
      }
      const day = dueOn ? DateTime.fromISO(dueOn, { zone: STUDIO_ZONE }) : defaultRebookDay(kind, booking.startsAt);
      const text = label || REBOOK_LABEL[kind];
      const reminder = await tx.rebookReminder.create({
        data: {
          clientId: booking.clientId,
          bookingId: id,
          kind,
          label: text,
          // @db.Date: the calendar day, stored as UTC midnight.
          dueOn: DateTime.fromISO(day.toISODate(), { zone: 'utc' }).toJSDate(),
        },
      });
      await logEvent(
        tx, booking, actorId, 'followup.rebook_set',
        `Rebook reminder set — ${text}, around ${day.toFormat('LLL d, yyyy')}`,
        { reminderId: reminder.id, kind, dueOn: day.toISODate(), label: text, closed },
      );
    });
    return this.detailBooking(id);
  }
}

export default BookingModel;
