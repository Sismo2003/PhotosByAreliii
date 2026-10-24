// Focus point of a photo: where a cropped thumbnail (object-cover) should keep its view, so a
// vertical portrait shows the face and not the body. Computed once per photo (upload, edit,
// Backend/scripts/compute-focus.js) and stored as fractions in Photo.focusX / focusY.
//
// 1. Faces: UltraFace RFB-320 (Backend/ml/ultraface-rfb-320.onnx, 1.2 MB, MIT —
//    github.com/Linzaer/Ultra-Light-Fast-Generic-Face-Detector-1MB) on onnxruntime-node, CPU.
//    Only boxes are used; nothing that identifies a person is computed or stored.
//    No face in the thumbnail: the web copy is scanned in tiles for small faces.
// 2. Still no face: null, and the thumbnail stays centered (the user's call, 2026-10-05, over
//    guessing an "interesting area"). FocusSource.SALIENCY is kept in the enum, unused.
// Never throws: on any failure it returns null and the UI keeps its fallback.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const MODEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'ml', 'ultraface-rfb-320.onnx');
const IN_W = 320;
const IN_H = 240;
const MIN_SCORE = 0.7;
const NMS_IOU = 0.3;
const MIN_SCORE_TILE = 0.85; // stricter on tiles: more, smaller looks at the photo, more chances of noise
const MAX_TILE_FACE = 0.07; // of the photo's side: bigger ones are the whole-photo pass's job
const TILE_W = 640;
const TILE_H = 480;
const MIN_FACE = 0.00012; // of the photo's area (~1 % of its side): smaller "faces" are noise
const KEEP_RATIO = 0.2; // faces smaller than 20 % of the biggest one (posters, phone screens, background) are dropped

/** Size as displayed (EXIF rotation applied). */
async function dims(input) {
  const m = await sharp(input, { failOn: 'none' }).metadata();
  return (m.orientation ?? 1) >= 5 ? { width: m.height, height: m.width } : { width: m.width, height: m.height };
}

let session; // loaded on first use and reused
async function model() {
  if (!session) {
    session = (async () => {
      const ort = await import('onnxruntime-node');
      const s = await ort.InferenceSession.create(MODEL, { logSeverityLevel: 3 });
      return { ort, s };
    })();
  }
  return session;
}

const iou = (a, b) => {
  const w = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const h = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const inter = w * h;
  return inter / ((a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter || 1);
};

const nms = (list) => {
  const sorted = [...list].sort((a, b) => b.score - a.score);
  const kept = [];
  for (const b of sorted) if (kept.every((k) => iou(k, b) < NMS_IOU)) kept.push(b);
  return kept;
};

/**
 * Runs the model on one image (a sharp pipeline of `width`×`height`), letterboxed into its 320×240
 * frame (no stretching, so a vertical photo keeps its faces' shape). Boxes in fractions of that image.
 */
async function detect(img, width, height, minScore) {
  const { ort, s } = await model();
  const k = Math.min(IN_W / width, IN_H / height);
  const w = Math.max(1, Math.round(width * k));
  const h = Math.max(1, Math.round(height * k));
  const left = Math.floor((IN_W - w) / 2);
  const top = Math.floor((IN_H - h) / 2);
  const { data } = await img
    .resize(w, h, { fit: 'fill' })
    .removeAlpha()
    .extend({ left, top, right: IN_W - w - left, bottom: IN_H - h - top, background: { r: 127, g: 127, b: 127 } })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // HWC uint8 → CHW float, (v − 127) / 128 as the model was trained.
  const plane = IN_W * IN_H;
  const chw = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i += 1) {
    chw[i] = (data[i * 3] - 127) / 128;
    chw[plane + i] = (data[i * 3 + 1] - 127) / 128;
    chw[2 * plane + i] = (data[i * 3 + 2] - 127) / 128;
  }
  const out = await s.run({ input: new ort.Tensor('float32', chw, [1, 3, IN_H, IN_W]) });
  const scores = out.scores.data;
  const boxes = out.boxes.data;

  // Boxes come in fractions of the 320×240 frame: back to fractions of the image.
  const toX = (v) => Math.min(1, Math.max(0, (v * IN_W - left) / w));
  const toY = (v) => Math.min(1, Math.max(0, (v * IN_H - top) / h));
  const found = [];
  for (let i = 0; i < scores.length / 2; i += 1) {
    const score = scores[i * 2 + 1];
    if (score < minScore) continue;
    const b = { x1: toX(boxes[i * 4]), y1: toY(boxes[i * 4 + 1]), x2: toX(boxes[i * 4 + 2]), y2: toY(boxes[i * 4 + 3]), score };
    if (b.x2 > b.x1 && b.y2 > b.y1) found.push(b);
  }
  return nms(found);
}

