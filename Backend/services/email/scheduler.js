// Scheduled emails (docs/correos.md §5.5), checked at boot and every hour. Each one has a dedupeKey
// that includes the date it depends on, so it is queued once — and again only if that date changes
// (a rescheduled session gets a new reminder). The worker re-checks before sending that it still
// makes sense (context.js STILL_VALID).
import { DateTime } from 'luxon';
import EmailModel from '../../models/email.model.js';
import { paidCents } from '../booking-derive.js';
import { queueEmail } from './outbox.js';

const HOUR = 60 * 60 * 1000;
let timer = null;

const iso = (date) => DateTime.fromJSDate(date, { zone: 'utc' }).toISO();

export async function runReminders() {
  const settings = await EmailModel.studioSettings();
  const hours = {
    deposit: settings?.depositReminderHours ?? 12,
    prep: settings?.prepReminderHours ?? 48,
    expiry: settings?.expiryReminderHours ?? 48,
  };
  const now = DateTime.utc();
  let queued = 0;

  for (const b of await EmailModel.depositReminderCandidates(now.plus({ hours: hours.deposit }).toJSDate())) {
    if (paidCents(b.payments) >= b.depositCents) continue;
    if (await queueEmail(null, 'booking.deposit_reminder', { bookingId: b.id, clientId: b.clientId, dedupeKey: `deposit:${b.id}:${iso(b.depositDueAt)}` })) queued += 1;
  }

  for (const b of await EmailModel.prepReminderCandidates(now.plus({ hours: hours.prep }).toJSDate())) {
    const startsAt = iso(b.startsAt);
    if (await queueEmail(null, 'booking.prep_reminder', { bookingId: b.id, clientId: b.clientId, data: { startsAt }, dedupeKey: `prep:${b.id}:${startsAt}` })) queued += 1;
  }

  for (const g of await EmailModel.expiryWarningCandidates(now.plus({ hours: hours.expiry }).toJSDate())) {
    await EmailModel.markExpiryWarned(g.id, (tx) =>
      queueEmail(tx, 'gallery.expiry_warning', { galleryId: g.id, clientId: g.clientId, bookingId: g.bookingId, dedupeKey: `expiry:${g.id}:${iso(g.expiresAt)}` }));
    queued += 1;
  }

  if (queued) console.log(`[email] reminders queued: ${queued}`);
  return queued;
}

export function startScheduler() {
  if (timer) return;
  const run = () => runReminders().catch((error) => console.error('[email] reminders failed', error));
  setTimeout(run, 30_000).unref?.(); // let the server settle first
  timer = setInterval(run, HOUR);
  timer.unref?.();
}
