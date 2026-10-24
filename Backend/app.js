import express from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { NODE_ENV } from './config/main.js';
import authRoutes from './routes/auth.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import clientRoutes from './routes/client.routes.js';
import clientPortalRoutes from './routes/client-portal.routes.js';
import extraRoutes from './routes/extra.routes.js';
import { galleryRouter, storageRouter } from './routes/gallery.routes.js';
import overviewRoutes from './routes/overview.routes.js';
import serviceRoutes from './routes/service.routes.js';
import { HttpError, sendError } from './utils/http.js';

const app = express();

app.set('trust proxy', 1); // behind nginx
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// AUTH
app.use('/api/auth', authRoutes);

// ADMIN
app.use('/api/admin/overview', overviewRoutes);
app.use('/api/admin/bookings', bookingRoutes);
app.use('/api/admin/clients', clientRoutes);
app.use('/api/admin/galleries', galleryRouter);
app.use('/api/admin/storage', storageRouter);
app.use('/api/admin/services', serviceRoutes);
app.use('/api/admin/extras', extraRoutes);

// CLIENT PORTAL (photosbyareliii.com/client/)
app.use('/api/client', clientPortalRoutes);

// Liveness probe for the container healthcheck and the rollout (no DB access on purpose).
app.get('/api/health', (_req, res) => res.json({ error: false, message: 'ok', data: { status: 'up' } }));

app.use('/api', (_req, res) => {
  res.status(404).json({ error_message: 'Route not found', message: 'Not found', error: true });
});

// Last stop for errors thrown outside a controller's try/catch (e.g. a malformed JSON body):
// answer with the envelope instead of Express's HTML page with a stack trace.
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed') return sendError(res, new HttpError(400, 'Invalid JSON body'), 'Bad request');
  if (err?.type === 'entity.too.large') return sendError(res, new HttpError(413, 'Request body is too large'), 'Bad request');
  return sendError(res, err, 'Internal server error');
});

export default app;
