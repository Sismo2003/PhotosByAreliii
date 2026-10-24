// Pure helpers of the photo viewer's edits. The order is the same one the Backend applies
// (Backend/services/photo-edit.js): flip → rotate (90° steps + straighten, trimmed to the largest
// straight frame) → crop → resize. Crop is stored as fractions (0–1) of the image after rotating.

export const EMPTY_EDITS = {
  rot: 0,
  fine: 0,
  flipH: false,
  flipV: false,
  crop: null,
  resize: null,
};

export const turnOf = (rot) => ((rot % 360) + 360) % 360;

/** Largest rectangle with the shape of w×h that fits inside w×h turned by `deg` degrees. */
export function inscribed(w, h, deg) {
  const t = (Math.abs(deg) * Math.PI) / 180;
  if (!t) return { width: w, height: h };
  const k = 1 / (Math.cos(t) + Math.sin(t) * Math.max(w / h, h / w));
  return {
    width: Math.max(1, Math.floor(w * k)),
    height: Math.max(1, Math.floor(h * k)),
  };
}

/** Size of the photo after rotating/straightening (before crop and resize). */
export function turnedSize(width, height, { rot, fine }) {
  const odd = (turnOf(rot) / 90) % 2 === 1;
  const w = odd ? height : width;
  const h = odd ? width : height;
  return inscribed(w, h, fine);
}

/** Size after rotating and cropping — what the Resize panel starts from. */
export function croppedSize(width, height, edits) {
  const base = turnedSize(width, height, edits);
  if (!edits.crop) return base;
  return {
    width: Math.max(1, Math.round(base.width * edits.crop.width)),
    height: Math.max(1, Math.round(base.height * edits.crop.height)),
  };
}

/**
 * Flip what the viewer SEES (after rotating), not the file before it: the stored order stays
 * flip → rotate (Backend), so mirroring the result means mirroring first and turning the other way
 * (S·R(θ) = R(−θ)·S). Without this, "Flip ↔" after "Left 90°" mirrored the wrong axis.
 */
export const flipVisual = (e, axis) => ({
  [axis]: !e[axis],
  rot: -e.rot || 0,
  fine: -e.fine || 0,
});

/**
 * CSS transform that draws the stored edit (flip → rotate) on an <img>: GPU-fast, so the Straighten
 * slider follows the finger. A single flip turns the other way on screen; two flips are a 180° turn.
 */
export function cssTransform({ rot, fine, flipH, flipV }) {
  const turn = rot + fine;
  const deg = flipH !== flipV ? -turn : turn;
  return `translate(-50%, -50%) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1}) rotate(${deg}deg)`;
}

export const hasEdits = (e) =>
  turnOf(e.rot) !== 0 ||
  e.fine !== 0 ||
  e.flipH ||
  e.flipV ||
  !!e.crop ||
  !!e.resize;

/** Plain words for the confirmation: "Rotated 90° · Cropped · Resized to 2048 × 1365 px". */
export function describeEdits(e) {
  const out = [];
  if (turnOf(e.rot)) out.push(`Rotated ${turnOf(e.rot)}°`);
  if (e.fine) out.push(`Straightened ${e.fine.toFixed(1)}°`);
  if (e.flipH) out.push("Flipped left–right");
  if (e.flipV) out.push("Flipped top–bottom");
  if (e.crop) out.push("Cropped");
  if (e.resize)
    out.push(`Resized to ${e.resize.width} × ${e.resize.height} px`);
  return out;
}

const unit = (n) => Math.min(1, Math.max(0, Math.round(n * 1e6) / 1e6));

/** react-image-crop can return 100.0000001 % — keep the crop inside 0–1, as the Backend checks. */
function cleanCrop(c) {
  if (!c) return null;
  const x = unit(c.x);
  const y = unit(c.y);
  return {
    x,
    y,
    width: Math.min(unit(c.width), 1 - x),
    height: Math.min(unit(c.height), 1 - y),
  };
}

/** Body of POST /photos/:id/edit. */
export const toPayload = (e) => ({
  rotate: turnOf(e.rot),
  straighten: e.fine,
  flipH: e.flipH,
  flipV: e.flipV,
  crop: cleanCrop(e.crop),
  resize: e.resize,
});

export const RATIOS = [
  { id: "free", label: "Free", value: undefined },
  { id: "1:1", label: "1:1", value: 1 },
  { id: "4:5", label: "4:5", value: 4 / 5 },
  { id: "3:2", label: "3:2", value: 3 / 2 },
  { id: "16:9", label: "16:9", value: 16 / 9 },
];

export const SIZE_PRESETS = [
  { id: "original", label: "Original", edge: null },
  { id: "web", label: "Web 2048", edge: 2048 },
  { id: "social", label: "Social 1080", edge: 1080 },
];

// Zoom view of ZoomStage: `s` 1 = fit; (cx, cy) the photo point at the stage center, 0–1.
export const FIT_VIEW = { s: 1, cx: 0.5, cy: 0.5 };
export const MAX_ZOOM = 24;
export const clampZoom = (s) => Math.min(MAX_ZOOM, Math.max(1, s));
