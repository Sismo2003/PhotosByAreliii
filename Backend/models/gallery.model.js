// Gallery queries and changes for the admin Galleries page (database/handoff.md §4.7–§4.8,
// docs/almacenamiento-fotos.md, docs/api-galleries.md). A gallery is DRAFT until delivered;
// "expired" is computed (expiresAt in the past), never stored.
//
// Secrets Areli must see again (download PIN, gallery password) are encrypted with
// utils/crypto.js and decrypted only in the admin detail. Every state change writes its
// ActivityEvent in the same transaction.
import { DateTime } from 'luxon';
import prisma from '../config/db.js';
import { STUDIO_ZONE, nowInStudio, toStudio } from '../utils/date.js';
import { decrypt, encrypt, randomPin } from '../utils/crypto.js';
import { clientName } from '../utils/client-name.js';
import { HttpError } from '../utils/http.js';
import { ACTIVE_STATUSES } from '../services/booking-derive.js';
import * as storage from '../services/storage.js';
import { readExif } from '../services/photo-meta.js';
import { rightsFor } from '../services/photo-rights.js';
import { computeFocus } from '../services/photo-focus.js';

const MAX_PAGE_SIZE = 100;
const DEFAULT_SETS = ['Highlights', 'Portraits', 'With family', 'Details', 'Getting ready'];
const AVAILABLE_DAYS = 90; // gallery stays available this long after delivery (handoff §4.7)

const CLIENT_CARD = { select: { id: true, displayName: true, firstName: true, email: true } };
const BOOKING_CARD = { select: { id: true, code: true, serviceNameSnapshot: true, startsAt: true } };

// One "Favorite" per photo, shared by Areli and the client: a gallery belongs to one client, so a row in
// `favorites` for that photo is the heart on both sides. (Photo.keep is no longer read or written.)
const shape = ({ favorites, ...p }) => ({ ...p, favorite: favorites.length > 0 });

const PHOTO_FIELDS = { id: true, originalFilename: true, mimeType: true, sizeBytes: true, width: true, height: true, setId: true, position: true, hidden: true, favorites: { select: { photoId: true }, take: 1 }, focusX: true, focusY: true, focusSource: true, editedAt: true, uploadedAt: true };

const clean = (v) => (typeof v === 'string' ? v.trim() : v);

// "Emily Tran — Graduation" → "emily-tran-graduation"; a number is added when it is taken.
const slugify = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'gallery';