/** Faces in the whole photo, in fractions of it. */
async function faces(input) {
  const { width, height } = await dims(input);
  return detect(sharp(input, { failOn: 'none' }).rotate(), width, height, MIN_SCORE);
}

/**
 * Small faces (a couple in a landscape): the bigger copy is scanned in overlapping 640×480 tiles,
 * so a face of ~1 % of the photo's side still reaches the model at a size it sees. ~15–20 runs.
 */
async function smallFaces(input) {
  const { data, info } = await sharp(input, { failOn: 'none' }).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const tw = Math.min(W, TILE_W);
  const th = Math.min(H, TILE_H);
  const steps = (size, tile) => {
    const n = Math.max(1, Math.ceil((size - tile) / (tile * 0.75)) + 1);
    return Array.from({ length: n }, (_, i) => (n === 1 ? 0 : Math.round(((size - tile) * i) / (n - 1))));
  };
  const found = [];
  for (const top of steps(H, th)) {
    for (const left of steps(W, tw)) {
      const tile = sharp(data, { raw: { width: W, height: H, channels: 3 } }).extract({ left, top, width: tw, height: th });
      for (const b of await detect(tile, tw, th, MIN_SCORE_TILE)) {
        found.push({ x1: (left + b.x1 * tw) / W, y1: (top + b.y1 * th) / H, x2: (left + b.x2 * tw) / W, y2: (top + b.y2 * th) / H, score: b.score });
      }
    }
  }
  // A face this big would already have shown in the whole-photo pass: on tiles it is noise (a dress, a hand).
  return nms(found).filter((f) => f.x2 - f.x1 < MAX_TILE_FACE && f.y2 - f.y1 < MAX_TILE_FACE);
}

/** Where the faces are: center of the box around all of them (couples, families). */
function focusOfFaces(list) {
  const area = (b) => (b.x2 - b.x1) * (b.y2 - b.y1);
  const big = list.filter((b) => area(b) >= MIN_FACE);
  if (!big.length) return null;
  const top = Math.max(...big.map(area));
  const main = big.filter((b) => area(b) >= top * KEEP_RATIO);
  const x1 = Math.min(...main.map((b) => b.x1));
  const x2 = Math.max(...main.map((b) => b.x2));
  const y1 = Math.min(...main.map((b) => b.y1));
  const y2 = Math.max(...main.map((b) => b.y2));
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2, faces: main.length };
}

const unit = (n) => Math.round(Math.min(1, Math.max(0, n)) * 10000) / 10000;

/**
 * { focusX, focusY, focusSource } for Prisma, or null (no face: keep the photo centered). `input` (file path or buffer) is the 480 px
 * thumbnail; `detail`, the 2048 px web copy, is scanned in tiles only when the thumbnail shows no face.
 */
export async function computeFocus(input, { detail } = {}) {
  try {
    const f = focusOfFaces(await faces(input)) ?? (detail ? focusOfFaces(await smallFaces(detail)) : null);
    if (f) return { focusX: unit(f.x), focusY: unit(f.y), focusSource: 'FACE' };
  } catch (error) {
    console.warn('[photo-focus] face detection failed:', error?.message);
  }
  return null;
}
