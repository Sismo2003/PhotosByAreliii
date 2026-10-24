// Dates — project rule: always Luxon (no Date math, no dayjs/moment, no hand-rolled Intl).
// The studio runs on America/Phoenix (no daylight saving). The API stores and returns UTC ISO
// strings; convert at the edges with these helpers and show times in studio time.
import { DateTime, Settings } from "luxon";

export const STUDIO_ZONE = "America/Phoenix";

/** Set Luxon's default locale (called by LocaleProvider when the language changes). */
export function setDateLocale(locale) {
  Settings.defaultLocale = locale;
}

/** Now, in studio time. */
export const nowInStudio = () => DateTime.now().setZone(STUDIO_ZONE);

/** Parse an API value (ISO string, JS Date or millis) into a DateTime in studio time. */
export function toStudio(value) {
  if (!value) return null;
  const dt = DateTime.isDateTime(value)
    ? value
    : value instanceof Date
      ? DateTime.fromJSDate(value)
      : typeof value === "number"
        ? DateTime.fromMillis(value)
        : DateTime.fromISO(value, { setZone: true });
  return dt.isValid ? dt.setZone(STUDIO_ZONE) : null;
}

/** "Friday, October 2" — page eyebrows. */
export const todayLabel = () => nowInStudio().toFormat("cccc, LLLL d");

/** Format an API value in studio time with a Luxon token string ("LLL d, h:mm a"…). */
export function formatDate(value, format = "LLL d, yyyy") {
  return toStudio(value)?.toFormat(format) ?? "—";
}

/** "3 days ago", "in 2 hours". */
export function fromNow(value) {
  return toStudio(value)?.toRelative() ?? "—";
}

/** JS Date for widgets that require one (flatpickr). */
export const toJSDate = (value) => toStudio(value)?.toJSDate() ?? null;

/** Date-only values ("2026-10-16", e.g. galleryState.dueOn) read as a studio calendar day. */
export function fromStudioDay(isoDate) {
  if (!isoDate) return null;
  const dt = DateTime.fromISO(String(isoDate).slice(0, 10), { zone: STUDIO_ZONE });
  return dt.isValid ? dt : null;
}

/** Format a date-only value without shifting it across time zones. */
export function formatDay(isoDate, format = "LLL d") {
  return fromStudioDay(isoDate)?.toFormat(format) ?? "—";
}

/** "2026-10-10" + "17:15" typed in studio time → UTC ISO for the API (null if invalid). */
export function studioInputToISO(date, time) {
  if (!date || !time) return null;
  const dt = DateTime.fromISO(`${date}T${time}`, { zone: STUDIO_ZONE });
  return dt.isValid ? dt.toUTC().toISO() : null;
}
