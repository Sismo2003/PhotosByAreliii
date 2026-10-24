// Camera data of a photo, read with exifr from the original and reduced to what the admin viewer
// shows. EXIF has no time zone: the camera clock is the studio's, so the time is read as
// America/Phoenix and returned in UTC (project rule: Luxon).
import exifr from 'exifr';
import { DateTime } from 'luxon';
import { STUDIO_ZONE } from '../utils/date.js';

const round = (n, digits = 1) => (Number.isFinite(n) ? Math.round(n * 10 ** digits) / 10 ** digits : null);

function takenAt(raw) {
  if (!raw) return null;
  const dt = typeof raw === 'string' ? DateTime.fromFormat(raw.trim(), 'yyyy:MM:dd HH:mm:ss', { zone: STUDIO_ZONE }) : DateTime.fromJSDate(raw, { zone: STUDIO_ZONE });
  return dt.isValid ? dt.toUTC().toISO() : null;
}

/** `{}` when the file has no EXIF (PNG, WebP, stripped). Never throws. */
export async function readExif(file) {
  try {
    const raw = await exifr.parse(file, { gps: true, reviveValues: false, translateValues: true, mergeOutput: true });
    if (!raw) return {};
    const exposure = raw.ExposureTime;
    return {
      make: raw.Make?.trim() || null,
      model: raw.Model?.trim() || null,
      lens: raw.LensModel?.trim() || null,
      focalLength: round(raw.FocalLength),
      aperture: round(raw.FNumber),
      shutter: Number.isFinite(exposure) ? exposure : null, // seconds
      iso: Number.isFinite(raw.ISO) ? raw.ISO : null,
      takenAt: takenAt(raw.DateTimeOriginal ?? raw.CreateDate),
      gps: Number.isFinite(raw.latitude) && Number.isFinite(raw.longitude) ? { lat: round(raw.latitude, 5), lon: round(raw.longitude, 5) } : null,
    };
  } catch {
    return {};
  }
}
