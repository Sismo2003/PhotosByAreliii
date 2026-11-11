// Email module entry point (docs/correos.md). Business code only needs queueEmail(); the admin API
// (controllers/email.controller.js) uses the rest.
import { DateTime } from 'luxon';
import { CATALOG_BY_KEY, isLocked } from '../../emails/catalog.js';
import { sampleData } from '../../emails/fixtures.js';
import { problemsOf, render } from '../../emails/render.js';
import EmailModel from '../../models/email.model.js';
import { HttpError } from '../../utils/http.js';
import { queueEmail } from './outbox.js';
import { startScheduler } from './scheduler.js';
import { getSettings, loadSettings, settingsError } from './settings.js';
import { cleanContent } from './templates.js';
import { MAILPIT_UI, USES_MAILPIT } from './transport.js';
import { startWorker, tick } from './worker.js';

export { queueEmail } from './outbox.js';

const TESTS_PER_HOUR = 20;

export async function startEmail() {
  await loadSettings();
  startWorker();
  startScheduler();
}

/** Where emails really go right now — the admin says it in one line. */
export function deliveryMode() {
  return USES_MAILPIT ? { mode: 'mailpit', url: MAILPIT_UI } : { mode: 'smtp' };
}

/** Can a real email go out at all? Same rules the worker applies. */
export function sendingState() {
  const s = getSettings();
  if (!s) return { state: 'invalid', message: settingsError() };
  if (!s.email.smtp.passwordEnc && !USES_MAILPIT) return { state: 'not_connected' };
  if (!s.email.enabled) return { state: 'paused' };
  return { state: 'on' };
}

/** Preview in the editor: the draft with sample data, never sent. */
export async function preview(key, locale, content) {
  if (!CATALOG_BY_KEY[key]) throw new HttpError(404, 'Unknown email');
  const clean = cleanContent(content);
  const email = await render(clean, locale, sampleData(key, locale));
  return { ...email, problems: problemsOf(key, clean) };
}

/** "Send test": the draft, sample data, "[TEST]" in the subject; goes out even with sending off. */
export async function sendTest(key, locale, content, to, actorId) {
  if (!CATALOG_BY_KEY[key]) throw new HttpError(404, 'Unknown email');
  const since = DateTime.utc().minus({ hours: 1 }).toJSDate();
  if ((await EmailModel.testsSince(since)) >= TESTS_PER_HOUR) {
    throw new HttpError(429, `That’s ${TESTS_PER_HOUR} tests this hour — try again in a little while`);
  }
  const clean = cleanContent(content);
  const row = await queueEmail(null, key, {
    to, locale, isTest: true,
    data: { testContent: clean, sample: sampleData(key, locale), actorId },
  });
  setImmediate(tick); // don't wait for the next 5-second tick
  return row;
}

/** A SKIPPED/FAILED email goes back to the queue ("Send now"); it then ignores the on/off switches. */
export async function sendNow(id) {
  const row = await EmailModel.get(id);
  if (!row) throw new HttpError(404, 'Email not found');
  if (!['SKIPPED', 'FAILED', 'CANCELLED'].includes(row.status)) throw new HttpError(409, 'Only skipped or failed emails can be sent again');
  await EmailModel.update(id, {
    status: 'PENDING', attempts: 0, lastError: null, skipReason: null,
    nextAttemptAt: DateTime.utc().toJSDate(), data: { ...(row.data ?? {}), force: true },
  });
  setImmediate(tick);
  return EmailModel.get(id);
}

export async function status() {
  const s = getSettings();
  const stats = await EmailModel.stats();
  return {
    ...sendingState(),
    delivery: deliveryMode(),
    dailyLimit: s?.email.dailyLimit ?? null,
    ...stats,
  };
}

export { isLocked };
