// Manual booking from the admin ("New booking"): one transaction that finds or creates the
// client, freezes prices from the catalog, creates the booking, its extras, the optional
// deposit / full payment, and the ActivityEvent. Rules: docs/nuevo-booking-admin.md.
import { DateTime } from 'luxon';
import prisma from '../config/db.js';
import { STUDIO_ZONE } from '../utils/date.js';
import { toE164 } from '../utils/phone.js';
import { HttpError } from '../utils/http.js';
import { formatCents, withSettingsFallback } from '../services/booking-derive.js';
import BookingModel from './booking.model.js';

const clean = (v) => (typeof v === 'string' ? v.trim() : v);
const orNull = (v) => (v === undefined || v === null || clean(v) === '' ? null : clean(v));

// "a***@gmail.com": enough for the studio to recognise the address without printing it in full.
const maskEmail = (email) => {
  const [user, domain] = email.split('@');
  return `${user[0]}${'*'.repeat(Math.max(user.length - 1, 2))}@${domain}`;
};
// The phone is already registered under a different email than the one typed.
const phoneOtherEmailMessage = (owner) =>
  `This phone number is already registered with another email (${maskEmail(owner.email)}). Please try again with that email. ` +
  `If you'd like to change it, contact the business and ask them to update the email.`;
const METHOD_LABEL = { ZELLE: 'Zelle', CASH_APP: 'Cash App', CASH: 'Cash' };
const CLIENT_CARD = { id: true, displayName: true, firstName: true, lastName: true, email: true, phone: true, phoneE164: true, instagram: true, heardFrom: true, privateNotes: true };

