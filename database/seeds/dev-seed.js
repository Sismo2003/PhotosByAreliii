// Dev seed — fills every dev-managed table with realistic data so the admin UI has something
// to show. DESTRUCTIVE and never automatic: needs CONFIRM_SEED=yes and a local database
// (seeds/guard.js). From database/:
//   CONFIRM_SEED=yes node seeds/seed.js        (base seed only; idempotent)
//   CONFIRM_SEED=yes node seeds/dev-seed.js    (dev fixtures; wipes + reseeds dev tables)
//
// Tables wiped + reseeded (preserves the base seed in services/packages/extras/settings/
// availability_slots + the admin user):
//   clients, bookings, booking_extras, payments, galleries, gallery_sets, photos,
//   favorites, rebook_reminders, activity_events, password_reset_tokens, email_outbox,
//   email_inbound, email_templates, email_template_versions, blocked_dates
//
// What's generated:
//   - 15 clients (mix of returning + new; some share a phone or email to exercise
//     "Cliente que vuelve" — PHONE / CONFLICT — scenarios)
//   - 48 bookings: ~30 in past dates, ~5 in the future; statuses: REQUEST,
//     AWAITING_DEPOSIT, CONFIRMED (past + future), DECLINED, CANCELLED, EXPIRED
//   - Payments for CONFIRMED bookings (deposit + balance for some)
//   - 6 galleries (one per past CONFIRMED booking) with 2 sets, photos, favorites
//   - Activity events for every booking (REQUESTED, CONFIRMED, DECLINED, etc.)
//   - 4 rebook reminders
//   - 2 email templates (booking.confirmed, gallery.delivered) with a published version
//   - A few EmailOutbox + EmailInbound rows
//   - 2 blocked dates, 2 password reset tokens (1 expired)
//
// All dates are America/Phoenix (studio zone, no DST) → converted to UTC before writing.

import 'dotenv/config';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { DateTime } from 'luxon';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.ts';
import { requireSeedConfirmation } from './guard.js';

requireSeedConfirmation('dev-seed', { destructive: true, effect: 'WIPE clients, bookings, payments, galleries, photos, e-mails and more, and fill them with fake data' });

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL) });
const STUDIO = 'America/Phoenix';

// ---------- helpers --------------------------------------------------------

const cents = (dollars) => Math.round(dollars * 100);
const phoneObj = (input) => parsePhoneNumberFromString(input, 'US');

function phx(yyyyMmDd, hhmm = '10:00') {
  // Local Phoenix → UTC JS Date for Prisma.
  return DateTime.fromISO(`${yyyyMmDd}T${hhmm}`, { zone: STUDIO }).toUTC().toJSDate();
}

function phxDateOnly(yyyyMmDd) {
  // @db.Date column → UTC midnight of that local day is fine; Prisma stores the date.
  return DateTime.fromISO(yyyyMmDd, { zone: STUDIO }).toUTC().toJSDate();
}

function shortCode(n) {
  return `PBA-${String(n).padStart(4, '0')}`;
}

let codeCounter = 0;
function nextCode() {
  codeCounter += 1;
  return shortCode(codeCounter + 100); // start at PBA-0101 to look like real data
}

// ---------- fixtures: clients ----------------------------------------------

const CLIENTS = [
  // Returning clients — each has 2–3 past bookings
  { key: 'jason',   displayName: 'Jason Park',     firstName: 'Jason',   lastName: 'Park',     email: 'jason.park@example.com',     phone: '(480) 555-0106', instagram: '@jasonpark', heardFrom: 'INSTAGRAM', createdDaysAgo: 420 },
  { key: 'mia',     displayName: 'Mia Castillo',   firstName: 'Mia',     lastName: 'Castillo', email: 'mia.castillo@example.com',   phone: '(480) 555-0107', instagram: '@miacastillo', heardFrom: 'FRIEND', createdDaysAgo: 380 },
  { key: 'emily',   displayName: 'Emily Tran',     firstName: 'Emily',   lastName: 'Tran',     email: 'emily.tran@example.com',     phone: '(480) 555-0108', instagram: '@emilytran', heardFrom: 'INSTAGRAM', createdDaysAgo: 300 },
  { key: 'ortega',  displayName: 'The Ortega Family', firstName: 'Marco', lastName: 'Ortega',   email: 'ortega.family@example.com', phone: '(480) 555-0109', heardFrom: 'GOOGLE', createdDaysAgo: 600 },
  { key: 'lucas',   displayName: 'Lucas & Emma',   firstName: 'Lucas',   lastName: 'Reyes',    email: 'lucas.emma@example.com',    phone: '(480) 555-0110', heardFrom: 'INSTAGRAM', createdDaysAgo: 250 },
  { key: 'priya',   displayName: 'Priya Shah',     firstName: 'Priya',   lastName: 'Shah',     email: 'priya.shah@example.com',     phone: '(480) 555-0111', instagram: '@priyashah', heardFrom: 'GOOGLE', createdDaysAgo: 210 },
  { key: 'daniela', displayName: 'Daniela López',  firstName: 'Daniela', lastName: 'López',    email: 'daniela.lopez@example.com',  phone: '(480) 555-0112', heardFrom: 'TIKTOK', createdDaysAgo: 180 },
  { key: 'maria',   displayName: 'María González', firstName: 'María',   lastName: 'González', email: 'maria.g@example.com',         phone: '(480) 555-0113', heardFrom: 'INSTAGRAM', createdDaysAgo: 500 },
  // One-time clients
  { key: 'anita',   displayName: 'Anita Romero',   firstName: 'Anita',   lastName: 'Romero',   email: 'anita.romero@example.com',   phone: '(480) 555-0114', heardFrom: 'INSTAGRAM', createdDaysAgo: 150 },
  { key: 'david',   displayName: 'David Nguyen',   firstName: 'David',   lastName: 'Nguyen',   email: 'david.nguyen@example.com',   phone: '(480) 555-0115', heardFrom: 'FRIEND', createdDaysAgo: 120 },
  { key: 'carla',   displayName: 'Carla Mendoza',  firstName: 'Carla',   lastName: 'Mendoza',  email: 'carla.mendoza@example.com',  phone: '(480) 555-0116', heardFrom: 'INSTAGRAM', createdDaysAgo: 90 },
  { key: 'tom',     displayName: 'Tom Brooks',     firstName: 'Tom',     lastName: 'Brooks',   email: 'tom.brooks@example.com',     phone: '(480) 555-0117', heardFrom: 'INSTAGRAM', createdDaysAgo: 70 },
  { key: 'isabel',  displayName: 'Isabel Ruiz',    firstName: 'Isabel',  lastName: 'Ruiz',     email: 'isabel.ruiz@example.com',    phone: '(480) 555-0118', heardFrom: 'INSTAGRAM', createdDaysAgo: 60 },
  // Brand-new clients (only current REQUESTs)
  { key: 'hannah',  displayName: 'Hannah Brooks',  firstName: 'Hannah',  lastName: 'Brooks',   email: 'hannah.brooks@example.com',  phone: '(480) 555-0119', heardFrom: 'TIKTOK', createdDaysAgo: 1 },
  { key: 'tyler',   displayName: 'Tyler Reed',     firstName: 'Tyler',   lastName: 'Reed',     email: 'tyler.reed@example.com',     phone: '(480) 555-0120', heardFrom: 'GOOGLE', createdDaysAgo: 0 },
];

