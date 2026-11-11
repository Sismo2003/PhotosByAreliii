// Admin API of the email module (docs/correos.md §3, §4, §6, §9): Settings → Email, the templates
// and their editor, tests and the outbox. Admin only (routes/email.routes.js).
import { DateTime } from 'luxon';
import { CARDS, CATALOG, GROUPS, LOCALES, VARIABLES, isLocked } from '../emails/catalog.js';
import { sampleData } from '../emails/fixtures.js';
import EmailModel from '../models/email.model.js';
import { preview, queueEmail, sendNow, sendTest, status } from '../services/email/index.js';
import {
  HOSTINGER, encryptSecret, getSettings, publicSettings, saveSettings, settingsError, smtpPassword,
} from '../services/email/settings.js';
import * as templates from '../services/email/templates.js';
import { USES_MAILPIT, testSmtp } from '../services/email/transport.js';
import { tick } from '../services/email/worker.js';
import { HttpError, parseId, sendError } from '../utils/http.js';

const ok = (res, data, message) => res.status(200).json({ message, data, error: false });

const handle = (run, done, failed) => async (req, res) => {
  try {
    return ok(res, await run(req), done);
  } catch (error) {
    return sendError(res, error, failed);
  }
};

const settingsPayload = async () => ({
  settings: publicSettings(),
  reviewUrl: (await EmailModel.studioSettings())?.reviewUrl ?? '',
  fileError: settingsError(),
  status: await status(),
  hostinger: HOSTINGER,
});

// ─── Settings ──────────────────────────────────────────────────────────

export const getEmailSettings = handle(() => settingsPayload(), 'Email settings loaded', 'Failed to load email settings');

export const updateEmailSettings = handle(async (req) => {
  const body = req.valid.body;
  const before = getSettings();
  const changedServer = !before
    || ['host', 'port', 'security', 'user'].some((k) => before.email.smtp[k] !== body.smtp[k])
    || Boolean(body.smtp.password);
  await saveSettings((email) => {
    const { password, ...smtp } = body.smtp;
    email.smtp = { ...email.smtp, ...smtp, ...(password ? { passwordEnc: encryptSecret(password) } : {}) };
    email.imap.user = email.imap.user || smtp.user; // the inbox (phase 2) starts with the same mailbox
    email.from = body.from;
    email.replyTo = body.replyTo;
    email.adminNotifyEmail = body.adminNotifyEmail;
    email.dailyLimit = body.dailyLimit;
    // A new server or password hasn't been tested: the last result no longer applies.
    if (changedServer) email.lastTest = null;
  });
  if (body.reviewUrl !== ((await EmailModel.studioSettings())?.reviewUrl ?? '')) await EmailModel.setReviewUrl(body.reviewUrl || null);
  await EmailModel.logSettingsChange(req.user.id, 'Email settings updated', { server: changedServer });
  return settingsPayload();
}, 'Email settings saved', 'Failed to save email settings');

export const setSending = handle(async (req) => {
  const { enabled } = req.valid.body;
  const s = getSettings();
  if (!s) throw new HttpError(409, 'The email settings file is invalid — contact Alexis');
  if (enabled && !USES_MAILPIT && !s.email.smtp.passwordEnc) throw new HttpError(409, 'Connect your mailbox first');
  await saveSettings((email) => {
    email.enabled = enabled;
  });
  await EmailModel.logSettingsChange(req.user.id, enabled ? 'Email sending turned on' : 'Email sending paused', { enabled });
  return settingsPayload();
}, 'Saved', 'Failed to change email sending');

