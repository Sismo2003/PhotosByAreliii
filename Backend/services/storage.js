// Everything that touches the photo disk lives here (docs/almacenamiento-fotos.md §3–§5, §9), so
// moving to R2 later only changes this file. Files live under STORAGE_PATH:
//   galleries/<galleryId>/<photoId>/{original.<ext>, web.jpg, thumb.jpg}   (opaque ids, no PII)
//   tmp/                                                                   (uploads in progress)
// Nothing here is ever served statically: routes check the admin first.
import fs from 'node:fs/promises';
import path from 'node:path';
import { statfs } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { HttpError } from '../utils/http.js';
import { applyEdits } from './photo-edit.js';
import { stamp } from './photo-rights.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const STORAGE_PATH = path.resolve(process.env.STORAGE_PATH || path.join(here, '..', 'storage'));
export const TMP_PATH = path.join(STORAGE_PATH, 'tmp');
export const RESERVE_BYTES = Number(process.env.STORAGE_RESERVE_BYTES || 500 * 1024 * 1024);
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'soporte@nimbuscloud.mx';
export const MAX_PHOTO_BYTES = 50 * 1024 * 1024;
// Web copy + thumbnail add about 10% on top of the original (§5.1).
const OVERHEAD = 1.1;

// JPG, PNG and WebP are read by sharp's prebuilt binaries. HEIC needs libheif, which they don't
// ship — see docs/galleries-pendientes.md (D-G1).
export const ALLOWED_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

await fs.mkdir(TMP_PATH, { recursive: true });

// Bytes that uploads in progress still have to write. One backend instance, so memory is enough.
let inFlightBytes = 0;
export const reserveBytes = (n) => {
  inFlightBytes += n;
};
export const releaseBytes = (n) => {
  inFlightBytes = Math.max(0, inFlightBytes - n);
};

const levelFor = (freeBytes, freePct) => {
  if (freeBytes <= RESERVE_BYTES) return 'FULL';
  if (freePct < 30) return 'CRITICAL';
  if (freePct <= 60) return 'LOW';
  return 'OK';
};

/** Real numbers from the file system of the photo folder (§4.1). */
export async function diskStatus() {
  const s = await statfs(STORAGE_PATH);
  const totalBytes = s.blocks * s.bsize;
  const freeBytes = s.bavail * s.bsize;
  const freePct = totalBytes ? (freeBytes / totalBytes) * 100 : 0;
  const level = levelFor(freeBytes, freePct);
  return {
    totalBytes,
    freeBytes,
    usableBytes: Math.max(0, freeBytes - inFlightBytes - RESERVE_BYTES),
    freePct: Math.round(freePct * 10) / 10,
    level,
    uploadsBlocked: level === 'FULL',
    reserveBytes: RESERVE_BYTES,
    supportEmail: SUPPORT_EMAIL,
  };
}

/** The 507 of §5.4 — null when `bytes` of originals fit with more than RESERVE_BYTES left over. */
export async function storageProblem(bytes) {
  const status = await diskStatus();
  const needed = Math.ceil(bytes * OVERHEAD);
  if (status.level === 'FULL' || status.freeBytes - inFlightBytes - needed <= RESERVE_BYTES) {
    return new HttpError(507, 'Not enough space to upload these photos.', {
      code: 'STORAGE_FULL',
      neededBytes: needed,
      usableBytes: status.usableBytes,
      freeBytes: status.freeBytes,
      level: status.level,
      supportEmail: SUPPORT_EMAIL,
    });
  }
  return null;
}

const galleryDir = (galleryId) => path.join('galleries', String(galleryId));
const photoDir = (galleryId, photoId) => path.join(galleryDir(galleryId), String(photoId));
const abs = (rel) => path.join(STORAGE_PATH, rel);

/** What sharp says about the original, with the EXIF rotation applied to width/height. */
async function inspect(file) {
  const meta = await sharp(file, { failOn: 'none' }).metadata();
  const swap = (meta.orientation ?? 1) >= 5;
  return { width: swap ? meta.height : meta.width, height: swap ? meta.width : meta.height };
}

