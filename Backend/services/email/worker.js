// Sends what is in the outbox (docs/correos.md §5.1). Every 5 s it takes up to 10 PENDING emails
// and, one per second:
//   1. sending off / template off → SKIPPED (never lost: "Send now" later). Locked emails and tests
//      go out anyway;
//   2. still makes sense? (deposit already paid, booking moved…) no → CANCELLED;
//   3. fresh data + published template → HTML + text;
//   4. SMTP. OK → SENT. Temporary error → retry in 1 min, 5 min, 30 min, 2 h, 6 h, 24 h.
//      Permanent error (5xx) or 6 tries → FAILED, and support hears about it (at most once an hour).
// Single backend instance: claim() (PENDING → SENDING) is enough to never send a row twice in parallel.
import { DateTime } from 'luxon';
import { CATALOG_BY_KEY, isLocked } from '../../emails/catalog.js';
import { fill, render } from '../../emails/render.js';
import EmailModel from '../../models/email.model.js';
import { toICS } from '../ics.js';
import { BRAND } from '../../../shared/site.js';
import { buildContext } from './context.js';
import { queueEmail } from './outbox.js';
import { getSettings, settingsError, templateEnabled } from './settings.js';
import { templateForSend } from './templates.js';
import { getTransport, recipientAllowed } from './transport.js';

const TICK_MS = 5_000;
const BATCH = 10;
const GAP_MS = 1_000; // at most one email per second
const BACKOFF_MIN = [1, 5, 30, 120, 360, 1440];
const MAX_ATTEMPTS = BACKOFF_MIN.length;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => DateTime.utc();

let running = false;
let timer = null;

// SMTP reply codes 5xx are permanent ("no such user"), except a failed login (535), which is a
// settings problem: keep retrying so the email still goes out once Areli fixes the password.
function isPermanent(error) {
  const code = Number(error?.responseCode);
  if (error?.code === 'EAUTH' || code === 535) return false;
  if (error?.code === 'EENVELOPE') return true;
  return code >= 500 && code < 600;
}

const fromDomain = (address) => String(address).split('@')[1] || BRAND.domain || 'localhost';

async function skip(row, reason) {
  await EmailModel.update(row.id, { status: 'SKIPPED', skipReason: reason });
}

async function retryLater(row, minutes, lastError) {
  await EmailModel.update(row.id, { status: 'PENDING', nextAttemptAt: now().plus({ minutes }).toJSDate(), lastError });
}

async function fail(row, attempts, error) {
  const lastError = String(error?.message ?? error).slice(0, 2000);
  if (attempts < MAX_ATTEMPTS && !isPermanent(error)) {
    await EmailModel.update(row.id, { status: 'PENDING', attempts, lastError, nextAttemptAt: now().plus({ minutes: BACKOFF_MIN[attempts - 1] }).toJSDate() });
    return;
  }
  await EmailModel.update(row.id, { status: 'FAILED', attempts, lastError, nextAttemptAt: now().toJSDate() });
  if (!row.isTest && row.key !== 'support.email_failures') {
    // One alert per clock hour; the email itself counts the failures when it is sent.
    const hour = now().toFormat("yyyy-LL-dd'T'HH");
    await queueEmail(null, 'support.email_failures', { dedupeKey: `failures:${hour}`, data: { failure: { count: '1', lastError } } }).catch(() => {});
  }
}

