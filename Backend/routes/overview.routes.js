import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { getBookings, getStorage, getVisits } from '../controllers/overview.controller.js';

const router = Router();

router.use(requireAdmin);

router.get('/bookings', getBookings);
router.get('/storage', getStorage);
router.get('/visits', getVisits);

export default router;
