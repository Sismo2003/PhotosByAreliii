// The variables of a real email (docs/correos.md §4.3), read fresh from the database when the
// worker sends it — so a booking rescheduled after the email was queued still shows the new date.
// Each loader also says whether the email still makes sense (`cancel`): e.g. a deposit reminder for
// a booking that is already confirmed is cancelled instead of sent.
import { CATALOG_BY_KEY } from '../../emails/catalog.js';
import { appUrls, businessVars, formatDay, formatTime, paymentVars } from '../../emails/format.js';
import EmailModel from '../../models/email.model.js';
import { formatCents, paidCents } from '../booking-derive.js';
import { decrypt } from '../../utils/crypto.js';
import { issueTemporaryLogin } from './login.js';
import { decryptSecret } from './settings.js';

const CANCEL_REASON = {
  en: {
    CLIENT_REQUEST: 'you asked to cancel', WEATHER: 'weather', PHOTOGRAPHER_UNAVAILABLE: 'I’m not available',
    NO_DEPOSIT: 'no deposit received', NO_SHOW: 'no-show',
  },
  es: {
    CLIENT_REQUEST: 'pediste cancelarla', WEATHER: 'el clima', PHOTOGRAPHER_UNAVAILABLE: 'no estoy disponible',
    NO_DEPOSIT: 'no se recibió el depósito', NO_SHOW: 'no te presentaste',
  },
};

const clientVars = (c) => ({ firstName: c?.firstName || c?.displayName || '', displayName: c?.displayName || '' });
const when = (value, locale) => (value ? `${formatDay(value, locale)}, ${formatTime(value, locale)}` : '');

function bookingVars(b, locale, extra = {}) {
  const paid = paidCents(b.payments);
  const balance = b.totalCents - paid;
  return {
    code: b.code,
    service: [b.serviceNameSnapshot, b.packageNameSnapshot].filter(Boolean).join(' · '),
    date: formatDay(b.startsAt, locale),
    time: formatTime(b.startsAt, locale),
    location: b.locationName,
    total: formatCents(b.totalCents),
    deposit: formatCents(b.depositCents),
    depositDue: when(b.depositDueAt, locale),
    balance: balance > 0 ? formatCents(balance) : '',
    previousDate: when(extra.previousStartsAt, locale),
    reason: extra.cancelReason ? (CANCEL_REASON[locale] ?? CANCEL_REASON.en)[extra.cancelReason] ?? '' : extra.reason ?? '',
    portalUrl: `${appUrls().client}/bookings`,
  };
}

function galleryVars(g, locale) {
  const showPin = g.pinRequired && g.downloadMode !== 'OFF';
  return {
    title: g.title,
    url: `${appUrls().client}/galleries/${g.slug}`,
    pin: showPin ? decrypt(g.downloadPinEnc) ?? '' : '',
    password: g.privacy === 'PASSWORD' ? decrypt(g.accessPasswordEnc) ?? '' : '',
    availableUntil: g.expiresAt ? formatDay(g.expiresAt, locale) : '',
    deleteDate: g.expiresAt ? formatDay(g.expiresAt, locale) : '',
    photoCount: String(g.photoCount ?? ''),
    message: g.deliveryMessage ?? '',
  };
}

// Is this scheduled/conditional email still worth sending? (docs/correos.md §5.1 step 2, "guard")
const STILL_VALID = {
  'booking.deposit_reminder': (b) => b.status === 'AWAITING_DEPOSIT' && paidCents(b.payments) < b.depositCents,
  'booking.prep_reminder': (b, extra) => b.status === 'CONFIRMED' && (!extra.startsAt || +new Date(extra.startsAt) === +b.startsAt),
  'gallery.expiry_warning': (g) => g.status === 'DELIVERED' && !g.photosDeletedAt,
};

/**
 * outbox row → { data, locale, cancel? }. `secrets` are the decrypted one-time values stored with
 * the row (temporary password).
 */
export async function buildContext(row) {
  const entry = CATALOG_BY_KEY[row.key];
  const extra = row.data ?? {};
  const urls = appUrls();
  const data = { business: businessVars(), client: clientVars(null) };
  const locale = row.locale ?? 'en';

  if (row.bookingId && entry?.vars.includes('booking')) {
    const b = await EmailModel.bookingForEmail(row.bookingId);
    if (!b) return { cancel: 'The booking no longer exists' };
    if (STILL_VALID[row.key] && !STILL_VALID[row.key](b, extra)) return { cancel: 'No longer needed' };
    // "Request received" greets whoever typed the request: a phone match can link it to a client
    // on file under another name (database/handoff.md §4.4), and that name isn't theirs to see.
    data.client =
      row.key === 'booking.request_received' && b.contactFirstName
        ? clientVars({ firstName: b.contactFirstName, displayName: [b.contactFirstName, b.contactLastName].filter(Boolean).join(' ') })
        : clientVars(b.client);
    data.booking = bookingVars(b, locale, extra);
    data.payment = paymentVars();
    if (entry.vars.includes('review')) {
      const settings = await EmailModel.studioSettings();
      data.review = { url: settings?.reviewUrl ?? '' };
    }
  }

  if (row.galleryId && entry?.vars.includes('gallery')) {
    const g = await EmailModel.galleryForEmail(row.galleryId);
    if (!g) return { cancel: 'The gallery no longer exists' };
    if (STILL_VALID[row.key] && !STILL_VALID[row.key](g, extra)) return { cancel: 'No longer needed' };
    data.client = clientVars(g.client);
    data.gallery = galleryVars(g, locale);
  }

  if (!row.bookingId && !row.galleryId && row.clientId) {
    const c = await EmailModel.clientForEmail(row.clientId);
    if (c) data.client = clientVars(c);
  }

  if (entry?.vars.includes('login')) {
    const secrets = row.secretsEnc ? JSON.parse(decryptSecret(row.secretsEnc) ?? '{}') : {};
    // A gallery delivered to someone who never signed in carries a fresh temporary password.
    const issued = !row.isTest && extra.issueLogin && row.clientId ? await issueTemporaryLogin(row.clientId) : null;
    data.login = { email: issued?.email ?? extra.loginEmail ?? row.toEmail, tempPassword: issued?.tempPassword ?? secrets.tempPassword ?? '', url: urls.login };
  }

  // Groups whose values travel in the row itself (no secrets there): change, failure, storage…
  for (const group of ['change', 'failure', 'storage', 'digest', 'bounce', 'reset']) {
    if (extra[group]) data[group] = extra[group];
  }
  if (data.failure) data.failure.adminUrl = `${urls.admin}/settings/email`;

  return { data, locale };
}
