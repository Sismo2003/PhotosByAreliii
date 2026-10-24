// Plain-language readings of camera numbers. They return i18n keys (`info.hint.*`) so the portal reads
// the same in English and Spanish; the thresholds mirror the admin's explain.js.

export const shutterLabel = (s) =>
  s == null ? "—" : s >= 1 ? `${s} s` : `1/${Math.round(1 / s)} s`;

export function shutterHint(s) {
  if (s == null) return null;
  if (s <= 1 / 500) return "info.hint.shutterVeryFast";
  if (s <= 1 / 125) return "info.hint.shutterFast";
  if (s <= 1 / 30) return "info.hint.shutterSlow";
  return "info.hint.shutterVerySlow";
}

export function apertureHint(f) {
  if (f == null) return null;
  if (f <= 2.8) return "info.hint.apertureWide";
  if (f <= 5.6) return "info.hint.apertureBalanced";
  return "info.hint.apertureNarrow";
}

export function isoHint(iso) {
  if (iso == null) return null;
  if (iso <= 400) return "info.hint.isoLow";
  if (iso <= 1600) return "info.hint.isoMedium";
  return "info.hint.isoHigh";
}

export function focalHint(mm) {
  if (mm == null) return null;
  if (mm < 35) return "info.hint.focalWide";
  if (mm <= 70) return "info.hint.focalNatural";
  if (mm <= 135) return "info.hint.focalShortTele";
  return "info.hint.focalLongTele";
}

export function megapixels(width, height) {
  if (!width || !height) return null;
  return Math.round((width * height) / 100000) / 10;
}

/** { long, short } in inches at 300 dpi, the usual standard for a sharp print. */
export function printSize(width, height) {
  if (!width || !height) return null;
  return {
    long: Math.floor(Math.max(width, height) / 300),
    short: Math.floor(Math.min(width, height) / 300),
  };
}

export const formatSize = (bytes) =>
  bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