class BookingCreateModel {
  // Everything the form needs in one call: live services with visible packages, active extras
  // (and which services they belong to) and the studio numbers that drive the price preview.
  static async catalog() {
    const [services, extras, settingsRow] = await Promise.all([
      prisma.service.findMany({
        where: { status: 'LIVE' },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          packages: {
            where: { hidden: false },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            select: { id: true, name: true, priceCents: true, durationMinutes: true, customDescription: true, isFeatured: true },
          },
        },
      }),
      prisma.extra.findMany({
        where: { active: true },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, priceCents: true, minutes: true, services: { select: { serviceId: true } } },
      }),
      prisma.studioSettings.findUnique({ where: { id: 1 } }),
    ]);
    const s = withSettingsFallback(settingsRow);
    return {
      services,
      extras: extras.map(({ services: on, ...e }) => ({ ...e, serviceIds: on.map((x) => x.serviceId) })),
      settings: {
        depositPercent: s.depositPercent,
        depositDueHours: s.depositDueHours,
        freeTravelMiles: s.freeTravelMiles,
        travelFeePerMileCents: s.travelFeePerMileCents,
        policyVersion: s.bookingPolicyVersion,
      },
    };
  }

  // Typeahead: name, email or phone (any format).
  static async searchClients(q) {
    const term = clean(q);
    if (!term) return [];
    const e164 = toE164(term);
    return prisma.client.findMany({
      where: {
        deletedAt: null, // hidden (soft-deleted) clients don't show up when picking one
        OR: [
          { displayName: { contains: term } },
          { firstName: { contains: term } },
          { lastName: { contains: term } },
          { email: { contains: term } },
          { phone: { contains: term } },
          ...(e164 ? [{ phoneE164: e164 }] : []),
        ],
      },
      select: CLIENT_CARD,
      orderBy: { displayName: 'asc' },
      take: 8,
    });
  }

  // While typing the email/phone of a "new" client: is it someone we already have?
  static async lookupClient({ email, phone }) {
    const mail = clean(email)?.toLowerCase();
    const e164 = toE164(phone);
    const [byEmail, byPhone] = await Promise.all([
      mail ? prisma.client.findUnique({ where: { email: mail }, select: CLIENT_CARD }) : null,
      e164 ? prisma.client.findUnique({ where: { phoneE164: e164 }, select: CLIENT_CARD }) : null,
    ]);
    const conflict = !!(byEmail && byPhone && byEmail.id !== byPhone.id);
    // Phone known, email typed is a different one: don't load that client (it would replace
    // the typed email) — say so instead.
    const phoneOtherEmail = !!(mail && byPhone && !byEmail);
    return {
      client: conflict || phoneOtherEmail ? null : byEmail ?? byPhone ?? null,
      matchedBy: conflict ? 'CONFLICT' : phoneOtherEmail ? 'PHONE_OTHER_EMAIL' : byEmail && byPhone ? 'BOTH' : byEmail ? 'EMAIL' : byPhone ? 'PHONE' : null,
      conflict: conflict ? { byEmail, byPhone } : null,
      message: phoneOtherEmail ? phoneOtherEmailMessage(byPhone) : null,
    };
  }

  static async create(input, actorId) {
    const startsAt = DateTime.fromISO(input.startsAt, { zone: STUDIO_ZONE });
    if (!startsAt.isValid) throw new HttpError(400, 'Choose a valid date and time');
    if (startsAt.toMillis() <= Date.now()) throw new HttpError(400, 'The session has to be in the future');

    const id = await prisma.$transaction(async (tx) => {
      const settings = withSettingsFallback(await tx.studioSettings.findUnique({ where: { id: 1 } }));

      // --- Catalog (prices come from here, never from the request) ---
      const service = await tx.service.findUnique({ where: { id: input.serviceId } });
      if (!service) throw new HttpError(400, 'That service does not exist');
      const pkg = await tx.package.findUnique({ where: { id: input.packageId } });
      if (!pkg || pkg.serviceId !== service.id) throw new HttpError(400, 'That package does not belong to the service');

      const wanted = new Map();
      for (const e of input.extras ?? []) wanted.set(e.extraId, (wanted.get(e.extraId) ?? 0) + e.quantity);
      const extras = wanted.size
        ? await tx.extra.findMany({ where: { id: { in: [...wanted.keys()] }, active: true }, include: { services: true } })
        : [];
      if (extras.length !== wanted.size) throw new HttpError(400, 'One of the extras is not available');
      for (const e of extras) {
        if (!e.services.some((s) => s.serviceId === service.id)) {
          throw new HttpError(400, `"${e.name}" is not offered for ${service.name}`);
        }
      }
      const extrasCents = extras.reduce((sum, e) => sum + e.priceCents * wanted.get(e.id), 0);
      // "Every 30 mins. added is +$50": add-ons with minutes lengthen the session.
      const durationMinutes = pkg.durationMinutes + extras.reduce((sum, e) => sum + e.minutes * wanted.get(e.id), 0);
      const totalCents = pkg.priceCents + extrasCents + (input.travelFeeCents ?? 0) + (input.adjustmentCents ?? 0);
      if (totalCents < 0) throw new HttpError(400, 'The adjustment is larger than the total');
      const depositCents = Math.round((totalCents * settings.depositPercent) / 100);

      // --- Client: reuse (and update) or create ---
      const { client, matchedBy } = await this.resolveClient(tx, input, actorId);

      // --- Booking ---
      const now = DateTime.utc();
      const pay = input.payment ?? { mode: 'NONE' };
      const payments = [];
      if (pay.mode !== 'NONE' && totalCents > 0) {
        payments.push({ kind: 'DEPOSIT', amountCents: depositCents });
        if (pay.mode === 'FULL' && totalCents - depositCents > 0) {
          payments.push({ kind: 'BALANCE', amountCents: totalCents - depositCents });
        }
      }
      const paid = payments.reduce((s, p) => s + p.amountCents, 0);
      const confirmed = payments.length > 0 && paid >= depositCents;

      const booking = await tx.booking.create({
        data: {
          code: `TMP-${crypto.randomUUID()}`, // replaced below with PBA-<id>
          clientId: client.id,
          source: 'MANUAL',
          status: confirmed ? 'CONFIRMED' : 'AWAITING_DEPOSIT',
          serviceId: service.id,
          packageId: pkg.id,
          serviceNameSnapshot: service.name,
          packageNameSnapshot: pkg.name,
          packagePriceCents: pkg.priceCents,
          durationMinutes,
          startsAt: startsAt.toUTC().toJSDate(),
          locationKind: input.locationKind,
          locationName: clean(input.locationName),
          locationAddress: orNull(input.locationAddress),
          travelFeeCents: input.travelFeeCents ?? 0,
          adjustmentCents: input.adjustmentCents ?? 0,
          totalCents,
          depositCents,
          contactFirstName: client.firstName,
          contactLastName: client.lastName,
          contactEmail: client.email,
          contactPhone: client.phone,
          clientMatchedBy: matchedBy,
          matchReviewedAt: matchedBy === 'NEW' ? null : now.toJSDate(), // the admin chose this client
          partySize: input.partySize ?? null,
          schoolAndColors: orNull(input.schoolAndColors),
          clientNotes: orNull(input.clientNotes),
          privateNotes: orNull(input.privateNotes),
          inspo: orNull(input.inspo),
          photosNeededBy: input.photosNeededBy ? DateTime.fromISO(input.photosNeededBy, { zone: 'utc' }).toJSDate() : null,
          sharePermission: input.sharePermission ?? null,
          doNotPostNotes: orNull(input.doNotPostNotes),
          minorConsentAt: input.minorConsent ? now.toJSDate() : null,
          policyAcceptedAt: now.toJSDate(),
          confirmedAt: now.toJSDate(),
          depositDueAt: now.plus({ hours: settings.depositDueHours }).toJSDate(),
          extras: {
            create: extras.map((e) => ({
              extraId: e.id,
              nameSnapshot: e.name,
              priceCentsSnapshot: e.priceCents,
              quantity: wanted.get(e.id),
            })),
          },
        },
      });
      const code = `PBA-${String(booking.id).padStart(4, '0')}`;
      await tx.booking.update({ where: { id: booking.id }, data: { code } });

      for (const p of payments) {
        await tx.payment.create({
          data: { bookingId: booking.id, kind: p.kind, method: pay.method, amountCents: p.amountCents, receivedAt: now.toJSDate(), recordedById: actorId },
        });
      }

      const paidNote = payments.length
        ? ` · ${formatCents(paid)} ${pay.mode === 'FULL' ? 'paid in full' : 'deposit'} received (${METHOD_LABEL[pay.method]})`
        : '';
      await tx.activityEvent.create({
        data: {
          type: 'booking.created_manual',
          actorType: 'ADMIN',
          actorId,
          bookingId: booking.id,
          clientId: client.id,
          message: `Booking ${code} created by hand${paidNote}`,
          metadata: { policyVersion: settings.bookingPolicyVersion, payment: pay.mode, totalCents, depositCents },
        },
      });
      return booking.id;
    });
    return BookingModel.detailBooking(id);
  }

  // Picked client (`clientId`) → the admin chose them: non-identity fields may change from this
  // form, email and phone change from the client's own page. No `clientId` → a new client: email
  // and phone are both required, and if they match someone we already have, that match is
  // linked as it is — nothing about the existing client is overwritten by what was typed here.
  static async resolveClient(tx, input, actorId) {
    const picked = !!input.clientId;
    const editable = {};
    for (const key of ['firstName', 'lastName', 'displayName', 'instagram', 'heardFrom']) {
      if (input[key] !== undefined) editable[key] = orNull(input[key]);
    }
    if (input.clientPrivateNotes !== undefined) editable.privateNotes = orNull(input.clientPrivateNotes);

    let existing = null;
    let matchedBy = 'NEW';
    if (picked) {
      existing = await tx.client.findUnique({ where: { id: input.clientId } });
      if (!existing) throw new HttpError(404, 'Client not found');
      matchedBy = existing.phoneE164 ? 'BOTH' : 'EMAIL';
    } else {
      const email = orNull(input.email)?.toLowerCase();
      if (!email) throw new HttpError(400, 'Email is required');
      const phone = orNull(input.phone);
      if (!phone) throw new HttpError(400, 'Phone is required');
      const e164 = toE164(phone);
      if (!e164) throw new HttpError(400, 'Enter a valid US phone number');
      const [byEmail, byPhone] = await Promise.all([
        tx.client.findUnique({ where: { email } }),
        tx.client.findUnique({ where: { phoneE164: e164 } }),
      ]);
      if (byEmail && byPhone && byEmail.id !== byPhone.id) {
        throw new HttpError(409, `The email belongs to ${byEmail.displayName} and the phone to ${byPhone.displayName} — pick the right client`);
      }
      // The phone is registered, but under another email: never attach the booking to that
      // client without telling anyone.
      if (byPhone && !byEmail) {
        throw new HttpError(409, phoneOtherEmailMessage(byPhone), { code: 'PHONE_OTHER_EMAIL', clientId: byPhone.id });
      }
      existing = byEmail;
      if (existing) matchedBy = byPhone ? 'BOTH' : 'EMAIL';
    }

    if (existing) {
      const changed = picked ? Object.entries(editable).filter(([k, v]) => (existing[k] ?? null) !== v) : [];
      if (changed.length === 0) return { client: existing, matchedBy };
      const client = await tx.client.update({ where: { id: existing.id }, data: Object.fromEntries(changed) });
      await tx.activityEvent.create({
        data: {
          type: 'client.updated',
          actorType: 'ADMIN',
          actorId,
          clientId: client.id,
          message: `Client details updated from the new booking form: ${changed.map(([k]) => k).join(', ')}`,
          metadata: { fields: Object.fromEntries(changed.map(([k, v]) => [k, { from: existing[k] ?? null, to: v }])) },
        },
      });
      return { client, matchedBy };
    }

    // New client
    const email = orNull(input.email).toLowerCase();
    if (!orNull(input.firstName)) throw new HttpError(400, 'First name is required');
    const phone = orNull(input.phone);
    const phoneE164 = toE164(phone);
    const displayName = editable.displayName ?? [editable.firstName, editable.lastName].filter(Boolean).join(' ');
    const client = await tx.client.create({
      data: { ...editable, displayName, email, phone, phoneE164 },
    });
    await tx.activityEvent.create({
      data: { type: 'client.created', actorType: 'ADMIN', actorId, clientId: client.id, message: 'Client created from the new booking form' },
    });
    return { client, matchedBy: 'NEW' };
  }
}

export default BookingCreateModel;
