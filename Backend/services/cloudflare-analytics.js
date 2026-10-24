// Website visits from Cloudflare Web Analytics (docs/overview-integraciones.md).
// INTEGRATION(cloudflare-analytics): the public site (Frontend/, Astro) must load Cloudflare's
// beacon script; until CF_API_TOKEN, CF_ACCOUNT_ID and CF_SITE_TAG are set this answers
// { ready: false } and the Overview shows the widget as "not connected".
//
// "Visits" is Cloudflare's count of page views that start a visit: someone landing on any route
// coming from another site, a search, a link or typing the URL — i.e. a first page in a session.
import { DateTime } from 'luxon';
import { STUDIO_ZONE } from '../utils/date.js';

const ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';
const CACHE_MS = 10 * 60 * 1000; // Cloudflare's numbers lag a few minutes anyway
let cache = null;

const QUERY = `
  query Visits($accountTag: string!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        rumPageloadEventsAdaptiveGroups(limit: 1000, filter: $filter, orderBy: [date_ASC]) {
          count
          sum { visits }
          dimensions { date }
        }
      }
    }
  }`;

export const analyticsConfigured = () =>
  Boolean(process.env.CF_API_TOKEN && process.env.CF_ACCOUNT_ID && process.env.CF_SITE_TAG);

async function fetchDays(from, to) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: QUERY,
      variables: {
        accountTag: process.env.CF_ACCOUNT_ID,
        filter: { AND: [{ datetime_geq: from.toUTC().toISO() }, { datetime_leq: to.toUTC().toISO() }, { siteTag: process.env.CF_SITE_TAG }] },
      },
    }),
    signal: AbortSignal.timeout(8000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.errors?.length) {
    throw new Error(`Cloudflare analytics: ${body?.errors?.[0]?.message ?? res.status}`);
  }
  const groups = body?.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups ?? [];
  return groups.map((g) => ({ date: g.dimensions.date, visits: g.sum.visits, pageViews: g.count }));
}

const total = (days, key) => days.reduce((sum, d) => sum + d[key], 0);

/**
 * Last `days` days and the `days` before them, so the widget can say "+12% vs previous".
 * Never throws: a Cloudflare failure comes back as { ready: true, error } so the rest of the
 * Overview still loads.
 */
export async function siteVisits(days = 30) {
  if (!analyticsConfigured()) return { ready: false };
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;

  const end = DateTime.now().setZone(STUDIO_ZONE);
  const start = end.minus({ days }).startOf('day');
  const prevStart = start.minus({ days });
  try {
    const all = await fetchDays(prevStart, end);
    const startKey = start.toUTC().toISODate();
    const current = all.filter((d) => d.date >= startKey);
    const previous = all.filter((d) => d.date < startKey);
    const data = {
      ready: true,
      days,
      visits: total(current, 'visits'),
      pageViews: total(current, 'pageViews'),
      previousVisits: total(previous, 'visits'),
      daily: current,
    };
    cache = { at: Date.now(), data };
    return data;
  } catch (error) {
    console.error(error);
    return { ready: true, error: 'Cloudflare did not answer. Try again in a few minutes.' };
  }
}
