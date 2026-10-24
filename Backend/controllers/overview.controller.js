import OverviewModel from '../models/overview.model.js';
import { sendError } from '../utils/http.js';

const send = (res, status, data, message) => res.status(status).json({ message, data, error: false });

const handler = (run, message, failure) => async (req, res) => {
  try {
    return send(res, 200, await run(req), message);
  } catch (error) {
    return sendError(res, error, failure);
  }
};

export const getBookings = handler(() => OverviewModel.bookings(), 'Overview loaded', 'Failed to load the overview');
export const getStorage = handler((req) => OverviewModel.storage({ fresh: Boolean(req.query.fresh) }), 'Storage loaded', 'Failed to read the storage');
export const getVisits = handler(() => OverviewModel.visits(), 'Visits loaded', 'Failed to load the visits');
