// Galleries API — /api/admin/galleries and /api/admin/storage (docs/api-galleries.md).
// Money never appears here; sizes are bytes, dates ISO UTC (the expiration "day" is sent as YYYY-MM-DD).
import axios from "utils/axios";

const BASE = "/admin/galleries";

export const getGalleriesSummary = () => axios.get(`${BASE}/summary`);

/** tab: all | draft | delivered | expired · sort: newest | oldest | size | title */
export const listGalleries = ({ tab, q, sort, page = 1, pageSize = 25 }) =>
  axios.get(BASE, { params: { tab, q: q || undefined, sort: sort || undefined, page, pageSize } });

export const getGallery = (id) => axios.get(`${BASE}/${id}`);
export const getGalleryActivity = (id) => axios.get(`${BASE}/${id}/activity`);

/** { clientId, bookingId?, title?, sets? } */
export const createGallery = (body) => axios.post(BASE, body);

/** Only what changed: title, coverLayout, downloadMode, pinRequired, newPin, privacy, accessPassword,
 *  favoritesEnabled, favoritesLimit (null = no limit), watermark, socialSharing, expiresOn. */
export const updateGallery = (id, body) => axios.patch(`${BASE}/${id}`, body);

export const deleteGallery = (id) => axios.delete(`${BASE}/${id}`);

export const addSet = (id, name) => axios.post(`${BASE}/${id}/sets`, { name });
export const updateSet = (id, setId, body) => axios.patch(`${BASE}/${id}/sets/${setId}`, body);
export const removeSet = (id, setId) => axios.delete(`${BASE}/${id}/sets/${setId}`);

/** action: move (+ setId, null = no set) | hide | show | delete | pick | unpick */
export const bulkPhotos = (id, body) => axios.post(`${BASE}/${id}/photos/bulk`, body);

export const setCover = (id, photoId) => axios.put(`${BASE}/${id}/cover`, { photoId });

/** { to?, subject?, message?, newPin? } — marks it delivered; the email is the Correos module's job. */
export const deliverGallery = (id, body) => axios.post(`${BASE}/${id}/deliver`, body);
export const extendGallery = (id, days = 30) => axios.post(`${BASE}/${id}/extend`, { days });

/** One photo per request (the page uploads 3 at a time). `setId` goes first in the form. */
export function uploadPhoto(id, file, { setId, onProgress, signal } = {}) {
  const form = new FormData();
  form.append("setId", setId ?? "");
  form.append("photos", file);
  return axios.post(`${BASE}/${id}/photos`, form, {
    signal,
    onUploadProgress: (e) => e.total && onProgress?.(e.loaded / e.total),
  });
}

/** Upload pre-check (docs/almacenamiento-fotos.md §5.2 #1): rejects with details when it doesn't fit. */
export const checkStorage = (bytes, count) => axios.post("/admin/storage/check", { bytes, count });

/** `version` (the photo's editedAt) busts the browser cache after the original is replaced. */
export const photoUrl = (galleryId, photoId, variant = "thumb", version = null) =>
  `/api/admin/galleries/${galleryId}/photos/${photoId}/${variant}${version ? `?v=${encodeURIComponent(version)}` : ""}`;

/** Same file, forced to download (original or web size). */
export const photoDownloadUrl = (galleryId, photoId, variant, version = null) =>
  `/api/admin/galleries/${galleryId}/photos/${photoId}/${variant}?download=1${version ? `&v=${encodeURIComponent(version)}` : ""}`;

/** Camera data and file facts for the viewer's Info panel. */
export const getPhotoInfo = (id, photoId) => axios.get(`${BASE}/${id}/photos/${photoId}/info`);

/**
 * Replaces the ORIGINAL with an edited version: { rotate, straighten, flipH, flipV,
 * crop {x,y,width,height} (0–1) | null, resize {width,height} | null }.
 */
export const editPhoto = (id, photoId, body) => axios.post(`${BASE}/${id}/photos/${photoId}/edit`, body);
/** { x, y } (0–1) sets the focus by hand; { reset: true } goes back to the automatic one. */
export const setPhotoFocus = (id, photoId, body) => axios.post(`${BASE}/${id}/photos/${photoId}/focus`, body);
