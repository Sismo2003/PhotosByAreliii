import ClientModel from '../models/client.model.js';
import { parseId, sendError } from '../utils/http.js';

const send = (res, status, data, message) => res.status(status).json({ message, data, error: false });

const handler = (run, status, message, failure) => async (req, res) => {
  try {
    return send(res, status, await run(req), message);
  } catch (error) {
    return sendError(res, error, failure);
  }
};

// GET /api/admin/clients/summary
export const getSummary = handler(() => ClientModel.summary(), 200, 'Summary loaded', 'Failed to load the summary');

// GET /api/admin/clients?tab&q&sort&dir&page&pageSize
export const listClients = handler((req) => ClientModel.list(req.valid.query), 200, 'Clients loaded', 'Failed to load clients');

// GET /api/admin/clients/:id
export const getClient = handler((req) => ClientModel.get(parseId(req.params.id)), 200, 'Client loaded', 'Failed to load the client');

// POST /api/admin/clients
export const createClient = handler((req) => ClientModel.create(req.valid.body, req.user.id), 201, 'Client created', 'Failed to create the client');

// PATCH /api/admin/clients/:id
export const updateClient = handler(
  (req) => ClientModel.update(parseId(req.params.id), req.valid.body, req.user.id),
  200,
  'Client updated',
  'Failed to update the client',
);

// PUT /api/admin/clients/:id/rebook-reminder
export const setReminder = handler(
  (req) => ClientModel.setReminder(parseId(req.params.id), req.valid.body, req.user.id),
  200,
  'Rebook reminder saved',
  'Failed to save the rebook reminder',
);

// DELETE /api/admin/clients/:id  (soft delete)
export const deleteClient = handler((req) => ClientModel.remove(parseId(req.params.id), req.user.id), 200, 'Client deleted', 'Failed to delete the client');

// POST /api/admin/clients/:id/restore
export const restoreClient = handler((req) => ClientModel.restore(parseId(req.params.id), req.user.id), 200, 'Client restored', 'Failed to restore the client');