// ---------- fixtures: bookings ---------------------------------------------

// Each row becomes a Booking. datesIn past are in America/Phoenix.
// Status plan:
//   - Past CONFIRMED with gallery (8)        ← follow-up, recently delivered
//   - Past CONFIRMED, no gallery yet (4)     ← follow-up pending gallery creation
//   - Past CANCELLED (5)
//   - Past DECLINED (3)
//   - Past EXPIRED (3)
//   - Past CONFIRMED, archived (4)           ← Done tab
//   - Upcoming CONFIRMED (8)
//   - Upcoming AWAITING_DEPOSIT (4)
//   - Current REQUEST (5)                    ← the tab the user is building
//   - 4 "follow-up" with rebook reminders
//
// Total: 46 bookings. ~33 in past dates.

const BOOKINGS = [
  // ===== Past CONFIRMED with gallery ============================================
  { clientKey: 'jason',  serviceSlug: 'graduation',       packageIdx: 0, daysAgo: 320, time: '08:00', status: 'CONFIRMED', archived: true,  galleryDeliveredDaysAgo: 305, galleryExpiresDaysFromNow: -10, photosCount: 38, withGallery: true, withBalance: true },
  { clientKey: 'mia',    serviceSlug: 'solos',            packageIdx: 0, daysAgo: 280, time: '17:15', status: 'CONFIRMED', archived: true,  galleryDeliveredDaysAgo: 264, galleryExpiresDaysFromNow: -19, photosCount: 24, withGallery: true, withBalance: true },
  { clientKey: 'ortega', serviceSlug: 'family-couples',   packageIdx: 1, daysAgo: 260, time: '10:00', status: 'CONFIRMED', archived: true,  galleryDeliveredDaysAgo: 244, galleryExpiresDaysFromNow: 20, photosCount: 56, withGallery: true, withBalance: true, favoritesCount: 7 },
  { clientKey: 'emily',  serviceSlug: 'graduation',       packageIdx: 0, daysAgo: 200, time: '08:00', status: 'CONFIRMED', archived: false, galleryDeliveredDaysAgo: 184, galleryExpiresDaysFromNow: 60, photosCount: 41, withGallery: true, withBalance: true, favoritesCount: 4 },
  { clientKey: 'lucas',  serviceSlug: 'family-couples',   packageIdx: 0, daysAgo: 180, time: '17:15', status: 'CONFIRMED', archived: false, galleryDeliveredDaysAgo: 165, galleryExpiresDaysFromNow: 75, photosCount: 32, withGallery: true, withBalance: false, favoritesCount: 2 },
  { clientKey: 'priya',  serviceSlug: 'branding',         packageIdx: 0, daysAgo: 150, time: '10:00', status: 'CONFIRMED', archived: false, galleryDeliveredDaysAgo: 134, galleryExpiresDaysFromNow: 110, photosCount: 28, withGallery: true, withBalance: true, favoritesCount: 5 },
  { clientKey: 'daniela',serviceSlug: 'maternity',        packageIdx: 0, daysAgo: 110, time: '17:15', status: 'CONFIRMED', archived: false, galleryDeliveredDaysAgo: 95,  galleryExpiresDaysFromNow: 80, photosCount: 22, withGallery: true, withBalance: false },
  { clientKey: 'maria',  serviceSlug: 'birthdays-parties',packageIdx: 0, daysAgo: 80,  time: '10:00', status: 'CONFIRMED', archived: false, galleryDeliveredDaysAgo: 64,  galleryExpiresDaysFromNow: 110, photosCount: 47, withGallery: true, withBalance: true, favoritesCount: 9 },

  // ===== Past CONFIRMED, no gallery yet (follow-up pending) ======================
  { clientKey: 'jason',  serviceSlug: 'solos',      packageIdx: 0, daysAgo: 40,  time: '17:15', status: 'CONFIRMED', archived: false, withGallery: false, withBalance: true, followUp: 'create_gallery' },
  { clientKey: 'ortega', serviceSlug: 'family-couples',packageIdx: 1, daysAgo: 28, time: '10:00', status: 'CONFIRMED', archived: false, withGallery: false, withBalance: false, followUp: 'send_thankyou' },
  { clientKey: 'anita',  serviceSlug: 'maternity',  packageIdx: 0, daysAgo: 14,  time: '17:15', status: 'CONFIRMED', archived: false, withGallery: false, withBalance: false, followUp: 'ask_review' },
  { clientKey: 'carla',  serviceSlug: 'solos',      packageIdx: 0, daysAgo: 5,   time: '10:00', status: 'CONFIRMED', archived: false, withGallery: false, withBalance: false, followUp: 'mark_paid' },

  // ===== Past CANCELLED =========================================================
  { clientKey: 'david',  serviceSlug: 'graduation', packageIdx: 0, daysAgo: 350, time: '08:00', status: 'CANCELLED', cancelReason: 'WEATHER', depositRefunded: true },
  { clientKey: 'tom',    serviceSlug: 'solos',      packageIdx: 0, daysAgo: 290, time: '17:15', status: 'CANCELLED', cancelReason: 'CLIENT_REQUEST', depositRefunded: false },
  { clientKey: 'isabel', serviceSlug: 'family-couples', packageIdx: 1, daysAgo: 220, time: '10:00', status: 'CANCELLED', cancelReason: 'PHOTOGRAPHER_UNAVAILABLE', depositRefunded: true },
  { clientKey: 'maria',  serviceSlug: 'graduation', packageIdx: 0, daysAgo: 130, time: '08:00', status: 'CANCELLED', cancelReason: 'NO_DEPOSIT', depositRefunded: false },
  { clientKey: 'lucas',  serviceSlug: 'branding',   packageIdx: 0, daysAgo: 70,  time: '10:00', status: 'CANCELLED', cancelReason: 'CLIENT_REQUEST', depositRefunded: false },

  // ===== Past DECLINED ==========================================================
  { clientKey: 'priya',  serviceSlug: 'birthdays-parties', packageIdx: 1, daysAgo: 340, time: '17:15', status: 'DECLINED', declineReason: 'Schedule conflict' },
  { clientKey: 'daniela',serviceSlug: 'graduation', packageIdx: 0, daysAgo: 250, time: '08:00', status: 'DECLINED', declineReason: 'Out of service area' },
  { clientKey: 'jason',  serviceSlug: 'birthdays-parties', packageIdx: 1, daysAgo: 90,  time: '10:00', status: 'DECLINED', declineReason: 'Already booked that weekend' },

  // ===== Past EXPIRED ===========================================================
  { clientKey: 'mia',    serviceSlug: 'graduation', packageIdx: 0, daysAgo: 380, time: '08:00', status: 'EXPIRED' },
  { clientKey: 'emily',  serviceSlug: 'solos',      packageIdx: 0, daysAgo: 310, time: '17:15', status: 'EXPIRED' },
  { clientKey: 'carla',  serviceSlug: 'maternity',  packageIdx: 0, daysAgo: 170, time: '10:00', status: 'EXPIRED' },

  // ===== Upcoming CONFIRMED =====================================================
  // Most are in the past month so the Overview's "Upcoming sessions" + Bookings' upcoming tab
  // have a few too. The user's "40 in past" bar is met by everything above being past.
  // daysAgo < 0 = future, > 0 = past.
  { clientKey: 'ortega', serviceSlug: 'family-couples', packageIdx: 1, daysAgo: 6,   time: '10:00', status: 'CONFIRMED' },
  { clientKey: 'mia',    serviceSlug: 'maternity',  packageIdx: 0, daysAgo: 12,  time: '17:15', status: 'CONFIRMED' },
  { clientKey: 'priya',  serviceSlug: 'branding',   packageIdx: 0, daysAgo: 18,  time: '10:00', status: 'CONFIRMED' },
  { clientKey: 'emily',  serviceSlug: 'solos',      packageIdx: 0, daysAgo: 22,  time: '17:15', status: 'CONFIRMED' },
  { clientKey: 'lucas',  serviceSlug: 'graduation', packageIdx: 0, daysAgo: 33,  time: '08:00', status: 'CONFIRMED' },
  { clientKey: 'maria',  serviceSlug: 'graduation', packageIdx: 0, daysAgo: 48,  time: '08:00', status: 'CONFIRMED' },
  { clientKey: 'anita',  serviceSlug: 'solos',      packageIdx: 0, daysAgo: 7,   time: '10:00', status: 'CONFIRMED' },
  { clientKey: 'isabel', serviceSlug: 'family-couples', packageIdx: 0, daysAgo: 16,  time: '17:15', status: 'CONFIRMED' },
  // A handful in the future so the "Upcoming" panel and Bookings upcoming tab aren't empty.
  { clientKey: 'jason',  serviceSlug: 'graduation', packageIdx: 0, daysAgo: -5,  time: '08:00', status: 'CONFIRMED' },
  { clientKey: 'lucas',  serviceSlug: 'family-couples', packageIdx: 0, daysAgo: -12, time: '10:00', status: 'CONFIRMED' },
  { clientKey: 'priya',  serviceSlug: 'solos',      packageIdx: 0, daysAgo: -20, time: '17:15', status: 'CONFIRMED' },

  // ===== Upcoming AWAITING_DEPOSIT (a couple future, the rest past) ==============
  { clientKey: 'david',  serviceSlug: 'graduation', packageIdx: 0, daysAgo: 25,  time: '08:00', status: 'AWAITING_DEPOSIT', depositDueDaysAgo: -20 },
  { clientKey: 'tom',    serviceSlug: 'maternity',  packageIdx: 0, daysAgo: 30,  time: '17:15', status: 'AWAITING_DEPOSIT', depositDueDaysAgo: -25 },
  { clientKey: 'hannah', serviceSlug: 'solos',      packageIdx: 0, daysAgo: 4,   time: '10:00', status: 'AWAITING_DEPOSIT', depositDueDaysAgo: -1 },
  { clientKey: 'tyler',  serviceSlug: 'graduation', packageIdx: 0, daysAgo: -3,  time: '08:00', status: 'AWAITING_DEPOSIT', depositDueDaysAgo: -2 },
  { clientKey: 'carla',  serviceSlug: 'solos',      packageIdx: 0, daysAgo: -7,  time: '10:00', status: 'AWAITING_DEPOSIT', depositDueDaysAgo: -5 },

  // ===== Current REQUESTs (the tab the user is building) ========================
  // These will exercise the match-warning UI. Note: the Booking's clientId always points
  // to an existing Client (PHONE/CONFLICT/EMAIL/BOTH join to one). The contactEmail and
  // contactPhone are what the user TYPED on /book — they can differ from the linked
  // Client.email / Client.phoneE164 to exercise the match warnings.
  // NEW client (no match): brand-new Client with fresh email + phone.
  { clientKey: '__NEW_LILA__', serviceSlug: 'graduation',  packageIdx: 0, daysAgo: 0, time: '10:00', status: 'REQUEST', source: 'WEBSITE', matchBy: 'NEW',
    newClient: { displayName: 'Lila Santiago', firstName: 'Lila', lastName: 'Santiago', email: 'lila.santiago@example.com', phone: '(480) 555-0125', instagram: '@lilasanti' } },

  // EMAIL match: same email as Mia, contact info identical
  { clientKey: 'mia', serviceSlug: 'maternity', packageIdx: 0, daysAgo: 0, time: '17:15', status: 'REQUEST', source: 'WEBSITE', matchBy: 'EMAIL' },

  // PHONE match: typed email is NOT in DB, but typed phone matches Mia. Linked to Mia.
  // contactEmail is "m.castillo.alt@example.com" — not present as Client.email — so the
  // match is by phone only.
  { clientKey: 'mia', serviceSlug: 'solos', packageIdx: 0, daysAgo: 0, time: '16:30', status: 'REQUEST', source: 'WEBSITE', matchBy: 'PHONE',
    contactEmail: 'm.castillo.alt@example.com', contactPhone: '(480) 555-0107', matchReviewed: false },

  // CONFLICT: typed email matches Jason, typed phone matches María. Linked to Jason (email wins).
  // The /api/admin/bookings/:id endpoint returns María as conflictWith.
  { clientKey: 'jason', serviceSlug: 'branding', packageIdx: 0, daysAgo: 0, time: '10:00', status: 'REQUEST', source: 'WEBSITE', matchBy: 'CONFLICT',
    contactEmail: 'jason.park@example.com', contactPhone: '(480) 555-0113', matchReviewed: false },

  // EMAIL/BOTH match — review resolved automatically, but "Details changed" warning fires
  // because contactLastName differs from Client.lastName.
  { clientKey: 'ortega', serviceSlug: 'family-couples', packageIdx: 1, daysAgo: 0, time: '17:15', status: 'REQUEST', source: 'WEBSITE', matchBy: 'BOTH',
    contactFirstName: 'Marc', contactLastName: 'Ortega-Family', matchReviewed: true },

  // Manual booking: Areli added it from the admin
  { clientKey: 'priya', serviceSlug: 'branding', packageIdx: 0, daysAgo: 0, time: '10:00', status: 'REQUEST', source: 'MANUAL', matchBy: 'EMAIL' },
];

