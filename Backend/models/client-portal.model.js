// Client portal queries (/api/client/*, docs/portal-cliente-plan.md). Read-only for now: the client
// signs in and sees the galleries that are still available.
//
// Every query is built on `galleryScope(scope)` so a gallery and its photos are fetched together with
// the ownership check in ONE query (no "load, then check" window). Anything that isn't theirs, isn't
// delivered, expired, or is hidden answers 404 — the same as something that doesn't exist.
import { DateTime } from 'luxon';
import prisma from '../config/db.js';
import { HttpError } from '../utils/http.js';
import { formatPhone } from '../utils/phone.js';
import { clientName } from '../utils/client-name.js';
import GalleryModel, { galleryState } from './gallery.model.js';
import { OWNER, USAGE_TERMS, licenseeOf } from '../services/photo-rights.js';
import { nowInStudio, toStudio } from '../utils/date.js';
import { ACTIVE_STATUSES, deriveContext, isActive, isPastSession, paidCents } from '../services/booking-derive.js';
import { BRAND, CONTACT } from '../../shared/site.js';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 60;
const MAX_ZIP_PHOTOS = 2000;
const STRIP_SIZE = 3; // small photos under each gallery cover
const VIEW_EVENT_GAP_MINUTES = 30; // one "viewed" event per visit, not per page load

// Only what the portal shows. Never paths, `hidden`, `keep` or Areli's focus source.
const PHOTO_FIELDS = { id: true, originalFilename: true, width: true, height: true, focusX: true, focusY: true, setId: true, editedAt: true };
const COVER_FIELDS = { id: true, width: true, height: true, focusX: true, focusY: true, editedAt: true, hidden: true };

const nowUtc = () => DateTime.utc().toJSDate();