/**
 * Moves the uploaded temp file into the photo's folder and makes the web copy (2048 px long
 * edge, JPEG) and the thumbnail (480 px). Returns the relative paths + size and dimensions.
 * On any failure the half-written folder is removed before the error goes up.
 */
export async function savePhoto({ galleryId, photoId, tmpFile, mimeType, rights }) {
  const dir = photoDir(galleryId, photoId);
  const ext = ALLOWED_TYPES[mimeType] ?? 'jpg';
  const paths = { originalPath: path.join(dir, `original.${ext}`), webPath: path.join(dir, 'web.jpg'), thumbnailPath: path.join(dir, 'thumb.jpg') };
  try {
    await fs.mkdir(abs(dir), { recursive: true });
    const dims = await inspect(tmpFile);
    await stamp(sharp(tmpFile, { failOn: 'none' }).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }), rights).jpeg({ quality: 82, mozjpeg: true }).toFile(abs(paths.webPath));
    await stamp(sharp(tmpFile, { failOn: 'none' }).rotate().resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true }), rights).jpeg({ quality: 76 }).toFile(abs(paths.thumbnailPath));
    // rename is atomic when tmp/ and galleries/ share a file system (they do: both under STORAGE_PATH).
    await fs.rename(tmpFile, abs(paths.originalPath));
    return { ...paths, ...dims };
  } catch (error) {
    await fs.rm(abs(dir), { recursive: true, force: true });
    throw error;
  }
}

/**
 * Applies the viewer's edits (services/photo-edit.js) to the original and rebuilds the web copy and
 * thumbnail from the result. Everything is written to tmp/ first; the original is only replaced
 * (atomic rename) once all three files exist, so a failure leaves the photo untouched.
 */
export async function replaceOriginal({ originalPath, webPath, thumbnailPath, ops, rights }) {
  const ext = path.extname(originalPath).slice(1).toLowerCase() || 'jpg';
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmp = { original: path.join(TMP_PATH, `edit-${tag}.${ext}`), web: path.join(TMP_PATH, `edit-${tag}-web.jpg`), thumb: path.join(TMP_PATH, `edit-${tag}-thumb.jpg`) };
  try {
    await applyEdits(abs(originalPath), tmp.original, ext, ops, rights);
    await stamp(sharp(tmp.original).resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }), rights).jpeg({ quality: 82, mozjpeg: true }).toFile(tmp.web);
    await stamp(sharp(tmp.original).resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true }), rights).jpeg({ quality: 76 }).toFile(tmp.thumb);
    const dims = await inspect(tmp.original);
    const { size } = await fs.stat(tmp.original);
    await fs.rename(tmp.web, abs(webPath));
    await fs.rename(tmp.thumb, abs(thumbnailPath));
    await fs.rename(tmp.original, abs(originalPath));
    return { ...dims, sizeBytes: size };
  } finally {
    await Promise.all(Object.values(tmp).map((f) => fs.rm(f, { force: true })));
  }
}

export const removeTmp = (file) => fs.rm(file, { force: true });
export const removePhoto = (galleryId, photoId) => fs.rm(abs(photoDir(galleryId, photoId)), { recursive: true, force: true });
export const removeGallery = (galleryId) => fs.rm(abs(galleryDir(galleryId)), { recursive: true, force: true });

/** Bytes a folder really takes on disk (allocated blocks, so small thumbnails count fully). */
async function folderBytes(dir) {
  let bytes = 0;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) bytes += await folderBytes(full);
    else if (entry.isFile()) {
      const st = await fs.stat(full);
      bytes += st.blocks ? st.blocks * 512 : st.size;
    }
  }
  return bytes;
}

/** Map galleryId → bytes on disk, one entry per folder under galleries/ (Overview pie). */
export async function galleryDiskUsage() {
  const root = abs('galleries');
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const usage = new Map();
  for (const entry of entries) {
    const id = Number(entry.name);
    if (!entry.isDirectory() || !Number.isInteger(id)) continue;
    usage.set(id, await folderBytes(path.join(root, entry.name)));
  }
  return usage;
}

/** Absolute path of a stored file (only ever built from a database path). */
export const absolutePath = (rel) => abs(rel);