// ---------- main -----------------------------------------------------------

async function wipeDevTables() {
  // Order matters because of FK constraints.
  await prisma.favorite.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.gallerySet.deleteMany();
  await prisma.gallery.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bookingExtra.deleteMany();
  await prisma.rebookReminder.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.client.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.emailInbound.deleteMany();
  await prisma.emailOutbox.deleteMany();
  await prisma.emailTemplateVersion.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.blockedDate.deleteMany();
}

async function main() {
  console.log('Wiping dev tables…');
  await wipeDevTables();

  const services = await prisma.service.findMany({ include: { packages: true } });
  const serviceBySlug = new Map(services.map((s) => [s.slug, s]));
  const extras = await prisma.extra.findMany();
  const extraByName = new Map(extras.map((e) => [e.name, e]));

  console.log(`Creating ${CLIENTS.length} clients…`);
  const clientByKey = new Map();
  for (const c of CLIENTS) {
    const ph = phoneObj(c.phone);
    const created = await prisma.client.create({
      data: {
        displayName: c.displayName,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        phoneE164: ph.number,
        instagram: c.instagram ?? null,
        heardFrom: c.heardFrom ?? null,
        locale: 'en',
        createdAt: DateTime.now().setZone(STUDIO).minus({ days: c.createdDaysAgo }).toJSDate(),
      },
    });
    clientByKey.set(c.key, created);
  }

  // Two brand-new clients that only appear via the REQUEST (one NEW, one PHONE-pending, one CONFLICT-pending).
  for (const b of BOOKINGS.filter((b) => b.clientKey === '__NEW_LILA__')) {
    const nc = b.newClient;
    const ph = phoneObj(nc.phone);
    const created = await prisma.client.create({
      data: {
        displayName: nc.displayName,
        firstName: nc.firstName,
        lastName: nc.lastName,
        email: nc.email,
        phone: nc.phone,
        phoneE164: ph.number,
        instagram: nc.instagram ?? null,
        locale: 'en',
        createdAt: DateTime.now().setZone(STUDIO).minus({ hours: 12 }).toJSDate(),
      },
    });
    clientByKey.set(b.clientKey, created);
  }

  console.log(`Creating ${BOOKINGS.length} bookings…`);
  let bookingCounter = 0;
  for (const b of BOOKINGS) {
    bookingCounter += 1;
    const code = nextCode();

    // Resolve the linked client.
    const client = clientByKey.get(b.clientKey);
    if (!client) throw new Error(`Missing client ${b.clientKey} for booking ${code}`);

    const service = serviceBySlug.get(b.serviceSlug);
    if (!service) throw new Error(`Missing service ${b.serviceSlug}`);
    const pkg = service.packages[b.packageIdx];
    if (!pkg) throw new Error(`Missing package ${b.packageIdx} of ${b.serviceSlug}`);

    // startsAt: daysAgo > 0 means N days in the past.
    const date = DateTime.now().setZone(STUDIO).minus({ days: b.daysAgo });
    const localDate = date.toFormat('yyyy-LL-dd');
    const startsAt = phx(localDate, b.time);
    // When the request came in. Future sessions were requested yesterday, not on the session
    // day, or their createdAt and booking.requested event would be dated in the future.
    const requestedDaysAgo = b.daysAgo < 0 ? 1 : b.daysAgo;

    // totalCents = package + extras + adjustments
    const extrasTotal = 0;
    const totalCents = pkg.priceCents + extrasTotal;
    const depositCents = Math.round(totalCents * 0.5);

    const isRequest = b.status === 'REQUEST';
    const source = b.source ?? (Math.random() < 0.1 ? 'MANUAL' : 'WEBSITE');
    const clientMatchedBy = b.matchBy ?? (b.status === 'REQUEST' ? 'NEW' : 'EMAIL');
    const matchReviewedAt =
      clientMatchedBy === 'EMAIL' || clientMatchedBy === 'BOTH' || b.matchReviewed === true
          ? client.createdAt
          : null;

    // Contact fields: for REQUEST, mirror client; for others, derive.
    const contactFirstName = isRequest ? (b.contactFirstName ?? client.firstName) : client.firstName;
    const contactLastName  = isRequest ? (b.contactLastName ?? client.lastName) : client.lastName;
    const contactEmail     = isRequest ? (b.contactEmail ?? client.email) : client.email;
    const contactPhone     = isRequest ? (b.contactPhone ?? client.phone) : client.phone;

    // Date math
    const now = DateTime.now().setZone(STUDIO).toJSDate();
    const booking = await prisma.booking.create({
      data: {
        code,
        clientId: client.id,
        source,
        status: b.status,
        serviceId: service.id,
        packageId: pkg.id,
        serviceNameSnapshot: service.name,
        packageNameSnapshot: pkg.name,
        packagePriceCents: pkg.priceCents,
        durationMinutes: pkg.durationMinutes,
        startsAt,
        locationKind: 'STUDIO',
        locationName: 'Studio, Phoenix AZ',
        travelFeeCents: 0,
        adjustmentCents: 0,
        totalCents,
        depositCents,
        contactFirstName,
        contactLastName,
        contactEmail,
        contactPhone,
        clientMatchedBy,
        matchReviewedAt,
        partySize: 'TWO',
        policyAcceptedAt: now,
        confirmedAt: b.status === 'CONFIRMED' || b.status === 'AWAITING_DEPOSIT' ? now : null,
        depositDueAt: b.status === 'AWAITING_DEPOSIT'
          ? DateTime.now().setZone(STUDIO).minus({ days: requestedDaysAgo - 2 }).toJSDate() // 2 days after the request was made
          : null,
        declinedAt: b.status === 'DECLINED' ? now : null,
        cancelledAt: b.status === 'CANCELLED' ? now : null,
        cancelReason: b.cancelReason ?? null,
        depositRefunded: b.depositRefunded ?? null,
        expiredAt: b.status === 'EXPIRED' ? now : null,
        rescheduleCount: 0,
        reviewStatus: b.followUp === 'ask_review' ? 'REQUESTED' : 'NONE',
        reviewRequestedAt: b.followUp === 'ask_review' ? now : null,
        thanksSentAt: b.followUp === 'send_thankyou' ? now : null,
        archivedAt: b.archived ? now : null,
        createdAt: DateTime.now().setZone(STUDIO).minus({ days: requestedDaysAgo }).minus({ hours: 6 }).toJSDate(),
      },
    });

    // Activity events
    const events = [
      { type: 'booking.requested', actor: 'SYSTEM', message: `Booking ${code} received from ${client.displayName}`, daysAgo: requestedDaysAgo },
    ];
    if (b.status !== 'REQUEST') {
      events.push({ type: 'booking.confirmed', actor: 'ADMIN', message: `Booking ${code} confirmed by Areli`, daysAgo: Math.max(b.daysAgo - 1, 0) });
    }
    if (b.status === 'DECLINED') {
      events.push({ type: 'booking.declined', actor: 'ADMIN', message: `Booking ${code} declined — ${b.declineReason}`, daysAgo: Math.max(b.daysAgo - 1, 0) });
    }
    if (b.status === 'CANCELLED') {
      events.push({ type: 'booking.cancelled', actor: 'ADMIN', message: `Booking ${code} cancelled (${b.cancelReason})${b.depositRefunded ? ' — deposit refunded' : ''}`, daysAgo: Math.max(b.daysAgo - 1, 0) });
    }
    if (b.status === 'EXPIRED') {
      events.push({ type: 'booking.expired', actor: 'SYSTEM', message: `Booking ${code} expired — no deposit received`, daysAgo: Math.max(b.daysAgo - 1, 0) });
    }
    if (b.followUp === 'send_thankyou') {
      events.push({ type: 'followup.thanks_sent', actor: 'ADMIN', message: `Thank-you email sent to ${client.displayName}`, daysAgo: Math.max(b.daysAgo - 2, 0) });
    }
    if (b.followUp === 'ask_review') {
      events.push({ type: 'followup.review_requested', actor: 'ADMIN', message: `Review requested from ${client.displayName}`, daysAgo: Math.max(b.daysAgo - 1, 0) });
    }

    for (const e of events) {
      await prisma.activityEvent.create({
        data: {
          type: e.type,
          actorType: e.actor,
          bookingId: booking.id,
          clientId: client.id,
          message: e.message,
          createdAt: DateTime.now().setZone(STUDIO).minus({ days: e.daysAgo }).toJSDate(),
        },
      });
    }

    // Extras: a handful of bookings picked the outfit change add-on.
    if (b.status === 'CONFIRMED' || b.status === 'AWAITING_DEPOSIT') {
      const outfit = await prisma.extra.findFirst({ where: { name: 'Extra outfit change' } });
      if (outfit && ['graduation', 'solos', 'maternity', 'family-couples', 'branding'].includes(b.serviceSlug)) {
        // Add one outfit change to CONFIRMED bookings of those services, ~half the time
        if (bookingCounter % 2 === 0) {
          await prisma.bookingExtra.create({
            data: {
              bookingId: booking.id,
              extraId: outfit.id,
              nameSnapshot: outfit.name,
              priceCentsSnapshot: outfit.priceCents,
            },
          });
        }
      }
    }

    // Payments: CONFIRMED + withBalance OR follow-up pending balance.
    // AWAITING_DEPOSIT gets no payment: recording the deposit (POST /payments) is what moves a
    // booking to CONFIRMED, so a paid deposit on an awaiting booking would be inconsistent.
    if (b.status === 'CONFIRMED') {
      // Deposit always recorded
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          kind: 'DEPOSIT',
          method: 'ZELLE',
          amountCents: depositCents,
          receivedAt: DateTime.now().setZone(STUDIO).minus({ days: Math.max(b.daysAgo + 1, 0) }).toJSDate(),
          note: 'Deposit via Zelle',
        },
      });
      // Balance
      if (b.withBalance) {
        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            kind: 'BALANCE',
            method: 'CASH_APP',
            amountCents: totalCents - depositCents,
            receivedAt: DateTime.now().setZone(STUDIO).minus({ days: Math.max(b.daysAgo - 1, 0) }).toJSDate(),
            note: 'Balance on session day',
          },
        });
      }
    }
    // Cancelled with refund
    if (b.status === 'CANCELLED' && b.depositRefunded) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          kind: 'DEPOSIT',
          method: 'ZELLE',
          amountCents: depositCents,
          receivedAt: DateTime.now().setZone(STUDIO).minus({ days: b.daysAgo + 3 }).toJSDate(),
        },
      });
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          kind: 'REFUND',
          method: 'ZELLE',
          amountCents: depositCents,
          receivedAt: now,
          note: 'Refund issued',
        },
      });
    }

    // Gallery (only for past CONFIRMED with withGallery)
    if (b.withGallery) {
      const slug = `${client.firstName?.toLowerCase().replace(/[^a-z]/g, '') ?? 'client'}-${bookingCounter}`;
      const deliveredAt = DateTime.now().setZone(STUDIO).minus({ days: b.galleryDeliveredDaysAgo }).toJSDate();
      const expiresAt = b.galleryExpiresDaysFromNow != null
        ? DateTime.now().setZone(STUDIO).plus({ days: b.galleryExpiresDaysFromNow }).toJSDate()
        : DateTime.now().setZone(STUDIO).plus({ days: 90 }).toJSDate();
      const gallery = await prisma.gallery.create({
        data: {
          slug,
          title: `${client.displayName} — ${service.name}`,
          clientId: client.id,
          bookingId: booking.id,
          status: 'DELIVERED',
          deliveredAt,
          expiresAt,
          coverLayout: 'FULL',
          downloadMode: 'HIGH_AND_WEB',
          pinRequired: true,
          privacy: 'CLIENT_LOGIN',
          favoritesEnabled: true,
          favoritesLimit: 20,
          deliverySubject: `Your photos are ready!`,
          deliveryMessage: `Hi ${client.firstName}, your photos are ready.`,
          deliveredToEmail: client.email,
        },
      });
      const set1 = await prisma.gallerySet.create({ data: { galleryId: gallery.id, name: 'Highlights', position: 0 } });
      const set2 = await prisma.gallerySet.create({ data: { galleryId: gallery.id, name: 'Portraits', position: 1 } });

      const total = b.photosCount;
      for (let i = 0; i < total; i++) {
        const photo = await prisma.photo.create({
          data: {
            galleryId: gallery.id,
            setId: i < total / 2 ? set1.id : set2.id,
            originalFilename: `${slug}-${String(i + 1).padStart(3, '0')}.jpg`,
            mimeType: 'image/jpeg',
            sizeBytes: 4_000_000 + i * 50_000,
            width: 6000,
            height: 4000,
            originalPath: `Backend/storage/galleries/${gallery.id}/${i + 1}/original.jpg`,
            webPath: `Backend/storage/galleries/${gallery.id}/${i + 1}/web.jpg`,
            thumbnailPath: `Backend/storage/galleries/${gallery.id}/${i + 1}/thumb.jpg`,
            position: i,
            hidden: false,
            uploadedAt: deliveredAt,
          },
        });
        // Favorites
        if (b.favoritesCount && i < b.favoritesCount) {
          await prisma.favorite.create({
            data: {
              clientId: client.id,
              photoId: photo.id,
              createdAt: DateTime.now().setZone(STUDIO).minus({ days: Math.max(b.galleryDeliveredDaysAgo - 3, 0) }).toJSDate(),
            },
          });
        }
      }
      // Activity: gallery.delivered
      await prisma.activityEvent.create({
        data: {
          type: 'gallery.delivered',
          actorType: 'ADMIN',
          bookingId: booking.id,
          clientId: client.id,
          galleryId: gallery.id,
          message: `Gallery "${gallery.title}" delivered to ${client.email}`,
          createdAt: deliveredAt,
        },
      });
    }
  }

  // ---------- rebook reminders ------------------------------------------------
  console.log('Creating rebook reminders…');
  await prisma.rebookReminder.create({
    data: {
      clientId: clientByKey.get('mia').id,
      bookingId: (await prisma.booking.findFirst({ where: { clientId: clientByKey.get('mia').id } })).id,
      kind: 'ONE_YEAR_ANNIVERSARY_BIRTHDAY',
      label: 'In 1 year · anniversary or birthday',
      dueOn: phxDateOnly(DateTime.now().setZone(STUDIO).plus({ days: 45 }).toFormat('yyyy-LL-dd')),
    },
  });
  await prisma.rebookReminder.create({
    data: {
      clientId: clientByKey.get('priya').id,
      bookingId: (await prisma.booking.findFirst({ where: { clientId: clientByKey.get('priya').id } })).id,
      kind: 'SIX_MONTHS_FAMILY',
      label: 'In 6 months · family update',
      dueOn: phxDateOnly(DateTime.now().setZone(STUDIO).plus({ days: 50 }).toFormat('yyyy-LL-dd')),
    },
  });
  await prisma.rebookReminder.create({
    data: {
      clientId: clientByKey.get('ortega').id,
      kind: 'NEWBORN',
      label: 'When baby arrives · newborn session',
      dueOn: phxDateOnly(DateTime.now().setZone(STUDIO).plus({ days: 25 }).toFormat('yyyy-LL-dd')),
    },
  });
  await prisma.rebookReminder.create({
    data: {
      clientId: clientByKey.get('emily').id,
      kind: 'NEXT_SPRING_GRADUATION',
      label: 'Next spring · graduation season',
      dueOn: phxDateOnly(DateTime.now().setZone(STUDIO).plus({ days: 90 }).toFormat('yyyy-LL-dd')),
      doneAt: DateTime.now().setZone(STUDIO).minus({ days: 5 }).toJSDate(),
    },
  });

  // ---------- blocked dates ---------------------------------------------------
  console.log('Blocking a couple of dates…');
  await prisma.blockedDate.create({
    data: {
      date: phxDateOnly(DateTime.now().setZone(STUDIO).plus({ days: 20 }).toFormat('yyyy-LL-dd')),
      reason: 'Family wedding',
    },
  });
  await prisma.blockedDate.create({
    data: {
      date: phxDateOnly(DateTime.now().setZone(STUDIO).plus({ days: 21 }).toFormat('yyyy-LL-dd')),
      reason: 'Family wedding',
    },
  });

  // ---------- password reset tokens ------------------------------------------
  console.log('Creating password reset tokens…');
  const tokenHash = crypto.createHash('sha256').update(crypto.randomBytes(16)).digest('hex');
  await prisma.passwordResetToken.create({
    data: {
      userId: (await prisma.user.findFirst({ where: { role: 'ADMIN' } })).id,
      tokenHash,
      expiresAt: DateTime.now().plus({ hours: 1 }).toJSDate(),
    },
  });
  const expiredHash = crypto.createHash('sha256').update(crypto.randomBytes(16)).digest('hex');
  await prisma.passwordResetToken.create({
    data: {
      userId: (await prisma.user.findFirst({ where: { role: 'ADMIN' } })).id,
      tokenHash: expiredHash,
      expiresAt: DateTime.now().minus({ days: 2 }).toJSDate(),
      usedAt: DateTime.now().minus({ days: 2, hours: 1 }).toJSDate(),
    },
  });

  // ---------- email templates + versions + outbox + inbound --------------------
  console.log('Creating email templates and a few messages…');
  const subjectConfirmed = 'You\'re booked — here\'s what happens next';
  const subjectDelivered = 'Your photos are ready';
  const mjml = (body) => `<mjml><mj-body><mj-section><mj-column><mj-text>${body}</mj-text></mj-column></mj-section></mj-body></mjml>`;

  const tplConfirmed = await prisma.emailTemplate.create({
    data: {
      key: 'booking.confirmed',
      locale: 'en',
      draftSubject: subjectConfirmed,
      draftMjml: mjml('Hi {{client.firstName}}! Your booking is confirmed.'),
      draftUpdatedAt: DateTime.now().minus({ days: 30 }).toJSDate(),
      isDefault: false,
    },
  });
  const verConfirmed = await prisma.emailTemplateVersion.create({
    data: {
      templateId: tplConfirmed.id,
      version: 1,
      subject: subjectConfirmed,
      mjml: mjml('Hi {{client.firstName}}! Your booking is confirmed.'),
      html: '<p>Hi {{client.firstName}}! Your booking is confirmed.</p>',
      publishedAt: DateTime.now().minus({ days: 30 }).toJSDate(),
    },
  });
  await prisma.emailTemplate.update({
    where: { id: tplConfirmed.id },
    data: { publishedVersionId: verConfirmed.id, publishedVersion: { connect: { id: verConfirmed.id } } },
  }).catch(async () => {
    // Fallback if the relation connect above didn't take (older client API). Re-update.
    await prisma.emailTemplate.update({ where: { id: tplConfirmed.id }, data: { publishedVersionId: verConfirmed.id } });
  });

  const tplDelivered = await prisma.emailTemplate.create({
    data: {
      key: 'gallery.delivered',
      locale: 'en',
      draftSubject: subjectDelivered,
      draftMjml: mjml('Your gallery is ready, {{client.firstName}}!'),
      draftUpdatedAt: DateTime.now().minus({ days: 10 }).toJSDate(),
      isDefault: false,
    },
  });
  const verDelivered = await prisma.emailTemplateVersion.create({
    data: {
      templateId: tplDelivered.id,
      version: 1,
      subject: subjectDelivered,
      mjml: mjml('Your gallery is ready, {{client.firstName}}!'),
      html: '<p>Your gallery is ready, {{client.firstName}}!</p>',
      publishedAt: DateTime.now().minus({ days: 10 }).toJSDate(),
    },
  });
  await prisma.emailTemplate.update({ where: { id: tplDelivered.id }, data: { publishedVersionId: verDelivered.id } });

  // A couple of EmailOutbox entries (past, SENT)
  const recentBooking = await prisma.booking.findFirst({ where: { status: 'CONFIRMED', contactEmail: { not: null } }, orderBy: { createdAt: 'desc' } });
  if (recentBooking) {
    const client = await prisma.client.findUnique({ where: { id: recentBooking.clientId } });
    await prisma.emailOutbox.create({
      data: {
        key: 'booking.confirmed',
        templateVersionId: verConfirmed.id,
        toEmail: recentBooking.contactEmail,
        toName: client?.displayName ?? null,
        locale: 'en',
        data: { bookingCode: recentBooking.code },
        subject: subjectConfirmed,
        status: 'SENT',
        sendAfter: recentBooking.createdAt,
        attempts: 1,
        sentAt: recentBooking.createdAt,
        messageId: `<outbox-1@photosbyareliii.test>`,
        clientId: client.id,
        bookingId: recentBooking.id,
        createdAt: recentBooking.createdAt,
      },
    });
    await prisma.emailInbound.create({
      data: {
        folder: 'INBOX',
        uidValidity: 1n,
        uid: 1,
        fromEmail: recentBooking.contactEmail,
        fromName: client?.displayName ?? null,
        toEmail: 'areli@photosbyareliii.test',
        subject: `Re: ${subjectConfirmed}`,
        snippet: `Thank you so much! Looking forward to it.`,
        receivedAt: DateTime.now().minus({ days: 2 }).toJSDate(),
        sizeBytes: 4200,
        clientId: client.id,
      },
    });
  }

  // ---------- final counts ---------------------------------------------------
  const counts = {
    clients: await prisma.client.count(),
    bookings: await prisma.booking.count(),
    pastBookings: await prisma.booking.count({ where: { startsAt: { lt: DateTime.now().toJSDate() } } }),
    requestBookings: await prisma.booking.count({ where: { status: 'REQUEST' } }),
    payments: await prisma.payment.count(),
    galleries: await prisma.gallery.count(),
    gallerySets: await prisma.gallerySet.count(),
    photos: await prisma.photo.count(),
    favorites: await prisma.favorite.count(),
    rebookReminders: await prisma.rebookReminder.count(),
    activityEvents: await prisma.activityEvent.count(),
    blockedDates: await prisma.blockedDate.count(),
    passwordResetTokens: await prisma.passwordResetToken.count(),
    emailOutbox: await prisma.emailOutbox.count(),
    emailInbound: await prisma.emailInbound.count(),
    emailTemplates: await prisma.emailTemplate.count(),
    emailTemplateVersions: await prisma.emailTemplateVersion.count(),
  };
  console.log('Dev seed done:', counts);
}

try {
  await main();
} catch (err) {
  console.error('Dev seed failed:', err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}