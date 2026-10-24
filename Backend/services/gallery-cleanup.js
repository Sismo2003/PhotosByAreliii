// Housekeeping of the photo disk (docs/almacenamiento-fotos.md §9), run at boot and every hour:
//   1. tmp/ files older than 24 h (interrupted uploads);
//   2. gallery and photo folders that no longer have a database row (leftovers of a failed delete);
//   3. expired galleries: delete their photos and fill photosDeletedAt (handoff D9) — ONLY when
//      GALLERY_AUTO_DELETE=1. It is off by default because the 48-hour warning email (Correos)
//      does not exist yet; turn it on together with that module (docs/galleries-pendientes.md).
import fs from 'node:fs/promises';
import path from 'node:path';
import { DateTime } from 'luxon';
import prisma from '../config/db.js';
import { STORAGE_PATH, TMP_PATH, removeGallery } from './storage.js';

const DAY = 24 * 60 * 60 * 1000;
const numericDirs = async (dir) => {
  try {
    return (await fs.readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory() && /^\d+$/.test(e.name)).map((e) => Number(e.name));
  } catch {
    return [];
  }
};

async function cleanTmp() {
  let removed = 0;
  for (const name of await fs.readdir(TMP_PATH).catch(() => [])) {
    const file = path.join(TMP_PATH, name);
    const stat = await fs.stat(file).catch(() => null);
    if (stat && Date.now() - stat.mtimeMs > DAY) {
      await fs.rm(file, { force: true });
      removed += 1;
    }
  }
  return removed;
}

async function cleanOrphans() {
  let removed = 0;
  const root = path.join(STORAGE_PATH, 'galleries');
  const galleryIds = await numericDirs(root);
  const known = new Set((await prisma.gallery.findMany({ where: { id: { in: galleryIds } }, select: { id: true } })).map((g) => g.id));
  for (const id of galleryIds) {
    if (!known.has(id)) {
      await removeGallery(id);
      removed += 1;
      continue;
    }
    const photoIds = await numericDirs(path.join(root, String(id)));
    const rows = new Set((await prisma.photo.findMany({ where: { galleryId: id, id: { in: photoIds } }, select: { id: true } })).map((p) => p.id));
    for (const photoId of photoIds) {
      if (!rows.has(photoId)) {
        await fs.rm(path.join(root, String(id), String(photoId)), { recursive: true, force: true });
        removed += 1;
      }
    }
  }
  return removed;
}

async function expireGalleries() {
  if (process.env.GALLERY_AUTO_DELETE !== '1') return 0;
  const expired = await prisma.gallery.findMany({
    where: { status: 'DELIVERED', expiresAt: { lte: DateTime.utc().toJSDate() }, photosDeletedAt: null },
    select: { id: true, clientId: true, bookingId: true, title: true },
  });
  for (const g of expired) {
    await prisma.$transaction(async (tx) => {
      await tx.gallery.update({ where: { id: g.id }, data: { coverPhotoId: null, photosDeletedAt: DateTime.utc().toJSDate() } });
      await tx.photo.deleteMany({ where: { galleryId: g.id } });
      await tx.activityEvent.create({
        data: { type: 'gallery.photos_expired', actorType: 'SYSTEM', galleryId: g.id, clientId: g.clientId, bookingId: g.bookingId, message: 'Gallery photos deleted automatically (expired)' },
      });
    });
    await removeGallery(g.id);
  }
  return expired.length;
}

export async function runCleanup() {
  try {
    const [tmp, orphans, expired] = [await cleanTmp(), await cleanOrphans(), await expireGalleries()];
    if (tmp || orphans || expired) console.log(`[cleanup] tmp files: ${tmp}, orphan folders: ${orphans}, expired galleries: ${expired}`);
  } catch (error) {
    console.error('[cleanup] failed', error);
  }
}

export function startCleanup() {
  runCleanup();
  setInterval(runCleanup, 60 * 60 * 1000).unref();
}
