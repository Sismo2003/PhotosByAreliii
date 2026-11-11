// Queue an email (docs/correos.md §5): business code calls queueEmail() INSIDE its transaction, so
// the email exists if and only if the change was committed. The worker (worker.js) sends it.
// `db` = the transaction client, or null outside a transaction.
//
//   await queueEmail(tx, 'booking.confirmed', { bookingId: booking.id, clientId: booking.clientId });
//
// Recipient: the client's email for client emails, Areli's notification address for "admin.*",
// SUPPORT_EMAIL for "support.*" — unless `to` is given. Locale: the client's (en by default).
// `data` carries extra values that aren't in the database (old date, cancel reason…): never secrets.
// `secrets` (temporary password) is stored encrypted and erased once the email is sent.
import { CONTACT } from '../../../shared/site.js';
import { CATALOG_BY_KEY } from '../../emails/catalog.js';
import EmailModel from '../../models/email.model.js';
import { SUPPORT_EMAIL } from '../storage.js';
import { encryptSecret, getSettings } from './settings.js';

export const adminAddress = () => getSettings()?.email.adminNotifyEmail || CONTACT.emails?.primary || '';

export async function queueEmail(db, key, { to, toName, clientId = null, bookingId = null, galleryId = null, locale, data = {}, secrets, dedupeKey, sendAfter, isTest = false } = {}) {
  const entry = CATALOG_BY_KEY[key];
  if (!entry) throw new Error(`Unknown email key ${key}`);

  const client = clientId && (!to || !locale) ? await EmailModel.clientContact(db, clientId) : null;
  const recipient = to ?? (entry.audience === 'admin' ? adminAddress() : entry.audience === 'support' ? SUPPORT_EMAIL : client?.email);
  if (!recipient) return null; // nobody to write to (no notification address yet) — nothing to queue

  return EmailModel.enqueue(db, {
    key,
    toEmail: recipient,
    toName: toName ?? (entry.audience === 'client' ? client?.displayName ?? null : null),
    locale: locale ?? (entry.audience === 'client' ? client?.locale : 'en') ?? 'en',
    data,
    secretsEnc: secrets ? encryptSecret(JSON.stringify(secrets)) : null,
    dedupeKey: dedupeKey ?? null,
    isTest,
    clientId,
    bookingId,
    galleryId,
    ...(sendAfter ? { sendAfter } : {}),
  });
}
