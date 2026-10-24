// Base data: admin user, StudioSettings, catalog and availability. NEVER runs by itself: it needs
// CONFIRM_SEED=yes (seeds/guard.js). From database/:
//   CONFIRM_SEED=yes node seeds/seed.js
//   CONFIRM_SEED=yes SEED_ONLY=catalog node seeds/seed.js   (only some parts: admin,settings,catalog,availability)
//   docker compose exec -e CONFIRM_SEED=yes prisma node seeds/seed.js
// (`prisma db seed` is not wired any more: prisma.config.ts has no `seed` command.)
//
// Safe to run again: everything is matched by its unique key and only created when missing,
// so it never duplicates rows nor overwrites what Areli later edits in the admin.
//
// Admin login (email OR phone): SEED_ADMIN_EMAIL, SEED_ADMIN_PHONE, SEED_ADMIN_NAME.
// Password: SEED_ADMIN_PASSWORD if set (also resets an existing admin's password); otherwise a
// random one is generated when the admin is created and printed once — it is never stored.
import 'dotenv/config';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.ts';
import { services, extras, availability } from './data/catalog.js';
import { requireSeedConfirmation } from './guard.js';

requireSeedConfirmation('seed', { effect: 'create the admin user, studio settings, the service catalog and availability when they are missing' });

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL) });
const cents = (dollars) => Math.round(dollars * 100);

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'areli@photosbyareliii.test').trim().toLowerCase();
  const phoneInput = process.env.SEED_ADMIN_PHONE || '(480) 555-0123'; // fictional 555-01xx number
  const name = process.env.SEED_ADMIN_NAME || 'Areli';

  const phone = parsePhoneNumberFromString(phoneInput, 'US');
  if (!phone?.isValid()) throw new Error(`SEED_ADMIN_PHONE is not a valid phone number: ${phoneInput}`);

  const existing = await prisma.user.findUnique({ where: { email } });
  const chosenPassword = process.env.SEED_ADMIN_PASSWORD;

  if (existing) {
    const data = { name, phone: phoneInput, phoneE164: phone.number, role: 'ADMIN' };
    if (chosenPassword) data.passwordHash = await argon2.hash(chosenPassword);
    await prisma.user.update({ where: { id: existing.id }, data });
    console.log(`Admin ${email} already exists — ${chosenPassword ? 'password reset from SEED_ADMIN_PASSWORD' : 'password unchanged'}.`);
    return;
  }

  const password = chosenPassword || crypto.randomBytes(12).toString('base64url');
  await prisma.user.create({
    data: {
      email,
      name,
      phone: phoneInput,
      phoneE164: phone.number,
      role: 'ADMIN',
      passwordHash: await argon2.hash(password),
    },
  });
  console.log(`Admin created: ${email} / ${phone.formatNational()}`);
  if (!chosenPassword) console.log(`  Password (shown only now): ${password}`);
}

async function seedSettings() {
  await prisma.studioSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

async function seedCatalog() {
  const serviceIds = {};

  for (const [position, s] of services.entries()) {
    const service = await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        slug: s.slug,
        name: s.name,
        status: 'LIVE',
        position,
      },
    });
    serviceIds[s.slug] = service.id;

    for (const [pkgPosition, p] of s.packages.entries()) {
      await prisma.package.upsert({
        where: { serviceId_name: { serviceId: service.id, name: p.name } },
        update: {},
        create: {
          serviceId: service.id,
          name: p.name,
          priceCents: cents(p.price),
          durationMinutes: p.minutes,
          customDescription: p.note,
          position: pkgPosition,
        },
      });
    }

  }

  for (const [position, x] of extras.entries()) {
    const extra = await prisma.extra.upsert({
      where: { name: x.name },
      update: {},
      create: { name: x.name, priceCents: cents(x.price), minutes: x.minutes ?? 0, position },
    });
    const slugs = x.services ?? Object.keys(serviceIds);
    await prisma.extraService.createMany({
      data: slugs.map((slug) => ({ extraId: extra.id, serviceId: serviceIds[slug] })),
      skipDuplicates: true,
    });
  }
}

async function seedAvailability() {
  await prisma.availabilitySlot.createMany({ data: availability, skipDuplicates: true });
}

// SEED_ONLY=catalog,settings runs just those parts; unset = all of them.
const only = process.env.SEED_ONLY ? process.env.SEED_ONLY.split(',').map((x) => x.trim()) : null;
const parts = { admin: seedAdmin, settings: seedSettings, catalog: seedCatalog, availability: seedAvailability };
if (only && only.some((x) => !parts[x])) throw new Error(`SEED_ONLY must be a list of: ${Object.keys(parts).join(', ')}`);

try {
  for (const [name, run] of Object.entries(parts)) if (!only || only.includes(name)) await run();

  const counts = {
    users: await prisma.user.count(),
    services: await prisma.service.count(),
    packages: await prisma.package.count(),
    extras: await prisma.extra.count(),
    extraLinks: await prisma.extraService.count(),
    slots: await prisma.availabilitySlot.count(),
    settings: await prisma.studioSettings.count(),
  };
  console.log('Seed done:', counts);
} finally {
  await prisma.$disconnect();
}
