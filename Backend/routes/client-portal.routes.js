import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireClientScope } from '../middlewares/client-scope.middleware.js';
import { addFavorite, bookingCalendar, downloadEdited, downloadPhoto, downloadZip, getPhotoInfo, getGallery, logDownload, getMe, listBookings, listGalleries, listPayments, listPhotos, photoFile, removeFavorite } from '../controllers/client-portal.controller.js';

// Client portal API (docs/portal-cliente-plan.md §4). Favorites and web-size downloads; the rest is read only. There is no upload route
// here, ever: only the admin adds photos.
const router = Router();

router.use(requireClientScope);

// A gallery page loads many thumbnails; this only stops scripted scraping. Per account, in memory.
router.use(
  rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 3000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => `client-portal:${req.user.id}`,
    handler: (_req, res) =>
      res.status(429).json({ error_message: 'Too many requests. Try again in a few minutes.', message: 'Too many requests', error: true }),
  }),
);

router.get('/me', getMe);
router.get('/bookings', listBookings);
router.get('/bookings/:code/calendar.ics', bookingCalendar);
router.get('/payments', listPayments);
router.get('/galleries', listGalleries);
router.get('/galleries/:slug', getGallery);
router.post('/galleries/:slug/downloads', logDownload);
router.get('/galleries/:slug/download.zip', downloadZip);
router.get('/galleries/:slug/photos', listPhotos);
router.put('/galleries/:slug/photos/:photoId/favorite', addFavorite);
router.delete('/galleries/:slug/photos/:photoId/favorite', removeFavorite);
router.get('/galleries/:slug/photos/:photoId/download', downloadPhoto);
router.get('/galleries/:slug/photos/:photoId/download-edited', downloadEdited);
router.get('/galleries/:slug/photos/:photoId/info', getPhotoInfo);
router.get('/galleries/:slug/photos/:photoId/:variant', photoFile);

export default router;
