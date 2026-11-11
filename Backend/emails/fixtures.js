// Sample data for previews and "Send test" (docs/correos.md §6): made up on purpose — never real
// credentials. Dates are computed from today so a preview never shows a session in the past.
import { nowInStudio } from '../utils/date.js';
import { ALWAYS_VARS, CATALOG_BY_KEY } from './catalog.js';
import { appUrls, businessVars, formatDay, formatTime, paymentVars } from './format.js';

export function sampleData(key, locale = 'en') {
  const entry = CATALOG_BY_KEY[key];
  const es = locale === 'es';
  const now = nowInStudio().setLocale(locale);
  const session = now.plus({ days: 9 }).set({ hour: 17, minute: 15, second: 0, millisecond: 0 });
  const urls = appUrls();

  const all = {
    client: { firstName: 'Emily', displayName: 'Emily Tran' },
    business: businessVars(),
    booking: {
      code: 'PBA-0000',
      service: es ? 'Retratos · Esencial' : 'Portraits · Essential',
      date: formatDay(session, locale),
      time: formatTime(session, locale),
      location: 'Lost Dutchman State Park',
      total: '$160',
      deposit: '$80',
      depositDue: `${formatDay(now.plus({ days: 2 }), locale)}, ${formatTime(now.plus({ days: 2 }), locale)}`,
      balance: '$80',
      previousDate: `${formatDay(session.minus({ days: 3 }), locale)}, ${formatTime(session.minus({ days: 3 }), locale)}`,
      reason: es ? 'Pronóstico de lluvia' : 'Rain in the forecast',
      portalUrl: `${urls.client}/bookings`,
    },
    payment: paymentVars(),
    gallery: {
      title: 'Emily Tran · Golden hour',
      url: `${urls.client}/galleries`,
      pin: '0000',
      password: '',
      availableUntil: formatDay(now.plus({ days: 90 }), locale),
      deleteDate: formatDay(now.plus({ days: 2 }), locale),
      photoCount: '84',
      message: es ? '¡Me encantó trabajar contigo!' : 'It was such a joy to photograph you!',
    },
    login: { email: 'emily@example.com', tempPassword: 'test-1234', url: urls.login },
    reset: { url: `${urls.login}?reset=sample`, expiresIn: es ? '1 hora' : '1 hour' },
    review: { url: 'https://g.page/r/sample/review' },
    change: { oldEmail: 'emily.old@example.com', newEmail: 'emily@example.com' },
    digest: { summary: es ? '2 solicitudes nuevas · 1 sesión hoy' : '2 new requests · 1 session today' },
    bounce: { email: 'emily@example.com', reason: '550 No such user' },
    storage: { level: 'CRITICAL', free: '4.2 GB' },
    failure: { count: '1', lastError: '535 Authentication failed', adminUrl: `${urls.admin}/settings/email` },
  };

  // Only the groups this email may use, so a preview of "Gallery ready" can't silently use
  // {{ booking.date }} — the publish check (strict variables) relies on that.
  const groups = entry ? [...ALWAYS_VARS, ...entry.vars] : Object.keys(all);
  return Object.fromEntries(groups.map((g) => [g, all[g]]));
}