async function uniqueSlug(tx, title) {
  const base = slugify(title);
  for (let n = 1; ; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await tx.gallery.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
}

/** draft | delivered | expired, and the days left while delivered. */
export function galleryState(g, now = nowInStudio()) {
  if (g.status !== 'DELIVERED') return { key: 'draft', daysLeft: null };
  if (!g.expiresAt) return { key: 'delivered', daysLeft: null };
  const expires = toStudio(g.expiresAt);
  if (expires <= now) return { key: 'expired', daysLeft: 0 };
  return { key: 'delivered', daysLeft: Math.round(expires.startOf('day').diff(now.startOf('day'), 'days').days) };
}

const event = (tx, gallery, actorId, type, message, metadata) =>
  tx.activityEvent.create({
    data: { type, actorType: 'ADMIN', actorId, galleryId: gallery.id, clientId: gallery.clientId, bookingId: gallery.bookingId ?? null, message, metadata },
  });

function tabWhere(tab, nowDate) {
  switch (tab) {
    case 'draft':
      return { status: 'DRAFT' };
    case 'delivered':
      return { status: 'DELIVERED', OR: [{ expiresAt: null }, { expiresAt: { gt: nowDate } }] };
    case 'expired':
      return { status: 'DELIVERED', expiresAt: { lte: nowDate } };
    default:
      return {};
  }
}

function searchClause(q) {
  const term = clean(q);
  if (!term) return {};
  return {
    OR: [
      { title: { contains: term } },
      { slug: { contains: term } },
      { client: { displayName: { contains: term } } },
      { client: { email: { contains: term } } },
      { booking: { code: { contains: term } } },
    ],
  };
}

// Photo count and bytes per gallery in one query.
async function totalsFor(ids) {
  const rows = ids.length
    ? await prisma.photo.groupBy({ by: ['galleryId'], where: { galleryId: { in: ids } }, _count: { _all: true }, _sum: { sizeBytes: true } })
    : [];
  return new Map(rows.map((r) => [r.galleryId, { photoCount: r._count._all, sizeBytes: r._sum.sizeBytes ?? 0 }]));
}

const toRow = (g, totals, now) => ({
  id: g.id,
  slug: g.slug,
  title: g.title,
  status: g.status,
  state: galleryState(g, now),
  client: g.client,
  booking: g.booking,
  coverPhotoId: g.coverPhotoId,
  deliveredAt: g.deliveredAt,
  expiresAt: g.expiresAt,
  createdAt: g.createdAt,
  photoCount: totals?.photoCount ?? 0,
  sizeBytes: totals?.sizeBytes ?? 0,
});

class GalleryModel {
  static async summary() {
    const now = nowInStudio();
    const d = now.toJSDate();
    const [counts, sizes, galleryCount] = await Promise.all([
      Promise.all(['all', 'draft', 'delivered', 'expired'].map((tab) => prisma.gallery.count({ where: tabWhere(tab, d) }))),
      prisma.photo.aggregate({ _sum: { sizeBytes: true }, _count: { _all: true } }),
      prisma.gallery.count(),
    ]);
    return {
      counts: { all: counts[0], draft: counts[1], delivered: counts[2], expired: counts[3] },
      photoCount: sizes._count._all,
      photosBytes: sizes._sum.sizeBytes ?? 0,
      galleryCount,
    };
  }

  static async list({ tab = 'all', q, sort = 'newest', page = 1, pageSize = 25 }) {
    const now = nowInStudio();
    const take = Math.min(Math.max(Number(pageSize) || 25, 1), MAX_PAGE_SIZE);
    const currentPage = Math.max(Number(page) || 1, 1);
    const where = { ...tabWhere(tab, now.toJSDate()), ...searchClause(q) };
    const include = { client: CLIENT_CARD, booking: BOOKING_CARD };
    const total = await prisma.gallery.count({ where });

    let rows;
    let totals;
    if (sort === 'size') {
      // Size lives in the photos table: order the whole filtered set in memory, then page it.
      const all = await prisma.gallery.findMany({ where, select: { id: true } });
      const sizes = await totalsFor(all.map((g) => g.id));
      const ids = all
        .map((g) => g.id)
        .sort((a, b) => (sizes.get(b)?.sizeBytes ?? 0) - (sizes.get(a)?.sizeBytes ?? 0) || b - a)
        .slice((currentPage - 1) * take, currentPage * take);
      const found = await prisma.gallery.findMany({ where: { id: { in: ids } }, include });
      rows = ids.map((id) => found.find((g) => g.id === id));
      totals = sizes;
    } else {
      const orderBy = sort === 'title' ? [{ title: 'asc' }, { id: 'asc' }] : sort === 'oldest' ? [{ createdAt: 'asc' }, { id: 'asc' }] : [{ createdAt: 'desc' }, { id: 'desc' }];
      rows = await prisma.gallery.findMany({ where, include, orderBy, skip: (currentPage - 1) * take, take });
      totals = await totalsFor(rows.map((g) => g.id));
    }
    return { items: rows.map((g) => toRow(g, totals.get(g.id), now)), total, page: currentPage, pageSize: take };
  }

  /** Everything the editor needs: settings (with PIN and password in clear), sets, photos. */
  static async get(id) {
    const gallery = await prisma.gallery.findUnique({
      where: { id },
      include: {
        client: CLIENT_CARD,
        booking: BOOKING_CARD,
        sets: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
        photos: {
          // A row whose files are still being written (upload in progress) has empty paths: not shown yet.
          where: { webPath: { not: '' } },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
          select: PHOTO_FIELDS,
        },
      },
    });
    if (!gallery) throw new HttpError(404, 'Gallery not found');
    const { downloadPinEnc, accessPasswordEnc, ...rest } = gallery;
    const favorites = await prisma.favorite.count({ where: { photo: { galleryId: id } } });
    const visits = await prisma.activityEvent.groupBy({
      by: ['type'],
      where: { galleryId: id, type: { in: ['gallery.viewed', 'gallery.downloaded'] } },
      _count: { _all: true },
      _max: { createdAt: true },
    });
    const count = (type) => visits.find((v) => v.type === type)?._count._all ?? 0;
    return {
      ...rest,
      photos: gallery.photos.map(shape),
      downloadPin: decrypt(downloadPinEnc),
      accessPassword: decrypt(accessPasswordEnc),
      state: galleryState(gallery),
      sets: gallery.sets.map((s) => ({ ...s, photoCount: gallery.photos.filter((p) => p.setId === s.id).length })),
      totals: {
        photoCount: gallery.photos.length,
        hiddenCount: gallery.photos.filter((p) => p.hidden).length,
        sizeBytes: gallery.photos.reduce((sum, p) => sum + p.sizeBytes, 0),
      },
      stats: {
        views: count('gallery.viewed'),
        downloads: count('gallery.downloaded'),
        favorites,
        lastVisitAt: visits.find((v) => v.type === 'gallery.viewed')?._max.createdAt ?? null,
      },
    };
  }

  static async activity(id, { limit = 100 } = {}) {
    const gallery = await prisma.gallery.findUnique({ where: { id }, select: { id: true } });
    if (!gallery) throw new HttpError(404, 'Gallery not found');
    return prisma.activityEvent.findMany({
      where: { galleryId: id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: { id: true, type: true, message: true, createdAt: true },
    });
  }

  // "Create from booking" (or from a client). The booking must be the client's and still active.
  static async create({ clientId, bookingId, title, sets }, actorId) {
    const created = await prisma.$transaction(async (tx) => {
      const client = await tx.client.findFirst({ where: { id: clientId, deletedAt: null } });
      if (!client) throw new HttpError(404, 'Client not found');
      let booking = null;
      if (bookingId) {
        booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { gallery: { select: { id: true } } } });
        if (!booking || booking.clientId !== clientId) throw new HttpError(400, 'That booking does not belong to this client');
        if (!ACTIVE_STATUSES.includes(booking.status)) throw new HttpError(409, 'Only confirmed sessions can have a gallery');
        if (booking.gallery) throw new HttpError(409, 'This booking already has a gallery', { galleryId: booking.gallery.id });
      }
      const name = clean(title) || (booking ? `${client.displayName} — ${booking.serviceNameSnapshot}` : `${client.displayName} — Gallery`);
      const names = [...new Set((sets ?? DEFAULT_SETS).map(clean).filter(Boolean))];
      const gallery = await tx.gallery.create({
        data: {
          title: name,
          slug: await uniqueSlug(tx, name),
          clientId,
          bookingId: booking?.id ?? null,
          sets: { create: names.map((n, i) => ({ name: n, position: i })) },
        },
      });
      await event(tx, gallery, actorId, 'gallery.created', `Gallery “${name}” created`, { sets: names });
      return gallery;
    });
    return this.get(created.id);
  }

  static async update(id, input, actorId) {
    await prisma.$transaction(async (tx) => {
      const g = await tx.gallery.findUnique({ where: { id } });
      if (!g) throw new HttpError(404, 'Gallery not found');
      const data = {};
      for (const key of ['coverLayout', 'downloadMode', 'pinRequired', 'privacy', 'favoritesEnabled', 'favoritesLimit', 'watermark', 'socialSharing']) {
        if (input[key] !== undefined) data[key] = input[key];
      }
      if (input.title !== undefined) data.title = clean(input.title);

      const privacy = data.privacy ?? g.privacy;
      if (input.accessPassword !== undefined) data.accessPasswordEnc = encrypt(clean(input.accessPassword));
      if (privacy === 'PASSWORD' && !data.accessPasswordEnc && !g.accessPasswordEnc) {
        throw new HttpError(400, 'Set a gallery password to use “Password”');
      }
      // Favorites only exist with a client login (handoff D4).
      if (privacy !== 'CLIENT_LOGIN') data.favoritesEnabled = false;

      if (input.expiresOn !== undefined) {
        if (g.status !== 'DELIVERED') throw new HttpError(409, 'The expiration date is set when you deliver the gallery');
        const day = DateTime.fromISO(input.expiresOn, { zone: STUDIO_ZONE }).endOf('day');
        if (!day.isValid) throw new HttpError(400, 'Choose a valid date');
        if (day <= nowInStudio()) throw new HttpError(400, 'Choose a date in the future');
        data.expiresAt = day.toUTC().toJSDate();
      }
      // "Create a new download PIN": only when a PIN is in use.
      const pinOn = data.pinRequired ?? g.pinRequired;
      if (pinOn && (input.newPin || (!g.downloadPinEnc && g.status === 'DELIVERED'))) data.downloadPinEnc = encrypt(randomPin());
      if (!pinOn) data.downloadPinEnc = null;

      // Only what actually changes is written (and logged): a PATCH that sets the same value
      // must not leave a "Settings updated" line in the history.
      const same = (a, b) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : (a ?? null) === (b ?? null));
      for (const key of Object.keys(data)) if (same(g[key], data[key])) delete data[key];

      // A new date means a new 48 h notice (same as Extend): without this, a notice that already
      // went out would never be sent again and the photos could be deleted unannounced.
      if (data.expiresAt) data.expiryReminderSentAt = null;

      if (Object.keys(data).length === 0) return;
      await tx.gallery.update({ where: { id }, data });
      const shown = Object.keys(data).filter((k) => !['accessPasswordEnc', 'downloadPinEnc', 'expiryReminderSentAt'].includes(k));
      if (input.newPin) await event(tx, g, actorId, 'gallery.pin_renewed', 'New download PIN created');
      if (shown.length) await event(tx, g, actorId, 'gallery.updated', `Settings updated: ${shown.join(', ')}`, { fields: shown });
    });
    return this.get(id);
  }

  // ---- Sets ----

  static async addSet(galleryId, name, actorId) {
    const gallery = await prisma.gallery.findUnique({ where: { id: galleryId }, include: { sets: true } });
    if (!gallery) throw new HttpError(404, 'Gallery not found');
    const text = clean(name);
    if (gallery.sets.some((s) => s.name.toLowerCase() === text.toLowerCase())) throw new HttpError(409, `There is already a set called “${text}”`);
    await prisma.gallerySet.create({ data: { galleryId, name: text, position: gallery.sets.length } });
    await prisma.activityEvent.create({ data: { type: 'gallery.set_added', actorType: 'ADMIN', actorId, galleryId, clientId: gallery.clientId, message: `Set “${text}” added` } });
    return this.get(galleryId);
  }

  static async updateSet(galleryId, setId, { name, position }) {
    const set = await prisma.gallerySet.findFirst({ where: { id: setId, galleryId } });
    if (!set) throw new HttpError(404, 'Set not found');
    const data = {};
    if (name !== undefined) {
      const text = clean(name);
      const dup = await prisma.gallerySet.findFirst({ where: { galleryId, name: text, NOT: { id: setId } } });
      if (dup) throw new HttpError(409, `There is already a set called “${text}”`);
      data.name = text;
    }
    if (position !== undefined) data.position = position;
    await prisma.gallerySet.update({ where: { id: setId }, data });
    return this.get(galleryId);
  }

  // Photos of a deleted set stay in the gallery, without a set (they still show in "All photos").
  static async removeSet(galleryId, setId, actorId) {
    const set = await prisma.gallerySet.findFirst({ where: { id: setId, galleryId } });
    if (!set) throw new HttpError(404, 'Set not found');
    const gallery = await prisma.gallery.findUnique({ where: { id: galleryId }, select: { clientId: true } });
    await prisma.$transaction([
      prisma.gallerySet.delete({ where: { id: setId } }),
      prisma.activityEvent.create({ data: { type: 'gallery.set_removed', actorType: 'ADMIN', actorId, galleryId, clientId: gallery.clientId, message: `Set “${set.name}” removed` } }),
    ]);
    return this.get(galleryId);
  }

  // ---- Photos ----

  /** Saves already-validated temp files (multer) as photos of the gallery. */
  static async addPhotos(galleryId, files, { setId }) {
    const gallery = await prisma.gallery.findUnique({ where: { id: galleryId } });
    if (!gallery) throw new HttpError(404, 'Gallery not found');
    if (setId != null && !(await prisma.gallerySet.findFirst({ where: { id: setId, galleryId } }))) throw new HttpError(400, 'That set does not belong to this gallery');

    const last = await prisma.photo.aggregate({ where: { galleryId }, _max: { position: true } });
    let position = (last._max.position ?? -1) + 1;
    const created = [];
    const failed = [];
    const rights = rightsFor(gallery);
    for (const file of files) {
      // Row first (the file paths contain its id), files second; both or neither (§5.2 #3).
      const row = await prisma.photo.create({
        data: { galleryId, setId: setId ?? null, originalFilename: file.originalname.slice(0, 190), mimeType: file.mimetype, sizeBytes: file.size, originalPath: '', webPath: '', thumbnailPath: '', position },
      });
      try {
        const saved = await storage.savePhoto({ galleryId, photoId: row.id, tmpFile: file.path, mimeType: file.mimetype, rights });
        // Focus point for cropped thumbnails, from the 480 px thumbnail (~5 ms; null on failure).
        const focus = await computeFocus(storage.absolutePath(saved.thumbnailPath), { detail: storage.absolutePath(saved.webPath) });
        created.push(shape(await prisma.photo.update({ where: { id: row.id }, data: { ...saved, ...focus }, select: PHOTO_FIELDS })));
        position += 1;
      } catch (error) {
        await prisma.photo.delete({ where: { id: row.id } }).catch(() => {});
        await storage.removeTmp(file.path);
        if (error?.code === 'ENOSPC') throw new HttpError(507, 'The photo disk is full', { code: 'STORAGE_FULL', supportEmail: storage.SUPPORT_EMAIL });
        failed.push({ name: file.originalname, reason: 'This file could not be read as an image.' });
      }
    }
    // No ActivityEvent per upload: photos arrive one request at a time and would flood the History.
    return { photos: created, failed };
  }

  static async bulk(galleryId, { action, photoIds, setId }, actorId) {
    const gallery = await prisma.gallery.findUnique({ where: { id: galleryId }, include: { client: { select: { firstName: true, displayName: true } } } });
    if (!gallery) throw new HttpError(404, 'Gallery not found');
    const photos = await prisma.photo.findMany({ where: { galleryId, id: { in: photoIds } }, select: { id: true } });
    if (photos.length !== new Set(photoIds).size) throw new HttpError(400, 'One of the photos is not in this gallery');
    const where = { galleryId, id: { in: photoIds } };
    const n = photos.length;
    const word = n === 1 ? 'photo' : 'photos';

    if (action === 'move') {
      if (setId !== null && !(await prisma.gallerySet.findFirst({ where: { id: setId, galleryId } }))) throw new HttpError(400, 'That set does not belong to this gallery');
      await prisma.photo.updateMany({ where, data: { setId } });
    } else if (action === 'pick' || action === 'unpick') {
      // Same Favorite the client sees (for the gallery's client). A favorite is never hidden. No ActivityEvent.
      const ids = photos.map((p) => p.id);
      await prisma.$transaction(async (tx) => {
        if (action === 'pick') {
          await tx.photo.updateMany({ where, data: { hidden: false } });
          await tx.favorite.createMany({ data: ids.map((photoId) => ({ clientId: gallery.clientId, photoId })), skipDuplicates: true });
        } else {
          await tx.favorite.deleteMany({ where: { clientId: gallery.clientId, photoId: { in: ids } } });
        }
      });
    } else if (action === 'hide' || action === 'show') {
      await prisma.$transaction(async (tx) => {
        await tx.photo.updateMany({ where, data: { hidden: action === 'hide' } });
        if (action === 'hide') await tx.favorite.deleteMany({ where: { photoId: { in: photos.map((p) => p.id) } } });
      });
      await event(prisma, gallery, actorId, `gallery.photos_${action === 'hide' ? 'hidden' : 'shown'}`, `${n} ${word} ${action === 'hide' ? 'hidden from' : 'shown to'} ${clientName(gallery.client)}`);
    } else {
      // Rows first, files after: a failed file delete leaves orphans for the cleaner, never a row without files.
      await prisma.photo.deleteMany({ where });
      await Promise.all(photos.map((p) => storage.removePhoto(galleryId, p.id)));
      await event(prisma, gallery, actorId, 'gallery.photos_deleted', `${n} ${word} deleted`, { count: n });
    }
    return this.get(galleryId);
  }

  static async setCover(galleryId, photoId, actorId) {
    const gallery = await prisma.gallery.findUnique({ where: { id: galleryId } });
    if (!gallery) throw new HttpError(404, 'Gallery not found');
    if (photoId !== null) {
      const photo = await prisma.photo.findFirst({ where: { id: photoId, galleryId } });
      if (!photo) throw new HttpError(400, 'That photo is not in this gallery');
      // coverPhotoId is unique: one photo can only be the cover of one gallery (always true here).
    }
    await prisma.gallery.update({ where: { id: galleryId }, data: { coverPhotoId: photoId } });
    await event(prisma, gallery, actorId, 'gallery.cover_set', photoId === null ? 'Cover cleared' : 'Cover photo changed');
    return this.get(galleryId);
  }

  /** The stored path of one variant, for the file route. 404 when it does not exist. */
  /** Camera data for the viewer. Read from the original the first time, then kept in the row. */
  static async photoInfo(galleryId, photoId) {
    const photo = await prisma.photo.findFirst({ where: { id: photoId, galleryId } });
    if (!photo || !photo.originalPath) throw new HttpError(404, 'Photo not found');
    let exif = photo.exif;
    if (exif == null) {
      exif = await readExif(storage.absolutePath(photo.originalPath));
      await prisma.photo.update({ where: { id: photoId }, data: { exif } });
    }
    return { id: photo.id, filename: photo.originalFilename, mimeType: photo.mimeType, sizeBytes: photo.sizeBytes, width: photo.width, height: photo.height, uploadedAt: photo.uploadedAt, editedAt: photo.editedAt, exif };
  }

  /** Replaces the ORIGINAL with an edited version (rotate / flip / straighten / crop / resize). Admin only. */
  static async editPhoto(galleryId, photoId, ops, actorId) {
    const gallery = await prisma.gallery.findUnique({ where: { id: galleryId } });
    if (!gallery) throw new HttpError(404, 'Gallery not found');
    const photo = await prisma.photo.findFirst({ where: { id: photoId, galleryId } });
    if (!photo || !photo.originalPath) throw new HttpError(404, 'Photo not found');
    // The size is of the photo AFTER rotating: a quarter turn swaps width and height.
    const quarter = Math.abs(ops.rotate) % 180 === 90;
    const [maxW, maxH] = quarter ? [photo.height, photo.width] : [photo.width, photo.height];
    if (ops.resize && ((maxW && ops.resize.width > maxW) || (maxH && ops.resize.height > maxH))) throw new HttpError(400, 'A photo can only be made smaller, never larger');
    // The edited file carries no EXIF of its own: keep the camera data in the row before replacing it.
    const exif = photo.exif ?? (await readExif(storage.absolutePath(photo.originalPath)));
    let saved;
    try {
      saved = await storage.replaceOriginal({ originalPath: photo.originalPath, webPath: photo.webPath, thumbnailPath: photo.thumbnailPath, ops, rights: rightsFor(gallery) });
    } catch (error) {
      if (error?.code === 'ENOSPC') throw new HttpError(507, 'The photo disk is full', { code: 'STORAGE_FULL', supportEmail: storage.SUPPORT_EMAIL });
      throw error;
    }
    // The geometry changed, so the focus is computed again. A point set by hand survives only a resize.
    const onlyResize = !ops.rotate && !ops.straighten && !ops.flipH && !ops.flipV && !ops.crop;
    const focus = photo.focusSource === 'MANUAL' && onlyResize ? {} : ((await computeFocus(storage.absolutePath(photo.thumbnailPath), { detail: storage.absolutePath(photo.webPath) })) ?? { focusX: null, focusY: null, focusSource: null });
    const updated = shape(await prisma.photo.update({ where: { id: photoId }, data: { ...saved, ...focus, exif, editedAt: new Date() }, select: PHOTO_FIELDS }));
    await event(prisma, gallery, actorId, 'gallery.photo_edited', `Original of ${photo.originalFilename} replaced with an edited version`, { photoId });
    return updated;
  }

  /** Focus point set by hand in the viewer ({ x, y } in 0–1), or { reset: true } to go back to the automatic one. */
  static async setPhotoFocus(galleryId, photoId, { x, y, reset }) {
    const photo = await prisma.photo.findFirst({ where: { id: photoId, galleryId } });
    if (!photo || !photo.thumbnailPath) throw new HttpError(404, 'Photo not found');
    const data = reset ? ((await computeFocus(storage.absolutePath(photo.thumbnailPath), { detail: storage.absolutePath(photo.webPath) })) ?? { focusX: null, focusY: null, focusSource: null }) : { focusX: x, focusY: y, focusSource: 'MANUAL' };
    return shape(await prisma.photo.update({ where: { id: photoId }, data, select: PHOTO_FIELDS }));
  }

  static async photoFile(galleryId, photoId, variant) {
    const photo = await prisma.photo.findFirst({ where: { id: photoId, galleryId } });
    if (!photo || !photo.webPath) throw new HttpError(404, 'Photo not found');
    const rel = { thumb: photo.thumbnailPath, web: photo.webPath, original: photo.originalPath }[variant];
    if (!rel) throw new HttpError(404, 'Photo not found');
    return { rel, filename: variant === 'original' ? photo.originalFilename : `${variant}-${photo.originalFilename}`, mimeType: variant === 'original' ? photo.mimeType : 'image/jpeg' };
  }

  // ---- Delivery ----

  // Marks the gallery delivered. Sending the email is the Correos module's job:
  // INTEGRATION(correos) — see docs/galleries-pendientes.md. Resending keeps the same dates and PIN.
  static async deliver(id, { to, subject, message, newPin }, actorId) {
    await prisma.$transaction(async (tx) => {
      const g = await tx.gallery.findUnique({ where: { id }, include: { client: true } });
      if (!g) throw new HttpError(404, 'Gallery not found');
      const visible = await tx.photo.count({ where: { galleryId: id, hidden: false } });
      if (visible === 0) throw new HttpError(409, 'Add at least one visible photo before delivering');
      if (g.privacy === 'PASSWORD' && !g.accessPasswordEnc) throw new HttpError(409, 'Set a gallery password in Settings first');
      const state = galleryState(g);
      if (state.key === 'expired') throw new HttpError(409, 'This gallery expired. Its photos are gone.');

      const now = DateTime.utc();
      const first = g.status !== 'DELIVERED';
      const data = {
        status: 'DELIVERED',
        deliveredAt: g.deliveredAt ?? now.toJSDate(),
        expiresAt: g.expiresAt ?? now.setZone(STUDIO_ZONE).plus({ days: AVAILABLE_DAYS }).endOf('day').toUTC().toJSDate(),
        deliveredToEmail: clean(to) || g.client.email,
        deliverySubject: clean(subject) || null,
        deliveryMessage: clean(message) || null,
      };
      if (g.pinRequired && (newPin || !g.downloadPinEnc)) data.downloadPinEnc = encrypt(randomPin());
      await tx.gallery.update({ where: { id }, data });
      await event(tx, g, actorId, first ? 'gallery.delivered' : 'gallery.redelivered', first ? `Gallery delivered to ${data.deliveredToEmail}` : `Gallery sent again to ${data.deliveredToEmail}`, { to: data.deliveredToEmail });
    });
    return this.get(id);
  }

  // "Extend 30 days" — only before it expires: after that the photos are deleted (D9).
  static async extend(id, { days = 30 }, actorId) {
    await prisma.$transaction(async (tx) => {
      const g = await tx.gallery.findUnique({ where: { id } });
      if (!g) throw new HttpError(404, 'Gallery not found');
      if (g.status !== 'DELIVERED' || !g.expiresAt) throw new HttpError(409, 'Only a delivered gallery has an expiration date');
      if (galleryState(g).key === 'expired') throw new HttpError(409, 'This gallery already expired');
      const next = toStudio(g.expiresAt).plus({ days }).toUTC().toJSDate();
      await tx.gallery.update({ where: { id }, data: { expiresAt: next, expiryReminderSentAt: null } });
      await event(tx, g, actorId, 'gallery.extended', `Gallery extended ${days} days`, { days });
    });
    return this.get(id);
  }

  // Deletes the gallery, its rows and its whole folder. No recycle bin (handoff D9).
  static async remove(id, actorId) {
    const g = await prisma.gallery.findUnique({ where: { id } });
    if (!g) throw new HttpError(404, 'Gallery not found');
    await prisma.$transaction(async (tx) => {
      await tx.gallery.update({ where: { id }, data: { coverPhotoId: null } });
      await tx.photo.deleteMany({ where: { galleryId: id } });
      await tx.gallery.delete({ where: { id } });
      await tx.activityEvent.create({
        data: { type: 'gallery.deleted', actorType: 'ADMIN', actorId, clientId: g.clientId, bookingId: g.bookingId, message: `Gallery “${g.title}” deleted`, metadata: { title: g.title } },
      });
    });
    await storage.removeGallery(id);
    return { id };
  }
}

export default GalleryModel;