/** Galleries this scope may open. Preview (Areli) also sees drafts, to check them before delivering. */
function galleryScope(scope, now = nowUtc()) {
  return {
    clientId: scope.clientId,
    privacy: 'CLIENT_LOGIN',
    photosDeletedAt: null,
    ...(scope.preview ? {} : { status: 'DELIVERED' }),
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

function expiredWhere(scope, now = nowUtc()) {
  return { clientId: scope.clientId, privacy: 'CLIENT_LOGIN', status: 'DELIVERED', expiresAt: { lte: now } };
}

const photoOut = (p) => (p ? { id: p.id, width: p.width, height: p.height, focusX: p.focusX, focusY: p.focusY, version: p.editedAt } : null);

const visible = { hidden: false };

// ─── Bookings and payments ───────────────────────────────────────────────────────────────────────
// DECLINED and EXPIRED requests never became sessions: the client never sees them (Alexis, 2026-10-19).
// Every booking query goes through `bookingScope(scope)` (AND-ed with the screen's own filter), the
// same way galleries go through `galleryScope`: changing what clients see is one line here.
const CLIENT_BOOKING_STATUSES = ['REQUEST', 'AWAITING_DEPOSIT', 'CONFIRMED', 'CANCELLED'];
const BOOKING_PAGE_SIZE = 20;
const MAX_UPCOMING = 20;
const MAX_PAYMENT_BOOKINGS = 100; // a client has a handful; this only bounds the query

function bookingScope(scope) {
  return { clientId: scope.clientId, status: { in: CLIENT_BOOKING_STATUSES } };
}

// Only what the portal shows. Never privateNotes, contact*, match fields, doNotPostNotes or cancel internals.
const BOOKING_FIELDS = {
  id: true, code: true, status: true, startsAt: true, durationMinutes: true,
  serviceNameSnapshot: true, packageNameSnapshot: true, locationKind: true, locationName: true, locationAddress: true,
};

/** requested | awaiting_deposit | upcoming | completed | cancelled — keys the portal translates. */
function bookingState(b, ctx) {
  if (b.status === 'CANCELLED') return 'cancelled';
  if (b.status === 'REQUEST') return 'requested';
  if (b.status === 'AWAITING_DEPOSIT') return 'awaiting_deposit';
  return isPastSession(b, ctx) ? 'completed' : 'upcoming';
}

function bookingOut(b, ctx, gallery = null) {
  return {
    code: b.code,
    state: bookingState(b, ctx),
    startsAt: b.startsAt,
    durationMinutes: b.durationMinutes,
    service: b.serviceNameSnapshot,
    package: b.packageNameSnapshot,
    location: { kind: b.locationKind, name: b.locationName, address: b.locationAddress },
    canAddToCalendar: isActive(b) && !isPastSession(b, ctx),
    gallery,
  };
}

/** bookingId → { slug, draft, cover } for the galleries this scope may open (galleryScope, never a looser check). */
async function galleriesByBooking(scope, bookingIds) {
  if (!bookingIds.length) return new Map();
  const rows = await prisma.gallery.findMany({
    where: { bookingId: { in: bookingIds }, ...galleryScope(scope) },
    select: {
      bookingId: true, slug: true, status: true,
      coverPhoto: { select: COVER_FIELDS },
      photos: { where: visible, orderBy: [{ position: 'asc' }, { id: 'asc' }], take: 1, select: COVER_FIELDS },
    },
  });
  return new Map(
    rows.map((g) => [
      g.bookingId,
      { slug: g.slug, draft: g.status !== 'DELIVERED', cover: photoOut(g.coverPhoto && !g.coverPhoto.hidden ? g.coverPhoto : g.photos[0]) },
    ]),
  );
}

class ClientPortalModel {
  static async me(scope) {
    const c = await prisma.client.findUnique({
      where: { id: scope.clientId },
      select: { displayName: true, firstName: true, lastName: true, email: true, phone: true, instagram: true, locale: true, createdAt: true },
    });
    if (!c) throw new HttpError(404, 'Client not found');
    return { ...c, phone: c.phone ? formatPhone(c.phone) : null, preview: scope.preview };
  }

  // Available galleries (newest first) + how many expired ones are hidden behind "Show expired".
  static async galleries(scope, { expired = false } = {}) {
    const now = nowUtc();
    const [rows, expiredCount] = await Promise.all([
      prisma.gallery.findMany({
        where: galleryScope(scope, now),
        orderBy: [{ deliveredAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true, slug: true, title: true, status: true, deliveredAt: true, expiresAt: true,
          coverPhoto: { select: COVER_FIELDS },
          booking: { select: { startsAt: true, serviceNameSnapshot: true } },
          _count: { select: { photos: { where: visible } } },
          photos: { where: visible, orderBy: [{ position: 'asc' }, { id: 'asc' }], take: STRIP_SIZE + 1, select: COVER_FIELDS },
        },
      }),
      prisma.gallery.count({ where: expiredWhere(scope, now) }),
    ]);

    const galleries = rows.map((g) => {
      const cover = g.coverPhoto && !g.coverPhoto.hidden ? g.coverPhoto : g.photos[0];
      return {
        slug: g.slug,
        title: g.title,
        draft: g.status !== 'DELIVERED',
        deliveredAt: g.deliveredAt,
        expiresAt: g.expiresAt,
        daysLeft: galleryState(g).daysLeft,
        sessionAt: g.booking?.startsAt ?? null,
        service: g.booking?.serviceNameSnapshot ?? null,
        photoCount: g._count.photos,
        cover: photoOut(cover),
        strip: g.photos.filter((p) => p.id !== cover?.id).slice(0, STRIP_SIZE).map(photoOut),
      };
    });

    // Expired: only the card (title and date). Their photos are never served.
    const expiredList = expired
      ? (await prisma.gallery.findMany({
          where: expiredWhere(scope, now),
          orderBy: { expiresAt: 'desc' },
          select: { slug: true, title: true, deliveredAt: true, expiresAt: true, booking: { select: { startsAt: true, serviceNameSnapshot: true } } },
        })).map((g) => ({ slug: g.slug, title: g.title, deliveredAt: g.deliveredAt, expiresAt: g.expiresAt, sessionAt: g.booking?.startsAt ?? null, service: g.booking?.serviceNameSnapshot ?? null }))
      : [];

    return { galleries, expiredCount, expired: expiredList };
  }

  static async gallery(scope, slug, actorUserId) {
    const g = await prisma.gallery.findFirst({
      where: { slug, ...galleryScope(scope) },
      select: {
        id: true, slug: true, title: true, status: true, deliveredAt: true, expiresAt: true, coverLayout: true,
        downloadMode: true, favoritesEnabled: true, favoritesLimit: true, bookingId: true,
        client: { select: { firstName: true, displayName: true } },
        coverPhoto: { select: COVER_FIELDS },
        booking: { select: { startsAt: true, serviceNameSnapshot: true } },
        sets: { orderBy: [{ position: 'asc' }, { id: 'asc' }], select: { id: true, name: true, _count: { select: { photos: { where: visible } } } } },
        _count: { select: { photos: { where: visible } } },
      },
    });
    if (!g) throw new HttpError(404, 'Gallery not found');

    let cover = g.coverPhoto && !g.coverPhoto.hidden ? g.coverPhoto : null;
    if (!cover) {
      cover = await prisma.photo.findFirst({ where: { galleryId: g.id, ...visible }, orderBy: [{ position: 'asc' }, { id: 'asc' }], select: COVER_FIELDS });
    }

    if (!scope.preview) await this.#logView(g, scope.clientId, actorUserId);
    const favoriteCount = await prisma.favorite.count({ where: { clientId: scope.clientId, photo: { galleryId: g.id, ...visible } } });

    return {
      slug: g.slug,
      title: g.title,
      draft: g.status !== 'DELIVERED',
      deliveredAt: g.deliveredAt,
      expiresAt: g.expiresAt,
      daysLeft: galleryState(g).daysLeft,
      sessionAt: g.booking?.startsAt ?? null,
      service: g.booking?.serviceNameSnapshot ?? null,
      coverLayout: g.coverLayout,
      downloadMode: g.downloadMode,
      favoritesEnabled: g.favoritesEnabled,
      favoritesLimit: g.favoritesLimit,
      favoriteCount,
      photoCount: g._count.photos,
      cover: photoOut(cover),
      sets: g.sets.filter((s) => s._count.photos > 0).map((s) => ({ id: s.id, name: s.name, photoCount: s._count.photos })),
    };
  }

  // Cursor pages in the gallery's order. `cursor` = last photo id of the previous page.
  static async photos(scope, slug, { cursor, setId, pageSize, favorites } = {}) {
    const take = Math.min(Math.max(Number(pageSize) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const rows = await prisma.photo.findMany({
      where: { ...visible, ...(setId ? { setId } : {}), ...(favorites ? { favorites: { some: { clientId: scope.clientId } } } : {}), gallery: { slug, ...galleryScope(scope) } },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { ...PHOTO_FIELDS, favorites: { where: { clientId: scope.clientId }, select: { photoId: true } } },
    });
    const more = rows.length > take;
    const page = more ? rows.slice(0, take) : rows;
    return {
      photos: page.map((p) => ({ ...photoOut(p), filename: p.originalFilename, setId: p.setId, favorite: p.favorites.length > 0 })),
      nextCursor: more ? page[page.length - 1].id : null,
    };
  }

  /** Disk path (relative to the storage root) of a photo this scope may see. thumb | web only, for now. */
  static async photoFile(scope, slug, photoId, variant) {
    const photo = await prisma.photo.findFirst({
      where: { id: photoId, ...visible, gallery: { slug, ...galleryScope(scope) } },
      select: { thumbnailPath: true, webPath: true },
    });
    const rel = photo && { thumb: photo.thumbnailPath, web: photo.webPath }[variant];
    if (!rel) throw new HttpError(404, 'Photo not found');
    return rel;
  }

  /**
   * Favorite / unfavorite. Idempotent. The gallery row is locked for the transaction so two taps at
   * once cannot get past `favoritesLimit`. Returns the new total.
   */
  static async setFavorite(scope, slug, photoId, on, actorUserId) {
    return prisma.$transaction(async (tx) => {
      const g = await tx.gallery.findFirst({
        where: { slug, ...galleryScope(scope) },
        select: { id: true, favoritesEnabled: true, favoritesLimit: true, bookingId: true, client: { select: { firstName: true, displayName: true } } },
      });
      if (!g) throw new HttpError(404, 'Gallery not found');
      await tx.$queryRaw`SELECT id FROM galleries WHERE id = ${g.id} FOR UPDATE`;
      if (!g.favoritesEnabled) throw new HttpError(403, 'Favorites are turned off for this gallery', { code: 'FAVORITES_OFF' });
      const photo = await tx.photo.findFirst({ where: { id: photoId, galleryId: g.id, ...visible }, select: { id: true, originalFilename: true } });
      if (!photo) throw new HttpError(404, 'Photo not found');

      const key = { clientId_photoId: { clientId: scope.clientId, photoId } };
      const exists = await tx.favorite.findUnique({ where: key, select: { photoId: true } });
      if (on && !exists) {
        const count = await tx.favorite.count({ where: { clientId: scope.clientId, photo: { galleryId: g.id, ...visible } } });
        if (g.favoritesLimit != null && count >= g.favoritesLimit) {
          throw new HttpError(409, `You can pick up to ${g.favoritesLimit} favorites`, { code: 'FAVORITES_LIMIT' });
        }
        await tx.favorite.create({ data: { clientId: scope.clientId, photoId } });
        await this.#logFavorite(tx, g, scope, actorUserId, photo, true);
      } else if (!on && exists) {
        await tx.favorite.delete({ where: key });
        await this.#logFavorite(tx, g, scope, actorUserId, photo, false);
      }
      return { photoId, favorite: on, favoriteCount: await tx.favorite.count({ where: { clientId: scope.clientId, photo: { galleryId: g.id, ...visible } } }) };
    });
  }

  /** Web-size files to download. Every id must be a visible photo of this gallery; downloadMode OFF answers 403. */
  static async downloadFiles(scope, slug, photoIds, quality = 'web') {
    const g = await this.#downloadable(scope, slug, quality);
    const rows = await this.#ownPhotos(g, photoIds);
    return rows.map((p) => ({ rel: quality === 'original' ? p.originalPath : p.webPath, filename: p.originalFilename, gallery: { id: g.id, title: g.title } }));
  }

  /**
   * Everything a ZIP needs, and the History line (one per ZIP, not in preview). `pick` is
   * { ids } | { all: true } | { favorites: true } | { setId }. Full quality only when downloadMode allows it.
   */
  static async zipPlan(scope, slug, pick, quality, actorUserId) {
    const g = await this.#downloadable(scope, slug, quality);
    const where = { galleryId: g.id, ...visible };
    if (pick.ids) where.id = { in: pick.ids };
    else if (pick.favorites) where.favorites = { some: { clientId: scope.clientId } };
    else if (pick.setId) where.setId = pick.setId;
    const photos = await prisma.photo.findMany({
      where, orderBy: [{ position: 'asc' }, { id: 'asc' }], take: MAX_ZIP_PHOTOS + 1,
      select: { id: true, originalFilename: true, originalPath: true, webPath: true },
    });
    if (photos.length === 0) throw new HttpError(404, 'Nothing to download');
    if (photos.length > MAX_ZIP_PHOTOS) throw new HttpError(400, `A ZIP holds up to ${MAX_ZIP_PHOTOS} photos`);
    if (pick.ids && photos.length !== new Set(pick.ids).size) throw new HttpError(404, 'Photo not found');
    if (!scope.preview) await this.#logDownloadEvent(g, scope, actorUserId, photos.length, quality, true);
    return { gallery: { id: g.id, title: g.title }, photos };
  }

  /**
   * One History line per download action ("Alexis downloaded 12 photos"), not one per file: the browser
   * asks for the files one by one, so the client reports the batch once. Not logged in preview.
   */
  static async logDownload(scope, slug, photoIds, quality, actorUserId) {
    const g = await this.#downloadable(scope, slug, quality);
    const rows = await this.#ownPhotos(g, photoIds);
    if (scope.preview) return { count: rows.length };
    await this.#logDownloadEvent(g, scope, actorUserId, rows.length, quality, false);
    return { count: rows.length };
  }

  static async #logDownloadEvent(g, scope, actorUserId, n, quality, zip) {
    await prisma.activityEvent.create({
      data: {
        type: 'gallery.downloaded', actorType: 'CLIENT', actorId: actorUserId, clientId: scope.clientId, galleryId: g.id,
        bookingId: g.bookingId ?? null, message: `${clientName(g.client)} downloaded ${n} photo${n === 1 ? '' : 's'}`, metadata: { count: n, quality, zip },
      },
    });
  }

  // `original` (full quality) only when the studio allows it: downloadMode HIGH_AND_WEB. WEB_ONLY serves the web copy.
  static async #downloadable(scope, slug, quality = 'web') {
    const g = await prisma.gallery.findFirst({
      where: { slug, ...galleryScope(scope) },
      select: { id: true, title: true, downloadMode: true, bookingId: true, client: { select: { firstName: true, displayName: true } } },
    });
    if (!g) throw new HttpError(404, 'Gallery not found');
    if (g.downloadMode === 'OFF') throw new HttpError(403, 'Downloads are turned off for this gallery', { code: 'DOWNLOADS_OFF' });
    if (quality !== 'web' && g.downloadMode !== 'HIGH_AND_WEB') throw new HttpError(403, 'Full-quality downloads are not available for this gallery', { code: 'WEB_ONLY' });
    return g;
  }

  static async #ownPhotos(g, photoIds) {
    const rows = await prisma.photo.findMany({
      where: { id: { in: photoIds }, galleryId: g.id, ...visible },
      select: { id: true, originalFilename: true, originalPath: true, webPath: true },
    });
    if (rows.length !== new Set(photoIds).size) throw new HttpError(404, 'Photo not found');
    return rows;
  }

  // "Alexis liked IMG_01.jpg" / "Alexis removed the like from IMG_01.jpg". Only real changes reach here.
  static async #logFavorite(tx, g, scope, actorUserId, photo, on) {
    await tx.activityEvent.create({
      data: {
        type: on ? 'gallery.favorited' : 'gallery.unfavorited', actorType: 'CLIENT', actorId: actorUserId, clientId: scope.clientId, galleryId: g.id,
        bookingId: g.bookingId ?? null,
        message: `${clientName(g.client)} ${on ? 'liked' : 'removed the like from'} ${photo.originalFilename}`,
        metadata: { photoId: photo.id },
      },
    });
  }

  /** The viewer's Info panel: camera data (no coordinates on screen) and the rights written into every file. */
  static async photoInfo(scope, slug, photoId) {
    const photo = await prisma.photo.findFirst({
      where: { id: photoId, ...visible, gallery: { slug, ...galleryScope(scope) } },
      select: { id: true, galleryId: true, gallery: { select: { id: true, title: true } } },
    });
    if (!photo) throw new HttpError(404, 'Photo not found');
    const info = await GalleryModel.photoInfo(photo.galleryId, photo.id);
    const { gps, ...exif } = info.exif ?? {};
    return {
      filename: info.filename, mimeType: info.mimeType, sizeBytes: info.sizeBytes, width: info.width, height: info.height, uploadedAt: info.uploadedAt,
      exif: { ...exif, hasLocation: Boolean(gps) },
      rights: { owner: OWNER, copyright: `© ${nowInStudio().year} ${OWNER}`, licensee: licenseeOf(photo.gallery), terms: USAGE_TERMS },
    };
  }

  /** Original + gallery for an edited download (full quality only). The size can only get smaller. */
  static async editedSource(scope, slug, photoId, ops) {
    const g = await this.#downloadable(scope, slug, 'edited');
    const [photo] = await this.#ownPhotos(g, [photoId]);
    const full = await prisma.photo.findUnique({ where: { id: photo.id }, select: { width: true, height: true } });
    // The size is of the photo AFTER rotating: a quarter turn swaps width and height.
    const quarter = Math.abs(ops.rotate) % 180 === 90;
    const [maxW, maxH] = quarter ? [full.height, full.width] : [full.width, full.height];
    if (ops.resize && ((maxW && ops.resize.width > maxW) || (maxH && ops.resize.height > maxH))) {
      throw new HttpError(400, 'A photo can only be made smaller, never larger');
    }
    return { gallery: { id: g.id, title: g.title }, rel: photo.originalPath, filename: photo.originalFilename };
  }

  /**
   * Bookings tab. `upcoming`: sessions still ahead (soonest first; the first one is the "ticket").
   * `past`: sessions that already started and cancelled ones, newest first, cursor pages
   * (`cursor` = last booking id of the previous page).
   */
  static async bookings(scope, { cursor } = {}) {
    const ctx = deriveContext(null);
    const now = ctx.pastCutoff.toJSDate();
    const [upcoming, pastRows] = await Promise.all([
      prisma.booking.findMany({
        where: { AND: [bookingScope(scope), { status: { in: ['REQUEST', ...ACTIVE_STATUSES] }, startsAt: { gte: now } }] },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        take: MAX_UPCOMING,
        select: BOOKING_FIELDS,
      }),
      prisma.booking.findMany({
        where: { AND: [bookingScope(scope), { OR: [{ startsAt: { lt: now } }, { status: 'CANCELLED' }] }] },
        orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
        take: BOOKING_PAGE_SIZE + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: BOOKING_FIELDS,
      }),
    ]);
    const more = pastRows.length > BOOKING_PAGE_SIZE;
    const past = more ? pastRows.slice(0, BOOKING_PAGE_SIZE) : pastRows;
    const galleries = await galleriesByBooking(scope, [...upcoming, ...past].map((b) => b.id));
    const out = (b) => bookingOut(b, ctx, galleries.get(b.id) ?? null);
    return { upcoming: upcoming.map(out), past: past.map(out), nextCursor: more ? past[past.length - 1].id : null };
  }

  /**
   * Payments tab: one entry per booking that has money attached — active ones, and cancelled ones
   * with payments (deposit kept or refunded). Requests aren't priced until Areli accepts them.
   * Paid/balance use booking-derive's `paidCents`, the same math as the admin.
   */
  static async payments(scope) {
    const ctx = deriveContext(null);
    const rows = await prisma.booking.findMany({
      where: {
        AND: [bookingScope(scope), { OR: [{ status: { in: ACTIVE_STATUSES } }, { status: 'CANCELLED', payments: { some: {} } }] }],
      },
      orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
      take: MAX_PAYMENT_BOOKINGS,
      select: {
        ...BOOKING_FIELDS,
        packagePriceCents: true, travelFeeCents: true, adjustmentCents: true, totalCents: true, depositCents: true, depositDueAt: true,
        extras: { orderBy: { nameSnapshot: 'asc' }, select: { nameSnapshot: true, quantity: true, priceCentsSnapshot: true } },
        // Never `note` or `recordedById`.
        payments: { orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }], select: { kind: true, method: true, amountCents: true, receivedAt: true } },
      },
    });
    return {
      bookings: rows.map((b) => {
        const paid = paidCents(b.payments);
        const awaiting = b.status === 'AWAITING_DEPOSIT';
        return {
          ...bookingOut(b, ctx),
          money: {
            totalCents: b.totalCents,
            depositCents: b.depositCents,
            paidCents: paid,
            balanceCents: isActive(b) ? Math.max(0, b.totalCents - paid) : 0,
            depositLeftCents: awaiting ? Math.max(0, b.depositCents - paid) : 0,
            depositDueAt: awaiting ? b.depositDueAt : null,
          },
          receipt: {
            packageCents: b.packagePriceCents,
            extras: b.extras.map((e) => ({ name: e.nameSnapshot, quantity: e.quantity, unitCents: e.priceCentsSnapshot })),
            travelFeeCents: b.travelFeeCents,
            adjustmentCents: b.adjustmentCents,
            payments: b.payments,
          },
        };
      }),
    };
  }

  /** Event for "Add to calendar": only an active session that is still ahead; anything else is 404. */
  static async calendarEvent(scope, code) {
    const b = await prisma.booking.findFirst({
      where: { AND: [bookingScope(scope), { code, status: { in: ACTIVE_STATUSES }, startsAt: { gte: nowUtc() } }] },
      select: {
        code: true, status: true, startsAt: true, durationMinutes: true, serviceNameSnapshot: true,
        locationName: true, locationAddress: true, rescheduleCount: true,
      },
    });
    if (!b) throw new HttpError(404, 'Booking not found');
    const start = toStudio(b.startsAt);
    return {
      code: b.code,
      uid: `booking-${b.code}@${BRAND.domain}`,
      sequence: b.rescheduleCount, // a reschedule bumps it, so re-adding updates the event
      start,
      end: start.plus({ minutes: b.durationMinutes }),
      summary: `${b.serviceNameSnapshot} session · ${BRAND.name}`,
      // "ASU CAMPUS" + "ASU CAMPUS, TEMPE" → just the address.
      location: b.locationAddress?.startsWith(b.locationName) ? b.locationAddress : [b.locationName, b.locationAddress].filter(Boolean).join(', '),
      // Times, place and how to reach Areli only: no prices, no notes.
      description: `Booking ${b.code}\nQuestions? Text ${BRAND.owner}: ${formatPhone(CONTACT.phoneE164)}`,
      url: `https://${BRAND.domain}/client/bookings`,
      tentative: b.status === 'AWAITING_DEPOSIT',
    };
  }

  // "gallery.viewed" feeds the Activity tab in the admin. At most one per visit: a second tab or a
  // double load inside the gap can at worst add one extra row, never corrupt a counter.
  static async #logView(g, clientId, actorUserId) {
    const since = DateTime.utc().minus({ minutes: VIEW_EVENT_GAP_MINUTES }).toJSDate();
    const [recent, before] = await Promise.all([
      prisma.activityEvent.findFirst({ where: { galleryId: g.id, clientId, type: 'gallery.viewed', createdAt: { gt: since } }, select: { id: true } }),
      prisma.activityEvent.findFirst({ where: { galleryId: g.id, clientId, type: 'gallery.viewed' }, select: { id: true } }),
    ]);
    if (recent) return;
    // Same type either way (the Views / Last visit numbers count it); the first one reads differently in the History.
    const first = !before;
    await prisma.activityEvent.create({
      data: {
        type: 'gallery.viewed', actorType: 'CLIENT', actorId: actorUserId, clientId, galleryId: g.id, bookingId: g.bookingId ?? null,
        message: `${clientName(g.client)} opened the gallery${first ? ' for the first time' : ''}`, metadata: first ? { first: true } : undefined,
      },
    });
  }
}

export default ClientPortalModel;
