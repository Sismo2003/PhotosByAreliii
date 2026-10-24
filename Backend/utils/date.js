// Dates — project rule: always Luxon. The database stores UTC; the studio is America/Phoenix.
import { DateTime } from 'luxon';

export const STUDIO_ZONE = 'America/Phoenix';

/** Now in UTC, as the Date Prisma expects. */
export const nowForDb = () => DateTime.utc().toJSDate();

/** Now as a Luxon DateTime in the studio zone. */
export const nowInStudio = () => DateTime.now().setZone(STUDIO_ZONE);

/** A Date/ISO string from Prisma or the API → DateTime in the studio zone. */
export const toStudio = (value) => {
  if (value instanceof Date) return DateTime.fromJSDate(value, { zone: 'utc' }).setZone(STUDIO_ZONE);
  return DateTime.fromISO(String(value), { zone: 'utc' }).setZone(STUDIO_ZONE);
};

/** "2026-10-12" — the studio calendar day a UTC instant falls on. */
export const studioDayKey = (value) => toStudio(value).toISODate();

/**
 * "YYYY-MM" → { start, end } as Dates covering that month in the studio zone. Null if the
 * string is not a valid month.
 */
export function studioMonthRange(month) {
  const start = DateTime.fromFormat(String(month ?? ''), 'yyyy-MM', { zone: STUDIO_ZONE });
  if (!start.isValid) return null;
  return { start: start.toJSDate(), end: start.endOf('month').toJSDate() };
}

/**
 * A filter bound from the query string → Date. Accepts a full ISO instant or a plain
 * "YYYY-MM-DD", which is read as a studio day: its start for `from`, its end for `to`.
 * Null if missing or invalid.
 */
export function parseDayBound(value, edge /* 'start' | 'end' */) {
  if (!value) return null;
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const day = DateTime.fromISO(text, { zone: STUDIO_ZONE });
    if (!day.isValid) return null;
    return (edge === 'end' ? day.endOf('day') : day.startOf('day')).toJSDate();
  }
  const instant = DateTime.fromISO(text, { setZone: true });
  return instant.isValid ? instant.toUTC().toJSDate() : null;
}
