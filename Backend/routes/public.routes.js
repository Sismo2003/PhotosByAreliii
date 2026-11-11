import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { validate } from '../middlewares/validate.middleware.js';
import { availabilityQuery, publicBookingBody } from '../validators/public-booking.schemas.js';
import { createRequest, getAvailability, getCatalog } from '../controllers/public-booking.controller.js';

// Public API of the landing's /book (docs/api-public-booking.md). No session on purpose: the form
// doesn't ask anyone to sign in. Limits are per IP (req.ip is the client's: app.set('trust proxy', 1)
// and nginx overwrites X-Forwarded-For). The edge (deploy/nginx/pba.conf.template) limits again.
// In memory, so they reset when the API restarts.
const router = Router();

const limited = (name, windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // ipKeyGenerator groups an IPv6 address by its /56, so one machine can't rotate addresses.
    keyGenerator: (req) => `public-${name}:${ipKeyGenerator(req.ip)}`,
    handler: (_req, res) => res.status(429).json({ error_message: message, message: 'Too many requests', error: true, details: { code: 'RATE_LIMITED' } }),
  });

// Browsing months on the calendar: generous.
const readLimit = limited('read', 5 * 60 * 1000, 300, 'Too many requests. Try again in a few minutes.');
// Sending requests: a person sends one, maybe two. Failed validations count too (a bot probing).
const sendLimit = limited('send', 60 * 60 * 1000, 8, 'Too many requests from this connection. Try again later, or message me directly.');

router.get('/catalog', readLimit, getCatalog);
router.get('/availability', readLimit, validate(availabilityQuery, 'query'), getAvailability);
router.post('/bookings', sendLimit, validate(publicBookingBody), createRequest);

export default router;
