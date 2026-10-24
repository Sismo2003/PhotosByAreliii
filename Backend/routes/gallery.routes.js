import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { guardUpload, receivePhotos } from '../middlewares/upload.middleware.js';
import {
  bulkBody,
  editPhotoBody,
  photoFocusBody,
  coverBody,
  createGalleryBody,
  deliverBody,
  extendBody,
  galleryListQuery,
  setBody,
  storageCheckBody,
  updateGalleryBody,
  updateSetBody,
} from '../validators/gallery.schemas.js';
import {
  addSet,
  bulkPhotos,
  checkStorage,
  createGallery,
  deleteGallery,
  editPhoto,
  setPhotoFocus,
  getPhotoInfo,
  deliverGallery,
  extendGallery,
  getActivity,
  getGallery,
  getStorage,
  getSummary,
  listGalleries,
  photoFile,
  removeSet,
  setCover,
  updateGallery,
  updateSet,
  uploadPhotos,
} from '../controllers/gallery.controller.js';

export const galleryRouter = Router();
export const storageRouter = Router();

storageRouter.use(requireAdmin);
storageRouter.get('/', getStorage);
storageRouter.post('/check', validate(storageCheckBody), checkStorage);

galleryRouter.use(requireAdmin);
// Fixed paths before /:id, or "summary" would be read as an id.
galleryRouter.get('/summary', getSummary);
galleryRouter.get('/', validate(galleryListQuery, 'query'), listGalleries);
galleryRouter.post('/', validate(createGalleryBody), createGallery);
galleryRouter.get('/:id', getGallery);
galleryRouter.patch('/:id', validate(updateGalleryBody), updateGallery);
galleryRouter.delete('/:id', deleteGallery);
galleryRouter.get('/:id/activity', getActivity);

galleryRouter.post('/:id/sets', validate(setBody), addSet);
galleryRouter.patch('/:id/sets/:setId', validate(updateSetBody), updateSet);
galleryRouter.delete('/:id/sets/:setId', removeSet);

galleryRouter.post('/:id/photos', guardUpload, receivePhotos, uploadPhotos);
galleryRouter.post('/:id/photos/bulk', validate(bulkBody), bulkPhotos);
galleryRouter.get('/:id/photos/:photoId/info', getPhotoInfo);
galleryRouter.post('/:id/photos/:photoId/edit', validate(editPhotoBody), editPhoto);
galleryRouter.post('/:id/photos/:photoId/focus', validate(photoFocusBody), setPhotoFocus);
galleryRouter.get('/:id/photos/:photoId/:variant', photoFile);
galleryRouter.put('/:id/cover', validate(coverBody), setCover);

galleryRouter.post('/:id/deliver', validate(deliverBody), deliverGallery);
galleryRouter.post('/:id/extend', validate(extendBody), extendGallery);
