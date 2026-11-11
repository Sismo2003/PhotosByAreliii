import PublicBookingModel from '../models/public-booking.model.js';
import { sendError } from '../utils/http.js';

const send = (res, status, data, message) => res.status(status).json({ message, data, error: false });

// GET /api/public/catalog
export const getCatalog = async (_req, res) => {
  try {
    // Short cache: Areli's price edits show within a minute, and a busy page doesn't hit the DB per view.
    res.set('Cache-Control', 'public, max-age=60');
    return send(res, 200, await PublicBookingModel.catalog(), 'Catalog loaded');
  } catch (error) {
    return sendError(res, error, 'Failed to load the catalog');
  }
};

// GET /api/public/availability?month=YYYY-MM&minutes=
export const getAvailability = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store'); // a time taken a second ago must not show as free
    return send(res, 200, await PublicBookingModel.availability(req.valid.query), 'Availability loaded');
  } catch (error) {
    return sendError(res, error, 'Failed to load the availability');
  }
};

// POST /api/public/bookings
export const createRequest = async (req, res) => {
  try {
    return send(res, 201, await PublicBookingModel.create(req.valid.body), 'Request sent');
  } catch (error) {
    return sendError(res, error, 'Failed to send the request');
  }
};
