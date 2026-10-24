// Client portal API — /api/client/* (Backend/routes/client-portal.routes.js).
// The server decides whose data this is from the session; nothing here sends a client id.
import axios from "utils/axios";

export const getMe = () => axios.get("/client/me");

/** { galleries, expiredCount, expired } — `expired` filled only when asked for. */
export const listGalleries = ({ expired = false } = {}) =>
  axios.get("/client/galleries", { params: expired ? { expired: 1 } : undefined });

export const getGallery = (slug) => axios.get(`/client/galleries/${encodeURIComponent(slug)}`);

/** Cursor pages: pass the previous page's `nextCursor`. */
export const listPhotos = (slug, { cursor, setId, pageSize, favorites } = {}) =>
  axios.get(`/client/galleries/${encodeURIComponent(slug)}/photos`, {
    params: { cursor: cursor || undefined, setId: setId || undefined, pageSize, favorites: favorites ? 1 : undefined },
  });

/** thumb | web. `version` (editedAt) busts the browser cache after Areli edits a photo. */
export const photoUrl = (slug, photo, variant = "thumb") =>
  `/api/client/galleries/${encodeURIComponent(slug)}/photos/${photo.id}/${variant}${
    photo.version ? `?v=${encodeURIComponent(photo.version)}` : ""
  }`;

const photoPath = (slug, id) => `/client/galleries/${encodeURIComponent(slug)}/photos/${id}`;

export const addFavorite = (slug, id) => axios.put(`${photoPath(slug, id)}/favorite`);
export const removeFavorite = (slug, id) => axios.delete(`${photoPath(slug, id)}/favorite`);

/** Web-size file as a Blob (the session cookie travels with axios). */
export const fetchDownload = (slug, id) => axios.get(`${photoPath(slug, id)}/download`, { params: { quality: "web" }, responseType: "blob" });

/** Same-origin URLs the browser downloads itself (the session cookie travels with them). */
export const originalUrl = (slug, id) => `/api${photoPath(slug, id)}/download?quality=original`;
/** pick: { ids } | { all: true } | { favorites: true } | { setId } */
export const zipUrl = (slug, quality, pick) => {
  const q = new URLSearchParams({ quality });
  if (pick.ids) q.set("ids", pick.ids.join(","));
  else if (pick.favorites) q.set("favorites", "1");
  else if (pick.setId) q.set("setId", String(pick.setId));
  else q.set("all", "1");
  return `/api/client/galleries/${encodeURIComponent(slug)}/download.zip?${q}`;
};

/** One History line for the whole download. The files are then fetched one by one. */
export const logDownload = (slug, ids, quality = "web") =>
  axios.post(`/client/galleries/${encodeURIComponent(slug)}/downloads`, { photoIds: ids, quality });

/** Camera data (no coordinates) + the rights written into the files. */
export const getPhotoInfo = (slug, id) => axios.get(`${photoPath(slug, id)}/info`);

/** Edited copy as a Blob (nothing stored on the server): `query` from viewerEdits.editQuery. Fetched, not
 * opened in a hidden frame, so a refusal (busy, too large…) reaches the viewer instead of vanishing. */
export const fetchEdited = (slug, id, query) => axios.get(`${photoPath(slug, id)}/download-edited`, { params: query, responseType: "blob" });

/** { upcoming, past, nextCursor } — `cursor` pages the past sessions. */
export const listBookings = ({ cursor } = {}) => axios.get("/client/bookings", { params: cursor ? { cursor } : undefined });

/** "Add to calendar": a same-origin .ics the browser opens itself (iOS hands it to Calendar). */
export const calendarUrl = (code) => `/api/client/bookings/${encodeURIComponent(code)}/calendar.ics`;

/** { bookings: [{ …booking, money, receipt }] } */
export const listPayments = () => axios.get("/client/payments");
