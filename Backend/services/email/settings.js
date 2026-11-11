// Email settings file (docs/correos.md §3): the mail server, sender and on/off switches Areli edits
// in Settings → Email. A JSON file, not the database, so it survives a database restore and can be
// fixed by hand in an emergency.
//
//   - Missing at boot → created with the defaults and sending OFF.
//   - Invalid (broken JSON, wrong shape) → never overwritten: sending pauses and the admin shows
//     "Email settings file is invalid" until it is fixed or saved again from the admin.
//   - Older `version` → missing keys are filled with their defaults, the rest is kept.
//   - Saving: validate → copy to .bak → write .tmp + fsync → rename (atomic) → reload. One save at a
//     time (single backend instance, so an in-memory lock is enough).
//   - Passwords are stored only encrypted (AES-256-GCM, CONFIG_SECRET_KEY) and never leave the API.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yup from 'yup';
import { BRAND } from '../../../shared/site.js';
import { JWT_SECRET } from '../../config/main.js';
import { createCipher } from '../../utils/crypto.js';
import { CATALOG } from '../../emails/catalog.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const CONFIG_PATH = path.resolve(process.env.CONFIG_PATH || path.join(here, '..', '..', 'var', 'settings.json'));
export const SETTINGS_VERSION = 1;

// Same fallback idea as utils/crypto.js. Set CONFIG_SECRET_KEY in production and never change it:
// the saved passwords can't be read with another key (Areli would have to type them again).
const cipher = createCipher(process.env.CONFIG_SECRET_KEY || process.env.GALLERY_ENC_KEY || `dev:${JWT_SECRET}`);
export const decryptSecret = cipher.decrypt;

export const HOSTINGER = {
  smtp: { host: 'smtp.hostinger.com', port: 587, security: 'starttls' },
  imap: { host: 'imap.hostinger.com', port: 993, security: 'ssl' },
};

export function defaultSettings() {
  return {
    version: SETTINGS_VERSION,
    email: {
      enabled: false,
      smtp: { ...HOSTINGER.smtp, user: '', passwordEnc: null },
      // Used by the Mail inbox (phase 2, docs/correos.md §7). Kept here so the file doesn't change shape.
      imap: {
        enabled: true, ...HOSTINGER.imap, user: '', passwordEnc: null, useSmtpPassword: true,
        folder: 'INBOX', syncEveryMinutes: 5, deleteOnServerWhenEmptied: false,
      },
      from: { name: `${BRAND.owner} · ${BRAND.name}`, address: '' },
      replyTo: '',
      adminNotifyEmail: '',
      dailyLimit: 800,
      copyToSentFolder: true,
      templates: Object.fromEntries(CATALOG.map((e) => [e.key, { enabled: true }])),
      inbox: { retentionDays: null, autoEmptyAtPercentUsed: 90 },
      lastTest: null, // { ok, at, message } — the last "Test connection"
    },
  };
}

const email = yup.string().trim().max(254).email('Enter a valid email address');
const server = (securities) =>
  yup.object({
    host: yup.string().trim().max(253).required('Enter the server name'),
    port: yup.number().integer().min(1).max(65535).required(),
    security: yup.string().oneOf(securities).required(),
    user: yup.string().trim().max(254).default(''),
    passwordEnc: yup.string().nullable().default(null),
  });

const fileSchema = yup.object({
  version: yup.number().integer().required(),
  email: yup.object({
    enabled: yup.boolean().required(),
    smtp: server(['ssl', 'starttls', 'none']).required(),
    imap: server(['ssl', 'starttls', 'none']).shape({
      enabled: yup.boolean().required(),
      useSmtpPassword: yup.boolean().required(),
      folder: yup.string().max(200).required(),
      syncEveryMinutes: yup.number().integer().min(1).max(1440).required(),
      deleteOnServerWhenEmptied: yup.boolean().required(),
    }),
    from: yup.object({ name: yup.string().trim().max(120).default(''), address: email.default('') }).required(),
    replyTo: email.default(''),
    adminNotifyEmail: email.default(''),
    dailyLimit: yup.number().integer().min(1).max(10000).required(),
    copyToSentFolder: yup.boolean().required(),
    templates: yup.object().required(),
    inbox: yup.object({
      retentionDays: yup.number().integer().min(1).nullable(),
      autoEmptyAtPercentUsed: yup.number().integer().min(50).max(100).nullable(),
    }),
    lastTest: yup.object({ ok: yup.boolean(), at: yup.string(), message: yup.string() }).nullable().default(null),
  }).required(),
});

