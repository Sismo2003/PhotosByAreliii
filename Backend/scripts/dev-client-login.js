// DEV ONLY — gives an existing client a login so the client portal can be tried locally, the same way
// "Create login" will (temporary password, must choose their own on first sign-in).
// Until the admin has that button (docs/clients-page-integraciones.md), this is the way.
//
//   CONFIRM=yes node scripts/dev-client-login.js <clientId>
//
// Prints the temporary password once. Running it again for the same client sets a new one.
import crypto from 'node:crypto';
import argon2 from 'argon2';
import prisma from '../config/db.js';
import { NODE_ENV } from '../config/main.js';
import { nowForDb } from '../utils/date.js';

if (NODE_ENV === 'production') throw new Error('dev-client-login is for development only');
if (process.env.CONFIRM !== 'yes') {
  console.error('Refusing to run without CONFIRM=yes (it writes to the database in Backend/.env).');
  process.exit(1);
}

const clientId = Number(process.argv[2]);
if (!Number.isInteger(clientId) || clientId < 1) {
  console.error('Usage: CONFIRM=yes node scripts/dev-client-login.js <clientId>');
  process.exit(1);
}

const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null }, include: { user: true } });
if (!client) throw new Error(`Client ${clientId} not found`);

// "Pba-" + 12 random characters + a digit: passes the rules (length, uppercase, number, no name).
const password = `Pba-${crypto.randomBytes(9).toString('base64url')}${crypto.randomInt(10)}`;
const passwordHash = await argon2.hash(password);
const now = nowForDb();

if (client.user) {
  await prisma.user.update({
    where: { id: client.user.id },
    data: { passwordHash, mustChangePassword: true, passwordChangedAt: now, invitedAt: now },
  });
} else {
  await prisma.user.create({
    data: { email: client.email, passwordHash, role: 'CLIENT', clientId, mustChangePassword: true, invitedAt: now },
  });
}

console.log(`\n${client.displayName}`);
console.log(`  sign in at  http://localhost:5175/login`);
console.log(`  user        ${client.email}${client.phone ? `  or  ${client.phone}` : ''}`);
console.log(`  password    ${password}   (temporary — they must choose their own)\n`);
await prisma.$disconnect();
