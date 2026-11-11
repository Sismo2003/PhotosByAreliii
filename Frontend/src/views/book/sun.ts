// Sunset time for "Sunset is at about 6:12 PM" (BookingDate.dc.html). Computed, never stored
// (database/handoff.md §4.11). Sunrise equation (en.wikipedia.org/wiki/Sunrise_equation): good to
// a couple of minutes, which is all the hint needs. Dates with Luxon (project rule).
import { DateTime } from "luxon";

const rad = Math.PI / 180;
const J2000 = 2451545;
const UNIX_EPOCH_JD = 2440587.5;

/** Sunset of a calendar day ("2026-10-10") at a point, as a DateTime in `zone`; null at the poles. */
export function sunsetOn(isoDate: string, lat: number, lng: number, zone: string): DateTime | null {
  const noonUtc = DateTime.fromISO(isoDate, { zone: "utc" }).set({ hour: 12 });
  if (!noonUtc.isValid) return null;
  const jd = noonUtc.toMillis() / 86400000 + UNIX_EPOCH_JD;
  const n = Math.ceil(jd - J2000 + 0.0008);
  const jStar = n - lng / 360; // east positive, west negative
  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const transit = J2000 + jStar + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * lambda * rad);
  const sinDec = Math.sin(lambda * rad) * Math.sin(23.4397 * rad);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * sinDec) / (Math.cos(lat * rad) * cosDec);
  if (cosH < -1 || cosH > 1) return null;
  const set = transit + Math.acos(cosH) / rad / 360;
  return DateTime.fromMillis((set - UNIX_EPOCH_JD) * 86400000, { zone });
}
