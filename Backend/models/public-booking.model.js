// The public /book form (docs/formulario-publico-booking.md, docs/api-public-booking.md). No session:
// anyone can call it, so this model
//   - reads only bookable catalog rows and returns no private data;
//   - prices the request from the catalog (services/booking-pricing.js), never from the body;
//   - accepts only the offered times (services/availability.js) and re-checks them under a lock;
//   - links a returning client by email / phone (database/handoff.md §4.4) and NEVER overwrites a Client.
import { DateTime } from 'luxon';
import prisma from '../config/db.js';
import { STUDIO_ZONE } from '../utils/date.js';
import { toE164 } from '../utils/phone.js';
import { HttpError } from '../utils/http.js';
import { withSettingsFallback } from '../services/booking-derive.js';
import { priceBooking } from '../services/booking-pricing.js';
import { BLOCKING_STATUSES, LOOKBACK_HOURS, bookingWindow, monthAvailability, slotProblem } from '../services/availability.js';
import { queueEmail } from '../services/email/outbox.js';
import { parseInstant } from '../validators/booking.schemas.js';

// Names the server gives to the location cards that aren't typed (BookingLocation.dc.html).
export const PUBLIC_LOCATIONS = { PRESET: 'Lost Dutchman State Park', STUDIO: 'Studio' };

const clean = (v) => (typeof v === 'string' ? v.trim() : v);
const orNull = (v) => (v === undefined || v === null || clean(v) === '' ? null : clean(v));
const fullName = (first, last) => [first, last].filter(Boolean).join(' ').trim();
const toUtc = (dt) => dt.toUTC().toJSDate();

async function settingsOf(db) {
  return withSettingsFallback(await db.studioSettings.findUnique({ where: { id: 1 } }));
}

// Slots, blocked days and blocking bookings around [from, to] (studio DateTimes).
async function calendarRows(db, from, to) {
  const [slots, blockedRows, bookings] = await Promise.all([
    db.availabilitySlot.findMany({ where: { active: true }, select: { weekday: true, startTime: true, label: true } }),
    db.blockedDate.findMany({
      // @db.Date columns come back as UTC midnight of that calendar day.
      where: { date: { gte: DateTime.fromISO(from.toISODate(), { zone: 'utc' }).toJSDate(), lte: DateTime.fromISO(to.toISODate(), { zone: 'utc' }).toJSDate() } },
      select: { date: true },
    }),
    db.booking.findMany({
      where: { status: { in: BLOCKING_STATUSES }, startsAt: { gte: toUtc(from.minus({ hours: LOOKBACK_HOURS })), lte: toUtc(to) } },
      select: { startsAt: true, durationMinutes: true },
    }),
  ]);
  const blocked = new Set(blockedRows.map((r) => DateTime.fromJSDate(r.date, { zone: 'utc' }).toISODate()));
  return { slots, blocked, bookings };
}

// Returning client (§4.4). Never updates the row it finds.
async function resolveClient(tx, input, e164) {
  const email = input.email;
  const [byEmail, byPhone] = await Promise.all([
    tx.client.findUnique({ where: { email } }),
    tx.client.findUnique({ where: { phoneE164: e164 } }),
  ]);
  if (byEmail && byPhone) return { client: byEmail, matchedBy: byEmail.id === byPhone.id ? 'BOTH' : 'CONFLICT' };
  if (byEmail) return { client: byEmail, matchedBy: 'EMAIL' };
  if (byPhone) return { client: byPhone, matchedBy: 'PHONE' };

  const client = await tx.client.create({
    data: {
      displayName: fullName(input.firstName, input.lastName),
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      phone: input.phone,
      phoneE164: e164,
      heardFrom: input.heardFrom ?? null,
      locale: input.lang,
    },
  });
  await tx.activityEvent.create({
    data: { type: 'client.created', actorType: 'SYSTEM', clientId: client.id, message: 'Client created from a website request' },
  });
  return { client, matchedBy: 'NEW' };
}

