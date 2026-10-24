// Plain-language readings of camera numbers, so Areli (and anyone she shows) can understand them.

export const shutterLabel = (s) =>
  s == null ? "—" : s >= 1 ? `${s} s` : `1/${Math.round(1 / s)} s`;

export function shutterHint(s) {
  if (s == null) return null;
  if (s <= 1 / 500) return "Very fast — freezes movement.";
  if (s <= 1 / 125) return "Fast enough for people, without blur.";
  if (s <= 1 / 30) return "Slow — needs a steady hand or a tripod.";
  return "Very slow — only for a tripod.";
}

export function apertureHint(f) {
  if (f == null) return null;
  if (f <= 2.8) return "Wide open: sharp subject, soft blurred background.";
  if (f <= 5.6) return "Balanced: subject sharp, background gently soft.";
  return "Narrow: most of the scene in focus.";
}

export function isoHint(iso) {
  if (iso == null) return null;
  if (iso <= 400) return "Low: clean image, little grain.";
  if (iso <= 1600) return "Medium: a little grain in the shadows.";
  return "High: shot in low light, visible grain.";
}

export function focalHint(mm) {
  if (mm == null) return null;
  if (mm < 35) return "Wide angle — takes in the whole scene.";
  if (mm <= 70) return "Natural view, close to what the eye sees.";
  if (mm <= 135) return "Short telephoto — flattering for portraits.";
  return "Long telephoto — brings distant subjects close.";
}

export function megapixels(width, height) {
  if (!width || !height) return null;
  return Math.round((width * height) / 100000) / 10;
}

export function printHint(width, height) {
  if (!width || !height) return null;
  // 300 dpi is the usual standard for a sharp print.
  const long = Math.max(width, height) / 300;
  const short = Math.min(width, height) / 300;
  return `Prints sharp up to about ${Math.floor(long)} × ${Math.floor(short)} in.`;
}
