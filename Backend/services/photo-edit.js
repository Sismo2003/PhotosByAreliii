// Basic edits applied to the ORIGINAL, in this fixed order (the viewer previews the same order):
//   auto-orient → flip → rotate (90° steps + straighten, trimmed to the largest straight frame)
//   → crop (fractions of the result so far) → resize (never enlarges).
// Each step goes through a raw buffer so the order never depends on how sharp chains operations.
import sharp from 'sharp';

import { stamp } from './photo-rights.js';

/** Largest rectangle with the same shape as w×h that fits inside w×h turned by `deg` degrees. */
export function inscribed(w, h, deg) {
  const t = (Math.abs(deg) * Math.PI) / 180;
  if (!t) return { width: w, height: h };
  const ratio = Math.max(w / h, h / w);
  const k = 1 / (Math.cos(t) + Math.sin(t) * ratio);
  return { width: Math.max(1, Math.floor(w * k)), height: Math.max(1, Math.floor(h * k)) };
}

async function raw(img) {
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });
}

/**
 * ops: { rotate (multiple of 90), straighten (−15..15), flipH, flipV, crop {x,y,width,height}|null,
 *        resize {width,height}|null }. Writes the result to `outFile` in the original's format.
 */
export async function applyEdits(inFile, outFile, ext, ops, rights) {
  let img = await raw(sharp(inFile, { failOn: 'none' }).rotate());
  if (ops.flipV) img = await raw(img.flip());
  if (ops.flipH) img = await raw(img.flop());
  const turn = ((ops.rotate % 360) + 360) % 360;
  if (turn) img = await raw(img.rotate(turn));
  if (ops.straighten) {
    const before = await img.metadata();
    const turned = await raw(img.rotate(ops.straighten, { background: { r: 0, g: 0, b: 0, alpha: 0 } }));
    const after = await turned.metadata();
    const box = inscribed(before.width, before.height, ops.straighten);
    img = await raw(turned.extract({ left: Math.max(0, Math.floor((after.width - box.width) / 2)), top: Math.max(0, Math.floor((after.height - box.height) / 2)), width: Math.min(box.width, after.width), height: Math.min(box.height, after.height) }));
  }
  let { width, height } = await img.metadata();
  if (ops.crop) {
    const left = Math.min(width - 1, Math.max(0, Math.round(ops.crop.x * width)));
    const top = Math.min(height - 1, Math.max(0, Math.round(ops.crop.y * height)));
    img = await raw(img.extract({ left, top, width: Math.max(1, Math.min(width - left, Math.round(ops.crop.width * width))), height: Math.max(1, Math.min(height - top, Math.round(ops.crop.height * height))) }));
    ({ width, height } = await img.metadata());
  }
  if (ops.resize) img = img.resize({ width: ops.resize.width, height: ops.resize.height, fit: 'fill', withoutEnlargement: true });
  // The camera EXIF is not carried over (the database keeps it in Photo.exif); only the rights are written.
  const out = stamp(img, rights);
  if (ext === 'png') await out.png({ compressionLevel: 9 }).toFile(outFile);
  else if (ext === 'webp') await out.webp({ quality: 92 }).toFile(outFile);
  else await out.jpeg({ quality: 92, mozjpeg: true }).toFile(outFile);
}
