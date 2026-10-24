import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me, changePassword } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Wrong "current password" guesses from a signed-in session: 5 per 15 minutes per account.
// Only wrong guesses count (the controller flags them) — not form mistakes, not successes.
// In memory, so it resets when the API restarts.
const changePasswordLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  requestWasSuccessful: (_req, res) => !res.locals.wrongPassword,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user.id}`,
  handler: (_req, res) =>
    res.status(429).json({ error_message: 'Too many attempts. Try again in a few minutes.', message: 'Too many requests', error: true }),
});

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.post('/change-password', requireAuth, changePasswordLimit, changePassword);

export default router;