class PublicBookingModel {
  /** Bookable services (with at least one visible package), their extras and the numbers the preview needs. */
  static async catalog() {
    const [services, extras, settings] = await Promise.all([
      prisma.service.findMany({
        where: { status: 'LIVE' },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          slug: true,
          name: true,
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
      settingsOf(prisma),
    ]);
    const bookable = services.filter((s) => s.packages.length > 0);
    const ids = new Set(bookable.map((s) => s.id));
    return {
      services: bookable,
      extras: extras
        .map(({ services: on, ...e }) => ({ ...e, serviceIds: on.map((x) => x.serviceId).filter((sid) => ids.has(sid)) }))
        .filter((e) => e.serviceIds.length > 0),
      settings: {
        depositPercent: settings.depositPercent,
        replyWithinHours: settings.replyWithinHours,
        policyVersion: settings.bookingPolicyVersion,
      },
    };
  }

  /** Offered times of a month ("2026-10") for a session of `minutes`. */
  static async availability({ month, minutes }) {
    const settings = await settingsOf(prisma);
    const { earliest, latest } = bookingWindow(settings);
    const start = DateTime.fromFormat(month, 'yyyy-MM', { zone: STUDIO_ZONE }).startOf('month');
    const end = start.endOf('month');
    const range = {
      minMonth: earliest.toFormat('yyyy-MM'),
      maxMonth: latest.toFormat('yyyy-MM'),
    };
    // Outside the window there is nothing to look up.
    if (end < earliest || start > latest) return { month, ...range, days: [] };

    const { slots, blocked, bookings } = await calendarRows(prisma, start, end.plus({ minutes }));
    return { month, ...range, days: monthAvailability({ month: start, slots, blocked, bookings, minutes, earliest, latest }) };
  }

  /** Creates the REQUEST. Returns what the confirmation screen shows. */
  static async create(input) {
    if (input.website) throw new HttpError(400, 'Invalid request'); // honeypot filled → a bot

    const start = parseInstant(input.startsAt);
    if (!start) throw new HttpError(400, 'Choose a valid date and time', { code: 'SLOT_NOT_OFFERED' });
    const e164 = toE164(input.phone);
    if (!e164) throw new HttpError(400, 'Enter a valid phone number', { code: 'PHONE_INVALID' });

    const locationKind = input.locationKind;
    const locationName = PUBLIC_LOCATIONS[locationKind] ?? orNull(input.locationName);
    if (!locationName) throw new HttpError(400, 'Tell me where you’d like the session', { code: 'LOCATION_REQUIRED' });

    // A first-time client created by a parallel request (same email/phone) makes the insert fail
    // with P2002; the second attempt finds that client and links to it.
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.createOnce(input, { start, e164, locationKind, locationName });
      } catch (error) {
        if (error?.code === 'P2002' && attempt < 2) continue;
        throw error;
      }
    }
  }

