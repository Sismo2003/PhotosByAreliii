// Where a cropped thumbnail (object-cover) keeps its view: the photo's focus point (Photo.focusX /
// focusY, from Backend/services/photo-focus.js or set by hand in the viewer) is placed at the center
// of the box, as far as the photo allows. Without a focus (no face found) the photo stays centered.

const clamp = (n) => Math.min(1, Math.max(0, n));

/**
 * object-position value for `photo` ({ width, height, focusX, focusY }) in a box of
 * `boxAspect` (width / height), or undefined to keep the default center.
 */
export function focusPosition(photo, boxAspect) {
  const W = photo?.width;
  const H = photo?.height;
  if (!W || !H || !boxAspect || photo.focusX == null || photo.focusY == null) return undefined;
  const aspect = W / H;
  const fx = photo.focusX;
  const fy = photo.focusY;
  // With object-cover the photo overflows the box on one axis by `r` (> 1) times the box. Position p
  // moves the photo by p × the overflow; this p puts the focus at the box's middle.
  const axis = (f, r) => (r <= 1.0001 ? 0.5 : clamp((f * r - 0.5) / (r - 1)));
  const x = aspect > boxAspect ? axis(fx, aspect / boxAspect) : 0.5;
  const y = aspect < boxAspect ? axis(fy, boxAspect / aspect) : 0.5;
  return `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`;
}
