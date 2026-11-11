// SMTP transport (docs/correos.md §5.3): built from settings.json, rebuilt when Areli saves it.
// Development sends everything to Mailpit (nothing reaches a real inbox) unless
// EMAIL_DEV_REAL_SMTP=true, and then only to the addresses in EMAIL_DEV_ALLOWLIST.
import nodemailer from 'nodemailer';
import { NODE_ENV } from '../../config/main.js';
import { getSettings, onSettingsChange, smtpPassword } from './settings.js';

const DEV_REAL = NODE_ENV !== 'production' && process.env.EMAIL_DEV_REAL_SMTP === 'true';
export const USES_MAILPIT = NODE_ENV !== 'production' && !DEV_REAL;
const MAILPIT = { host: process.env.MAILPIT_HOST || 'localhost', port: Number(process.env.MAILPIT_PORT || 1025) };
export const MAILPIT_UI = process.env.MAILPIT_UI || 'http://localhost:8025';
const DEV_ALLOWLIST = (process.env.EMAIL_DEV_ALLOWLIST || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

/** In development with the real server, only allow-listed recipients. */
export const recipientAllowed = (to) => !DEV_REAL || DEV_ALLOWLIST.includes(String(to).toLowerCase());

function optionsFor(smtp, password) {
  return {
    host: smtp.host,
    port: smtp.port,
    secure: smtp.security === 'ssl', // 465
    requireTLS: smtp.security === 'starttls', // 587
    auth: smtp.user ? { user: smtp.user, pass: password ?? '' } : undefined,
    tls: { minVersion: 'TLSv1.2' },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  };
}

let transporter = null;

onSettingsChange(() => {
  transporter?.close();
  transporter = null;
});

/** The shared pooled transport, or null when the server isn't configured yet. */
export function getTransport() {
  if (transporter) return transporter;
  if (USES_MAILPIT) {
    transporter = nodemailer.createTransport({ ...MAILPIT, secure: false, ignoreTLS: true });
    return transporter;
  }
  const s = getSettings();
  if (!s?.email.smtp.host || !s.email.smtp.user || !s.email.smtp.passwordEnc) return null;
  transporter = nodemailer.createTransport({ ...optionsFor(s.email.smtp, smtpPassword()), pool: true, maxConnections: 2, maxMessages: 50 });
  return transporter;
}

// ─── Test connection ─────────────────────────────────────────────────

const TIMEOUT_CODES = new Set(['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ESOCKET', 'EHOSTUNREACH', 'ENETUNREACH']);
const ALTERNATE = { 465: { port: 587, security: 'starttls' }, 587: { port: 465, security: 'ssl' } };

/** Nodemailer error → one sentence Areli understands. */
export function explainSmtpError(error, smtp) {
  const code = error?.code;
  const response = String(error?.response ?? error?.message ?? '');
  if (code === 'EAUTH' || /\b535\b/.test(response)) return 'The email or password is wrong. Check them in Hostinger (hPanel → Emails).';
  if (code === 'EDNS' || /ENOTFOUND|EAI_AGAIN/.test(response)) return `The server “${smtp.host}” doesn’t exist. Check the spelling.`;
  if (TIMEOUT_CODES.has(code) || /timeout/i.test(response)) return `The server didn’t answer on port ${smtp.port}. The network may be blocking it.`;
  if (/wrong version number|ssl3_get_record|EPROTO/i.test(response)) return `Port ${smtp.port} doesn’t use ${smtp.security === 'ssl' ? 'SSL' : 'STARTTLS'}. Try the other security option.`;
  if (/certificate/i.test(response)) return 'The server’s security certificate isn’t valid.';
  return `The server said: ${response.slice(0, 200)}`;
}

async function verify(smtp, password) {
  const t = nodemailer.createTransport(optionsFor(smtp, password));
  try {
    await t.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  } finally {
    t.close();
  }
}

/**
 * Checks the SMTP login with the given server (or the saved one). When the port doesn't answer,
 * tries the other Hostinger port and says which one works (`suggestion`), so Areli only has to
 * press "Use it".
 */
export async function testSmtp(smtp, password) {
  const first = await verify(smtp, password);
  if (first.ok) return { ok: true, message: `Connected to ${smtp.host} on port ${smtp.port}.` };
  const message = explainSmtpError(first.error, smtp);
  const alt = ALTERNATE[smtp.port];
  if (alt && TIMEOUT_CODES.has(first.error?.code)) {
    const second = await verify({ ...smtp, ...alt }, password);
    if (second.ok) {
      return { ok: false, message: `Port ${smtp.port} didn’t answer, but port ${alt.port} works.`, suggestion: alt };
    }
  }
  return { ok: false, message };
}