  static async createOnce(input, { start, e164, locationKind, locationName }) {
    return prisma.$transaction(async (tx) => {
      // One public request at a time: two people can't take the same time in parallel. The row
      // always exists after the seed; create it if a fresh database doesn't have it yet.
      if (!(await tx.studioSettings.findUnique({ where: { id: 1 }, select: { id: true } }))) {
        await tx.studioSettings.create({ data: { id: 1 } });
      }
      await tx.$queryRaw`SELECT id FROM studio_settings WHERE id = 1 FOR UPDATE`;
      const settings = await settingsOf(tx);

      const price = await priceBooking(tx, { serviceId: input.serviceId, packageId: input.packageId, extras: input.extras }, settings, { bookableOnly: true });

      const { earliest, latest } = bookingWindow(settings);
      const { slots, blocked, bookings } = await calendarRows(tx, start.startOf('day'), start.plus({ minutes: price.durationMinutes }));
      const problem = slotProblem({ start, slots, blocked, bookings, minutes: price.durationMinutes, earliest, latest });
      if (problem === 'TAKEN') throw new HttpError(409, 'That time was just taken. Please pick another one.', { code: 'SLOT_TAKEN' });
      if (problem) throw new HttpError(400, 'That time is not available. Please pick another one.', { code: 'SLOT_NOT_OFFERED' });

      const { client, matchedBy } = await resolveClient(tx, input, e164);

      const now = DateTime.utc();
      const isGraduation = price.service.slug === 'graduation';
      const booking = await tx.booking.create({
        data: {
          code: `TMP-${crypto.randomUUID()}`, // replaced below with PBA-<id>
          clientId: client.id,
          source: 'WEBSITE',
          status: 'REQUEST',
          serviceId: price.service.id,
          packageId: price.pkg.id,
          serviceNameSnapshot: price.service.name,
          packageNameSnapshot: price.pkg.name,
          packagePriceCents: price.pkg.priceCents,
          durationMinutes: price.durationMinutes,
          startsAt: toUtc(start),
          locationKind,
          locationName,
          // Travel and location fees are added by Areli before she confirms (BookingLocation.dc.html).
          travelFeeCents: 0,
          adjustmentCents: 0,
          totalCents: price.totalCents,
          depositCents: price.depositCents,
          // Exactly as typed: if it differs from the client on file, Areli sees "Details changed".
          contactFirstName: input.firstName,
          contactLastName: input.lastName,
          contactEmail: input.email,
          contactPhone: input.phone,
          clientMatchedBy: matchedBy,
          partySize: input.partySize ?? null,
          schoolAndColors: isGraduation ? orNull(input.schoolAndColors) : null,
          clientNotes: orNull(input.clientNotes),
          inspo: orNull(input.inspo),
          photosNeededBy: orNull(input.photosNeededBy) ? DateTime.fromISO(input.photosNeededBy, { zone: 'utc' }).toJSDate() : null,
          sharePermission: input.sharePermission ?? null,
          doNotPostNotes: input.sharePermission === 'YES' ? null : orNull(input.doNotPostNotes),
          minorConsentAt: input.minorConsent ? now.toJSDate() : null,
          policyAcceptedAt: now.toJSDate(),
          extras: { create: price.extraLines },
        },
      });
      const code = `PBA-${String(booking.id).padStart(4, '0')}`;
      await tx.booking.update({ where: { id: booking.id }, data: { code } });

      const name = fullName(input.firstName, input.lastName);
      await tx.activityEvent.create({
        data: {
          type: 'booking.requested',
          actorType: 'SYSTEM',
          bookingId: booking.id,
          clientId: client.id,
          message: `Booking ${code} received from ${name}`,
          // The policy the person accepted, and what they answered that has no column on Booking.
          metadata: {
            policyVersion: settings.bookingPolicyVersion,
            matchedBy,
            lang: input.lang,
            heardFrom: input.heardFrom ?? null,
            clientHidden: Boolean(client.deletedAt),
          },
        },
      });

      // Same transaction: the emails exist if and only if the request does (docs/correos.md §5).
      // The person gets it at the address they typed, in the language of the page they used.
      await queueEmail(tx, 'booking.request_received', { to: input.email, toName: name, bookingId: booking.id, clientId: client.id, locale: input.lang });
      await queueEmail(tx, 'admin.new_request', { bookingId: booking.id, clientId: client.id });

      return {
        code,
        firstName: input.firstName,
        email: input.email,
        startsAt: start.toUTC().toISO(),
        durationMinutes: price.durationMinutes,
        serviceName: price.service.name,
        packageName: price.pkg.name,
        locationKind,
        locationName,
        extras: price.extraLines.map((l) => ({ extraId: l.extraId, name: l.nameSnapshot, priceCents: l.priceCentsSnapshot, quantity: l.quantity })),
        totalCents: price.totalCents,
        depositCents: price.depositCents,
        replyWithinHours: settings.replyWithinHours,
      };
    });
  }
}

export default PublicBookingModel;
