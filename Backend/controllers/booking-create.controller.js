import BookingCreateModel from '../models/booking-create.model.js';
import { sendError } from '../utils/http.js';

const send = (res, status, data, message) => res.status(status).json({ message, data, error: false });

// GET /api/admin/bookings/new/catalog
export const getCatalog = async (_req, res) => {
  try {
    return send(res, 200, await BookingCreateModel.catalog(), 'Catalog loaded');
  } catch (error) {
    return sendError(res, error, 'Failed to load the catalog');
  }
};

// GET /api/admin/bookings/new/clients?q=
export const searchClients = async (req, res) => {
  try {
    return send(res, 200, await BookingCreateModel.searchClients(req.valid.query.q), 'Clients loaded');
  } catch (error) {
    return sendError(res, error, 'Failed to search clients');
  }
};

// GET /api/admin/bookings/new/client-lookup?email=&phone=
export const lookupClient = async (req, res) => {
  try {
    return send(res, 200, await BookingCreateModel.lookupClient(req.valid.query), 'Lookup done');
  } catch (error) {
    return sendError(res, error, 'Failed to look up the client');
  }
};

// POST /api/admin/bookings
export const createBooking = async (req, res) => {
  try {
    return send(res, 201, await BookingCreateModel.create(req.valid.body, req.user.id), 'Booking created');
  } catch (error) {
    return sendError(res, error, 'Failed to create the booking');
  }
};
