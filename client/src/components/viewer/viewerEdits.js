// Pure helpers of the viewer's edits. Same order the Backend applies (Backend/services/photo-edit.js):
// flip → rotate (90° steps + straighten, trimmed to the largest straight frame) → resize. The client's
// edits are only for the DOWNLOAD (nothing is saved, no crop here). Mirrors the admin's viewerEdits.js.

export const EMPTY_EDITS = {
  rot: 0,
  fine: 0,
  flipH: false,
  flipV: false,
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

/** Size after rotating/straightening — what the Resize panel starts from. */
export function turnedSize(width, height, { rot, fine }) {
  const odd = (turnOf(rot) / 90) % 2 === 1;
  return inscribed(odd ? height : width, odd ? width : height, fine);
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
  turnOf(e.rot) !== 0 || e.fine !== 0 || e.flipH || e.flipV || !!e.resize;

/** Query string of GET …/download-edited (the Backend validates every value again). */
export function editQuery(e) {
  const q = new URLSearchParams();
  if (turnOf(e.rot)) q.set("rotate", String(turnOf(e.rot)));
  if (e.fine) q.set("straighten", String(e.fine));
  if (e.flipH) q.set("flipH", "1");
  if (e.flipV) q.set("flipV", "1");
  if (e.resize) q.set("resize", `${e.resize.width}x${e.resize.height}`);
  return q;
}

export const SIZE_PRESETS = [
  { id: "original", edge: null },
  { id: "web", edge: 2048 },
  { id: "social", edge: 1080 },
];

// Zoom view of ZoomStage: `s` 1 = fit; (cx, cy) the photo point at the stage center, 0–1.
export const FIT_VIEW = { s: 1, cx: 0.5, cy: 0.5 };
export const MAX_ZOOM = 24;
export const clampZoom = (s) => Math.min(MAX_ZOOM, Math.max(1, s));