/** "Test connection": the form's values (not saved yet) or, without a body, the saved ones. */
export const testConnection = handle(async (req) => {
  const saved = getSettings()?.email.smtp;
  const form = req.valid.body.smtp;
  const smtp = form ? { host: form.host, port: form.port, security: form.security, user: form.user } : saved;
  if (!smtp?.host || !smtp.user) throw new HttpError(400, 'Enter the mailbox address first');
  const password = form?.password || (saved && saved.user === smtp.user ? smtpPassword() : null);
  if (!password) throw new HttpError(400, 'Enter the password');
  const result = await testSmtp(smtp, password);
  // Remember the result only when it is about the saved server.
  const same = saved && ['host', 'port', 'security', 'user'].every((k) => saved[k] === smtp[k]) && !form?.password;
  if (same) {
    await saveSettings((email) => {
      email.lastTest = { ok: result.ok, at: DateTime.utc().toISO(), message: result.message };
    });
  }
  return result;
}, 'Connection tested', 'Failed to test the connection');

// ─── Templates ─────────────────────────────────────────────────────────

export const listTemplates = handle(async () => ({
  groups: GROUPS,
  locales: LOCALES,
  templates: await templates.listTemplates(),
  variables: VARIABLES,
  cards: CARDS,
}), 'Templates loaded', 'Failed to load templates');

export const setTemplateEnabled = handle(async (req) => {
  const { key } = req.params;
  templates.assertKnown(key);
  if (isLocked(key)) throw new HttpError(409, 'This email can’t be turned off');
  const { enabled } = req.valid.body;
  await saveSettings((email) => {
    email.templates[key] = { ...(email.templates[key] ?? {}), enabled };
  });
  await EmailModel.logSettingsChange(req.user.id, `Email “${key}” turned ${enabled ? 'on' : 'off'}`, { key, enabled });
  return { key, enabled };
}, 'Saved', 'Failed to change the email');

const keyLocale = (req) => [req.params.key, req.params.locale];

export const getTemplate = handle((req) => templates.getTemplate(...keyLocale(req)), 'Template loaded', 'Failed to load the template');
export const previewTemplate = handle((req) => preview(...keyLocale(req), req.valid.body.content), 'Preview ready', 'Failed to build the preview');
export const saveDraft = handle((req) => templates.saveDraft(...keyLocale(req), req.valid.body.content), 'Draft saved', 'Failed to save the draft');
export const publishTemplate = handle((req) => templates.publish(...keyLocale(req), req.valid.body.content, req.user.id), 'Published', 'Failed to publish');
export const restoreDefault = handle((req) => templates.restoreDefault(...keyLocale(req), req.user.id), 'Default restored', 'Failed to restore the default');
export const restoreVersion = handle(
  (req) => templates.draftFromVersion(...keyLocale(req), parseId(req.params.versionId, 'version')),
  'Version loaded into the draft',
  'Failed to load the version',
);

export const testTemplate = handle(async (req) => {
  const [key, locale] = keyLocale(req);
  templates.assertKnown(key, locale);
  const { content, to } = req.valid.body;
  const row = await sendTest(key, locale, content, to, req.user.id);
  return { id: row.id, to };
}, 'Test on its way', 'Failed to send the test');

/** "Send all as test": every email in one language, 5 s apart, from what is published. */
export const testAll = handle(async (req) => {
  const { locale, to } = req.valid.body;
  const keys = CATALOG.map((e) => e.key);
  const start = DateTime.utc();
  for (const [i, key] of keys.entries()) {
    const t = await templates.getTemplate(key, locale);
    await queueEmail(null, key, {
      to, locale, isTest: true, sendAfter: start.plus({ seconds: i * 5 }).toJSDate(),
      data: { testContent: t.published ?? t.content, sample: sampleData(key, locale) },
    });
  }
  setImmediate(tick);
  return { count: keys.length, to, minutes: Math.ceil((keys.length * 5) / 60) };
}, 'Tests on their way', 'Failed to send the tests');

// ─── Outbox ────────────────────────────────────────────────────────────

export const listOutbox = handle((req) => EmailModel.list(req.valid.query), 'Emails loaded', 'Failed to load emails');
export const sendOutboxNow = handle((req) => sendNow(parseId(req.params.id)), 'Sending', 'Failed to send the email');
