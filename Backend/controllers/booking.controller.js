import BookingModel from '../models/booking.model.js';
import { parseDayBound } from '../utils/date.js';
import { HttpError, parseId, sendError } from '../utils/http.js';
import { parseInstant } from '../validators/booking.schemas.js';

const MAX_REASON = 500;

const ok = (res, data, message) => res.status(200).json({ message, data, error: false });

// GET /api/admin/bookings/requests?q&serviceId&dateFrom&dateTo&page&pageSize
// dateFrom/dateTo filter on when the request was submitted ("YYYY-MM-DD" = studio day).
export const listRequests = async (req, res) => {
  try {
    const { q, serviceId, dateFrom, dateTo, page, pageSize } = req.query;
    const from = parseDayBound(dateFrom, 'start');
    const to = parseDayBound(dateTo, 'end');
    if ((dateFrom && !from) || (dateTo && !to)) throw new HttpError(400, 'Invalid date filter');
    const result = await BookingModel.listRequests({
      q,
      serviceId: serviceId ? parseId(serviceId, 'serviceId') : undefined,
      from,
      to,
      page,
      pageSize,
    });
    return ok(res, result, 'Requests loaded');
  } catch (error) {
    return sendError(res, error, 'Failed to load requests');
  }
};

// GET /api/admin/bookings/requests/calendar?month=YYYY-MM
export const listRequestsCalendar = async (req, res) => {
  try {
    return ok(res, await BookingModel.listRequestsCalendar(req.query.month), 'Calendar loaded');
  } catch (error) {
    return sendError(res, error, 'Failed to load calendar');
  }
};

// GET /api/admin/bookings/:id → { booking, conflictWith }
export const getBooking = async (req, res) => {
  try {
    const detail = await BookingModel.getDetail(parseId(req.params.id));
    if (!detail) throw new HttpError(404, 'Booking not found');
    return ok(res, detail, 'Booking loaded');
  } catch (error) {
    return sendError(res, error, 'Failed to load booking');
  }
};

// POST /api/admin/bookings/:id/confirm { note? } → REQUEST becomes AWAITING_DEPOSIT
export const confirmBooking = async (req, res) => {
  try {
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, MAX_REASON) : '';
    const booking = await BookingModel.confirm(parseId(req.params.id), { note: note || undefined }, req.user.id);
    return ok(res, booking, 'Booking confirmed');
  } catch (error) {
    return sendError(res, error, 'Failed to confirm booking');
  }
};

// POST /api/admin/bookings/:id/decline { reason }
export const declineBooking = async (req, res) => {
  try {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason) throw new HttpError(400, 'A reason is required to decline');
    if (reason.length > MAX_REASON) throw new HttpError(400, `Keep the reason under ${MAX_REASON} characters`);
    const booking = await BookingModel.decline(parseId(req.params.id), reason, req.user.id);
    return ok(res, booking, 'Booking declined');
  } catch (error) {
    return sendError(res, error, 'Failed to decline booking');
  }
};

// POST /api/admin/bookings/:id/match { action: looks_right | not_same | update_client | keep }
export const resolveMatch = async (req, res) => {
  try {
    const booking = await BookingModel.resolveMatch(parseId(req.params.id), req.body?.action, req.user.id);
    return ok(res, booking, 'Match reviewed');
  } catch (error) {
    return sendError(res, error, 'Failed to resolve match');
  }
};

// ─── Bookings tabs (docs/api-bookings.md) ───────────────────────────────
// Query/body already validated by validate() → req.valid.

// GET /api/admin/bookings/summary
export const getSummary = async (_req, res) => {
  try {
    return ok(res, await BookingModel.summary(), 'Summary loaded');
  } catch (error) {
    return sendError(res, error, 'Failed to load summary');
  }
};

// GET /api/admin/bookings?tab&q&serviceId&page&pageSize
export const listBookings = async (req, res) => {
  try {
    return ok(res, await BookingModel.listBookings(req.valid.query), 'Bookings loaded');
  } catch (error) {
    return sendError(res, error, 'Failed to load bookings');
  }
};

// GET /api/admin/bookings/calendar?month=YYYY-MM — requests + active bookings
export const listCalendar = async (req, res) => {
  try {
    return ok(res, await BookingModel.listCalendar(req.valid.query.month), 'Calendar loaded');
  } catch (error) {
    return sendError(res, error, 'Failed to load calendar');
  }
};

// One handler per POST /:id/<action>; `run` gets (id, body, actorId) and returns the booking.
const action = (run, done, failed) => async (req, res) => {
  try {
    const booking = await run(parseId(req.params.id), req.valid.body, req.user.id);
    return ok(res, booking, done);
  } catch (error) {
    return sendError(res, error, failed);
  }
};

export const recordPayment = action(
  (id, body, actorId) => BookingModel.recordPayment(id, body, actorId),
  'Payment recorded',
  'Failed to record payment',
);
export const rescheduleBooking = action(
  (id, body, actorId) => BookingModel.reschedule(id, parseInstant(body.startsAt), actorId),
  'Booking rescheduled',
  'Failed to reschedule booking',
);
export const cancelBooking = action(
  (id, body, actorId) => BookingModel.cancel(id, body, actorId),
  'Booking cancelled',
  'Failed to cancel booking',
);
export const expireBooking = action((id, _b, actorId) => BookingModel.expire(id, actorId), 'Booking expired', 'Failed to expire booking');
export const reopenBooking = action((id, _b, actorId) => BookingModel.reopen(id, actorId), 'Booking reopened', 'Failed to reopen booking');
export const archiveBooking = action((id, _b, actorId) => BookingModel.archive(id, actorId), 'Booking archived', 'Failed to archive booking');
export const unarchiveBooking = action(
  (id, _b, actorId) => BookingModel.unarchive(id, actorId),
  'Moved back to follow-up',
  'Failed to move booking back',
);
export const markReviewReceived = action(
  (id, _b, actorId) => BookingModel.markReviewReceived(id, actorId),
  'Review marked as received',
  'Failed to mark review',
);
export const setRebookReminder = action(
  (id, body, actorId) => BookingModel.setRebookReminder(id, body, actorId),
  'Rebook reminder saved',
  'Failed to save rebook reminder',
);
