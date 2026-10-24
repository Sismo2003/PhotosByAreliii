import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { emptyBody } from '../validators/booking.schemas.js';
import { clientListQuery, createClientBody, reminderBody, updateClientBody } from '../validators/client.schemas.js';
import {
  createClient,
  deleteClient,
  getClient,
  getSummary,
  listClients,
  restoreClient,
  setReminder,
  updateClient,
} from '../controllers/client.controller.js';

const router = Router();

router.use(requireAdmin);

// Fixed paths before /:id, or "summary" would be read as an id.
router.get('/summary', getSummary);
router.get('/', validate(clientListQuery, 'query'), listClients);
router.post('/', validate(createClientBody), createClient);
router.get('/:id', getClient);
router.patch('/:id', validate(updateClientBody), updateClient);
router.put('/:id/rebook-reminder', validate(reminderBody), setReminder);
router.delete('/:id', deleteClient);
router.post('/:id/restore', validate(emptyBody), restoreClient);

export default router;
