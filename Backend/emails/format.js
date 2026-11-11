// How values look inside an email: dates in the studio zone with "Arizona time" (Luxon), phones with
// libphonenumber-js, links built from APP_URL. Shared by context.js (real sends) and fixtures.js.
import { BRAND, CONTACT, PAYMENTS, SOCIAL } from '../../shared/site.js';
import { CLIENT_ORIGIN } from '../config/main.js';
import { formatPhone } from '../utils/phone.js';
import { toStudio } from '../utils/date.js';

/** Public origin of the app (where /login, /client and /admin live). */
export const APP_URL = (process.env.APP_URL || CLIENT_ORIGIN).replace(/\/+$/, '');

export const appUrls = () => ({
  base: APP_URL,
  login: `${APP_URL}/login`,
  client: `${APP_URL}/client`,
  admin: `${APP_URL}/admin`,
  assets: `${APP_URL}/api/email-assets`,
});

/** "Thursday, October 30" · "jueves 30 de octubre". Accepts a Luxon DateTime or a Date/ISO. */
export function formatDay(value, locale = 'en') {
  const dt = (value?.isLuxonDateTime ? value : toStudio(value)).setLocale(locale);
  return locale === 'es' ? dt.toFormat("cccc d 'de' LLLL") : dt.toFormat('cccc, LLLL d');
}

/** "5:15 PM Arizona time" · "5:15 p. m. (hora de Arizona)". */
export function formatTime(value, locale = 'en') {
  const dt = (value?.isLuxonDateTime ? value : toStudio(value)).setLocale(locale);
  return locale === 'es' ? `${dt.toFormat('h:mm a')} (hora de Arizona)` : `${dt.toFormat('h:mm a')} Arizona time`;
}

export const businessVars = () => ({
  name: BRAND.name,
  owner: BRAND.owner,
  phone: CONTACT.phoneE164 ? formatPhone(CONTACT.phoneE164) : '',
  instagram: SOCIAL.instagramHandle ? `@${SOCIAL.instagramHandle}` : '',
  email: CONTACT.emails?.primary ?? '',
});

export const paymentVars = () => ({ zelle: PAYMENTS.zelle ?? '', cashApp: PAYMENTS.cashApp ?? '' });

export const footerLinks = () => ({
  instagramUrl: SOCIAL.instagram ?? '',
  website: BRAND.domain ? `https://${BRAND.domain}` : '',
  legalName: BRAND.legalName,
});
