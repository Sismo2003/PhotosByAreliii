import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  calendarQuery,
  cancelBody,
  clientLookupQuery,
  clientSearchQuery,
  createBookingBody,
  emptyBody,
  listQuery,
  paymentBody,
  rebookBody,
  rescheduleBody,
} from '../validators/booking.schemas.js';
import {
  createBooking,
  getCatalog,
  lookupClient,
  searchClients,
} from '../controllers/booking-create.controller.js';
import {
  listRequests,
  listRequestsCalendar,
  getBooking,
  confirmBooking,
  declineBooking,
  resolveMatch,
  getSummary,
  listBookings,
  listCalendar,
  recordPayment,
  rescheduleBooking,
  cancelBooking,
  expireBooking,
  reopenBooking,
  archiveBooking,
  unarchiveBooking,
  markReviewReceived,
  setRebookReminder,
} from '../controllers/booking.controller.js';

const router = Router();

router.use(requireAdmin);

// Fixed paths before /:id, or "summary" would be read as an id.
router.get('/', validate(listQuery, 'query'), listBookings);
router.post('/', validate(createBookingBody), createBooking);
router.get('/new/catalog', getCatalog);
router.get('/new/clients', validate(clientSearchQuery, 'query'), searchClients);
router.get('/new/client-lookup', validate(clientLookupQuery, 'query'), lookupClient);
router.get('/summary', getSummary);
router.get('/calendar', validate(calendarQuery, 'query'), listCalendar);
router.get('/requests', listRequests);
router.get('/requests/calendar', listRequestsCalendar);
router.get('/:id', getBooking);

// Requests
router.post('/:id/confirm', confirmBooking);
router.post('/:id/decline', declineBooking);
router.post('/:id/match', resolveMatch);

// Upcoming / Follow-up / Done / Expired / Cancelled (docs/api-bookings.md §3)
router.post('/:id/payments', validate(paymentBody), recordPayment);
router.post('/:id/reschedule', validate(rescheduleBody), rescheduleBooking);
router.post('/:id/cancel', validate(cancelBody), cancelBooking);
router.post('/:id/expire', validate(emptyBody), expireBooking);
router.post('/:id/reopen', validate(emptyBody), reopenBooking);
router.post('/:id/archive', validate(emptyBody), archiveBooking);
router.post('/:id/unarchive', validate(emptyBody), unarchiveBooking);
router.post('/:id/review-received', validate(emptyBody), markReviewReceived);
router.post('/:id/rebook-reminder', validate(rebookBody), setRebookReminder);

export default router;
