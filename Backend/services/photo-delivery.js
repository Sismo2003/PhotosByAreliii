// What a client takes home: the original at full quality with Areli's rights written into the file
// (exiftool, no re-encode, camera data and GPS kept), or the web copy. Also the streaming ZIP.
// Originals are copied to tmp/ first so the stored file is never touched.
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ZipArchive } from 'archiver';
import { exiftool } from 'exiftool-vendored';
import { applyEdits } from './photo-edit.js';
import { rightsFor, rightsTags } from './photo-rights.js';
import { STORAGE_PATH, TMP_PATH } from './storage.js';

/** { path, cleanup } — a temp copy of the original with the rights written. */
export async function stampedOriginal(gallery, originalRel) {
  const ext = path.extname(originalRel) || '.jpg';
  const tmp = path.join(TMP_PATH, `dl-${randomUUID()}${ext}`);
  const cleanup = () => fs.promises.rm(tmp, { force: true }).catch(() => {});
  try {
    await fs.promises.copyFile(path.join(STORAGE_PATH, originalRel), tmp);
    await exiftool.write(tmp, rightsTags(gallery), { writeArgs: ['-overwrite_original'] });
    return { path: tmp, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

/** "IMG_01.jpg" twice in one gallery → "IMG_01.jpg", "IMG_01 (2).jpg". */
function uniqueNames(names) {
  const seen = new Map();
  return names.map((name) => {
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    if (n === 1) return name;
    const ext = path.extname(name);
    return `${name.slice(0, name.length - ext.length)} (${n})${ext}`;
  });
}

/**
 * Streams a ZIP of `photos` ([{ originalFilename, originalPath, webPath }]) into `res`.
 * quality 'original' stamps each file one at a time (bounded memory and disk); 'web' sends the web copy.
 * JPEG/PNG/WebP are already compressed, so entries are stored, not deflated (no CPU spent).
 */
export async function streamZip(res, { gallery, photos, quality, filename }) {
  const archive = new ZipArchive({ store: true });
  let aborted = false;
  const names = uniqueNames(photos.map((p) => (quality === 'web' ? p.originalFilename.replace(/\.[^.]+$/, '') + '.jpg' : p.originalFilename)));

  res.on('close', () => {
    if (!res.writableFinished) {
      aborted = true;
      archive.abort();
    }
  });
  archive.on('warning', (w) => w.code !== 'ENOENT' && console.error(w));
  archive.on('error', (e) => {
    aborted = true;
    console.error(e);
    res.destroy(e);
  });

  res.set({ 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  archive.pipe(res);

  for (let i = 0; i < photos.length && !aborted; i++) {
    const photo = photos[i];
    if (quality === 'web') {
      archive.file(path.join(STORAGE_PATH, photo.webPath), { name: names[i] });
      continue;
    }
    const copy = await stampedOriginal(gallery, photo.originalPath);
    const entry = new Promise((resolve) => archive.once('entry', resolve));
    archive.file(copy.path, { name: names[i] });
    await Promise.race([entry, new Promise((r) => res.once('close', r))]);
    await copy.cleanup();
  }
  if (!aborted) await archive.finalize();
}

// What an edited copy keeps from the camera's file (the rest — thumbnails, orientation, sizes — is wrong after an edit).
const KEEP_FROM_ORIGINAL = ['-GPS:all', '-Make', '-Model', '-LensMake', '-LensModel', '-ExposureTime', '-FNumber', '-ISO', '-FocalLength', '-FocalLengthIn35mmFormat', '-DateTimeOriginal', '-CreateDate', '-ExposureProgram', '-ExposureCompensation', '-Flash', '-WhiteBalance', '-MeteringMode'];

/**
 * The client's own edit of an original (rotate / flip / straighten / resize), made on the fly into
 * tmp/ and never stored: sharp applies the edit, exiftool puts back the camera data and GPS and
 * writes Areli's rights. `ops` is already validated (Backend/controllers/client-portal.controller.js).
 */
export async function editedOriginal(gallery, originalRel, ops) {
  const ext = path.extname(originalRel).slice(1).toLowerCase() || 'jpg';
  const src = path.join(STORAGE_PATH, originalRel);
  const out = path.join(TMP_PATH, `ed-${randomUUID()}.${ext}`);
  const cleanup = () => fs.promises.rm(out, { force: true }).catch(() => {});
  try {
    await applyEdits(src, out, ext, ops, rightsFor(gallery));
    // PNG / WebP carry little or no camera data: a failed copy is not a failed download.
    await exiftool.write(out, {}, { writeArgs: ['-overwrite_original', '-TagsFromFile', src, ...KEEP_FROM_ORIGINAL] }).catch(() => {});
    await exiftool.write(out, rightsTags(gallery), { writeArgs: ['-overwrite_original'] });
    return { path: out, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