/** The ready-to-send message for a row, or { skip / cancel }. Also used by the admin preview of a sent email. */
export async function buildMessage(row) {
  const settings = getSettings();
  const ctx = await buildContext(row);
  if (ctx.cancel) return { cancel: ctx.cancel };
  if (row.key === 'support.email_failures' && ctx.data.failure) {
    const since = now().minus({ hours: 1 }).toJSDate();
    const { count, lastError } = await EmailModel.failuresSince(since);
    if (count) ctx.data.failure = { ...ctx.data.failure, count: String(count), lastError };
  }

  let email;
  let versionId = null;
  if (row.isTest && row.data?.testContent) {
    // "Send test" uses the draft that is open in the editor (docs/correos.md §6).
    email = await render(row.data.testContent, ctx.locale, row.data.sample ?? ctx.data);
  } else {
    const template = await templateForSend(row.key, ctx.locale);
    versionId = template.versionId;
    email = await fill(template, row.isTest ? row.data.sample ?? ctx.data : ctx.data);
  }

  // "Deliver gallery" lets Areli write the subject herself.
  if (row.data?.subject) email.subject = String(row.data.subject).slice(0, 250);
  const from = settings?.email.from ?? {};
  const fromAddress = from.address || settings?.email.smtp.user || `no-reply@${BRAND.domain}`;
  const message = {
    from: from.name ? { name: from.name, address: fromAddress } : fromAddress,
    to: row.toName ? { name: row.toName, address: row.toEmail } : row.toEmail,
    replyTo: settings?.email.replyTo || fromAddress,
    subject: row.isTest ? `[TEST] ${email.subject}` : email.subject,
    html: email.html,
    text: email.text,
    messageId: `<outbox-${row.id}@${fromDomain(fromAddress)}>`,
    headers: { 'X-PBA-Outbox': String(row.id), 'X-PBA-Email': row.key },
  };

  if (CATALOG_BY_KEY[row.key]?.attachesCalendar && row.bookingId) {
    const b = await EmailModel.bookingForEmail(row.bookingId);
    if (b) {
      const start = DateTime.fromJSDate(b.startsAt, { zone: 'utc' });
      message.attachments = [{
        filename: `${b.code}.ics`,
        contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
        content: toICS({
          uid: `booking-${b.code}@${BRAND.domain}`, sequence: b.rescheduleCount, start, end: start.plus({ minutes: b.durationMinutes }),
          summary: `${b.serviceNameSnapshot} session · ${BRAND.name}`,
          location: [b.locationName, b.locationAddress].filter(Boolean).join(', '),
          description: `Booking ${b.code}`,
        }),
      }];
    }
  }
  return { message, subject: email.subject, versionId };
}

async function processRow(row) {
  const settings = getSettings();
  const entry = CATALOG_BY_KEY[row.key];
  const forced = row.isTest || isLocked(row.key) || row.data?.force === true;

  if (!settings) return retryLater(row, 5, `Email settings file is invalid: ${settingsError()}`);
  if (!forced && !settings.email.enabled) return skip(row, 'Email sending is off');
  if (!forced && !templateEnabled(row.key)) return skip(row, 'Email turned off');
  if (!recipientAllowed(row.toEmail)) return skip(row, 'Not in EMAIL_DEV_ALLOWLIST (development)');

  if (!row.isTest && entry?.audience === 'client' && row.clientId) {
    const client = await EmailModel.clientForEmail(row.clientId);
    if (client?.emailBouncedAt) return skip(row, 'This address bounced — fix it on the client’s page');
  }

  const sentToday = await EmailModel.sentSince(now().minus({ hours: 24 }).toJSDate());
  if (sentToday >= settings.email.dailyLimit) return retryLater(row, 15, `Daily limit reached (${settings.email.dailyLimit})`);

  const transport = getTransport();
  if (!transport) return fail(row, row.attempts + 1, new Error('The mail server isn’t set up yet (Settings → Email)'));

  let built;
  try {
    built = await buildMessage(row);
  } catch (error) {
    return fail(row, MAX_ATTEMPTS, error); // a template that can't render won't fix itself
  }
  if (built.cancel) return EmailModel.update(row.id, { status: 'CANCELLED', skipReason: built.cancel });

  try {
    const info = await transport.sendMail(built.message);
    const sent = await EmailModel.update(row.id, {
      status: 'SENT', sentAt: now().toJSDate(), attempts: row.attempts + 1, lastError: null, secretsEnc: null,
      subject: built.message.subject, messageId: info.messageId ?? built.message.messageId, templateVersionId: built.versionId,
      sizeBytes: Buffer.byteLength(built.message.html ?? ''),
    });
    if (!row.isTest) await EmailModel.logSent({ ...sent, name: entry?.name ?? row.key }).catch(() => {});
  } catch (error) {
    await EmailModel.update(row.id, { subject: built.subject }).catch(() => {});
    await fail(row, row.attempts + 1, error);
  }
}

export async function tick() {
  if (running) return;
  running = true;
  try {
    await EmailModel.releaseStuck();
    const rows = await EmailModel.due(BATCH);
    for (const row of rows) {
      if (!(await EmailModel.claim(row.id))) continue;
      try {
        await processRow(row);
      } catch (error) {
        console.error(`[email] outbox ${row.id} failed unexpectedly`, error);
        await fail(row, row.attempts + 1, error).catch(() => {});
      }
      await sleep(GAP_MS);
    }
  } catch (error) {
    console.error('[email] worker tick failed', error);
  } finally {
    running = false;
  }
}

export function startWorker() {
  if (timer) return;
  timer = setInterval(tick, TICK_MS);
  timer.unref?.();
}
