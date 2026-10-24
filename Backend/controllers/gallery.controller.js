import GalleryModel from '../models/gallery.model.js';
import * as storage from '../services/storage.js';
import prisma from '../config/db.js';
import { HttpError, parseId, sendError } from '../utils/http.js';

const send = (res, status, data, message) => res.status(status).json({ message, data, error: false });

const handler = (run, status, message, failure) => async (req, res) => {
  try {
    return send(res, status, await run(req), message);
  } catch (error) {
    return sendError(res, error, failure);
  }
};

const galleryId = (req) => parseId(req.params.id, 'gallery id');

export const getSummary = handler(() => GalleryModel.summary(), 200, 'Summary loaded', 'Failed to load the summary');
export const listGalleries = handler((req) => GalleryModel.list(req.valid.query), 200, 'Galleries loaded', 'Failed to load galleries');
export const getGallery = handler((req) => GalleryModel.get(galleryId(req)), 200, 'Gallery loaded', 'Failed to load the gallery');
export const getActivity = handler((req) => GalleryModel.activity(galleryId(req)), 200, 'Activity loaded', 'Failed to load the activity');
export const createGallery = handler((req) => GalleryModel.create(req.valid.body, req.user.id), 201, 'Gallery created', 'Failed to create the gallery');
export const updateGallery = handler((req) => GalleryModel.update(galleryId(req), req.valid.body, req.user.id), 200, 'Gallery updated', 'Failed to update the gallery');
export const deleteGallery = handler((req) => GalleryModel.remove(galleryId(req), req.user.id), 200, 'Gallery deleted', 'Failed to delete the gallery');
export const deliverGallery = handler((req) => GalleryModel.deliver(galleryId(req), req.valid.body, req.user.id), 200, 'Gallery delivered', 'Failed to deliver the gallery');
export const extendGallery = handler((req) => GalleryModel.extend(galleryId(req), req.valid.body, req.user.id), 200, 'Gallery extended', 'Failed to extend the gallery');
export const setCover = handler((req) => GalleryModel.setCover(galleryId(req), req.valid.body.photoId, req.user.id), 200, 'Cover saved', 'Failed to save the cover');

export const addSet = handler((req) => GalleryModel.addSet(galleryId(req), req.valid.body.name, req.user.id), 201, 'Set added', 'Failed to add the set');
export const updateSet = handler((req) => GalleryModel.updateSet(galleryId(req), parseId(req.params.setId, 'set id'), req.valid.body), 200, 'Set updated', 'Failed to update the set');
export const removeSet = handler((req) => GalleryModel.removeSet(galleryId(req), parseId(req.params.setId, 'set id'), req.user.id), 200, 'Set removed', 'Failed to remove the set');

export const getPhotoInfo = handler((req) => GalleryModel.photoInfo(galleryId(req), parseId(req.params.photoId, 'photo id')), 200, 'Photo info loaded', 'Failed to load the photo info');
export const editPhoto = handler((req) => GalleryModel.editPhoto(galleryId(req), parseId(req.params.photoId, 'photo id'), req.valid.body, req.user.id), 200, 'Photo saved', 'Failed to save the photo');

export const setPhotoFocus = handler((req) => GalleryModel.setPhotoFocus(galleryId(req), parseId(req.params.photoId, 'photo id'), req.valid.body), 200, 'Focus saved', 'Failed to save the focus');

export const bulkPhotos = handler((req) => GalleryModel.bulk(galleryId(req), req.valid.body, req.user.id), 200, 'Photos updated', 'Failed to update the photos');

// POST /:id/photos — multipart, field "photos" (the form's text field "setId" goes first).
export const uploadPhotos = async (req, res) => {
  const files = req.files ?? [];
  try {
    if (files.length === 0) throw new HttpError(400, 'Choose at least one photo');
    const rawSet = req.body?.setId;
    const setId = rawSet === undefined || rawSet === '' ? null : parseId(rawSet, 'setId');
    const result = await GalleryModel.addPhotos(galleryId(req), files, { setId });
    // Every temp file was either moved or removed by the model; anything left (a failure before
    // reaching it) is cleaned here.
    await Promise.all(files.map((f) => storage.removeTmp(f.path)));
    if (result.photos.length === 0) throw new HttpError(422, result.failed[0]?.reason ?? 'The photo could not be saved');
    return send(res, 201, result, 'Photos uploaded');
  } catch (error) {
    await Promise.all(files.map((f) => storage.removeTmp(f.path)));
    return sendError(res, error, 'Failed to upload the photos');
  }
};

// GET /:id/photos/:photoId/:variant — thumb | web | original. Admin only; never served statically.
export const photoFile = async (req, res) => {
  try {
    const variant = req.params.variant;
    if (!['thumb', 'web', 'original'].includes(variant)) throw new HttpError(404, 'Photo not found');
    const file = await GalleryModel.photoFile(galleryId(req), parseId(req.params.photoId, 'photo id'), variant);
    res.set('Cache-Control', 'private, max-age=3600');
    res.type(file.mimeType);
    if (req.query.download) res.attachment(file.filename);
    return res.sendFile(storage.absolutePath(file.rel), { dotfiles: 'allow' }, (err) => {
      if (err && !res.headersSent) sendError(res, new HttpError(404, 'Photo not found'), 'Photo not found');
    });
  } catch (error) {
    return sendError(res, error, 'Failed to load the photo');
  }
};

// ---- Storage (sidebar bar + upload pre-check), docs/almacenamiento-fotos.md §4, §7 ----

let storageCache = null;

export const getStorage = handler(
  async (req) => {
    if (!req.query.fresh && storageCache && Date.now() - storageCache.at < 30_000) return storageCache.data;
    const [disk, sizes] = await Promise.all([
      storage.diskStatus(),
      Promise.all([prisma.photo.aggregate({ _sum: { sizeBytes: true } }), prisma.gallery.count()]),
    ]);
    const data = { ...disk, photosBytes: sizes[0]._sum.sizeBytes ?? 0, galleryCount: sizes[1] };
    storageCache = { at: Date.now(), data };
    return data;
  },
  200,
  'Storage loaded',
  'Failed to read the storage',
);

export const checkStorage = async (req, res) => {
  try {
    const problem = await storage.storageProblem(req.valid.body.bytes);
    if (problem) return sendError(res, problem, 'Not enough space');
    return send(res, 200, { ok: true, ...(await storage.diskStatus()) }, 'There is room');
  } catch (error) {
    return sendError(res, error, 'Failed to check the storage');
  }
};