// Fills keys added by newer versions of the code; values already in the file win.
function withDefaults(raw) {
  const base = defaultSettings();
  const e = raw.email ?? {};
  return {
    version: SETTINGS_VERSION,
    email: {
      ...base.email,
      ...e,
      smtp: { ...base.email.smtp, ...e.smtp },
      imap: { ...base.email.imap, ...e.imap },
      from: { ...base.email.from, ...e.from },
      inbox: { ...base.email.inbox, ...e.inbox },
      templates: { ...base.email.templates, ...e.templates },
    },
  };
}

// ─── State ─────────────────────────────────────────────────────────────

let current = null; // the parsed file (passwords encrypted)
let fileError = null; // why the file couldn't be used
const listeners = new Set();
let lock = Promise.resolve();

export const onSettingsChange = (fn) => listeners.add(fn);

async function writeAtomic(data) {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  const tmp = `${CONFIG_PATH}.tmp`;
  const handle = await fs.open(tmp, 'w', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(data, null, 2)}\n`);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(tmp, CONFIG_PATH);
}

/** Reads (or creates) the file. Safe to call again; never throws. */
export async function loadSettings() {
  try {
    const text = await fs.readFile(CONFIG_PATH, 'utf8').catch((err) => (err.code === 'ENOENT' ? null : Promise.reject(err)));
    if (text === null) {
      current = defaultSettings();
      await writeAtomic(current);
      fileError = null;
      console.log(`[email] created ${CONFIG_PATH} with sending off`);
    } else {
      const parsed = withDefaults(JSON.parse(text));
      current = await fileSchema.validate(parsed, { stripUnknown: false });
      fileError = null;
    }
  } catch (error) {
    current = null;
    fileError = error.message;
    console.error(`[email] settings file is invalid — sending paused: ${error.message}`);
  }
  listeners.forEach((fn) => fn());
  return current;
}

/** The settings in memory, or null when the file is invalid. */
export const getSettings = () => current;
export const settingsError = () => fileError;

/** Template on/off (locked emails are always on). */
export function templateEnabled(key) {
  return current?.email.templates?.[key]?.enabled !== false;
}

/** SMTP password in clear text, only for the transport. */
export const smtpPassword = () => decryptSecret(current?.email.smtp.passwordEnc);

/** Saves `mutate(emailSettings)` applied to a copy of the current settings; resolves to the new settings. */
export function saveSettings(mutate) {
  const run = lock.then(async () => {
    const base = current ?? withDefaults({});
    const next = structuredClone(base);
    mutate(next.email);
    const valid = await fileSchema.validate(next);
    await fs.copyFile(CONFIG_PATH, `${CONFIG_PATH}.bak`).catch(() => {});
    await writeAtomic(valid);
    current = valid;
    fileError = null;
    listeners.forEach((fn) => fn());
    return current;
  });
  lock = run.catch(() => {});
  return run;
}

export const encryptSecret = cipher.encrypt;

/** What the admin sees: no password, ever — only whether one is saved. */
export function publicSettings(s = current) {
  if (!s) return null;
  const { smtp, imap, ...rest } = s.email;
  const { passwordEnc: smtpPass, ...smtpPublic } = smtp;
  const { passwordEnc: imapPass, ...imapPublic } = imap;
  return {
    ...rest,
    smtp: { ...smtpPublic, passwordSet: Boolean(smtpPass) },
    imap: { ...imapPublic, passwordSet: Boolean(imapPass) },
  };
}
