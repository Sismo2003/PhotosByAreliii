import ExtraModel from '../models/extra.model.js';
import { parseId, sendError } from '../utils/http.js';

const send = (res, status, data, message) => res.status(status).json({ message, data, error: false });

const handler = (run, status, message, failure) => async (req, res) => {
  try {
    return send(res, status, await run(req), message);
  } catch (error) {
    return sendError(res, error, failure);
  }
};

// GET /api/admin/extras?q&active&serviceId&sort&dir&page&pageSize
export const listExtras = handler((req) => ExtraModel.list(req.valid.query), 200, 'Add-ons loaded', 'Failed to load add-ons');

// GET /api/admin/extras/:id
export const getExtra = handler((req) => ExtraModel.get(parseId(req.params.id)), 200, 'Add-on loaded', 'Failed to load the add-on');

// POST /api/admin/extras
export const createExtra = handler((req) => ExtraModel.create(req.valid.body), 201, 'Add-on created', 'Failed to create the add-on');

// PATCH /api/admin/extras/:id
export const updateExtra = handler((req) => ExtraModel.update(parseId(req.params.id), req.valid.body), 200, 'Add-on updated', 'Failed to update the add-on');

// DELETE /api/admin/extras/:id
export const deleteExtra = handler((req) => ExtraModel.remove(parseId(req.params.id)), 200, 'Add-on deleted', 'Failed to delete the add-on');

// PUT /api/admin/extras/order
export const reorderExtras = handler((req) => ExtraModel.reorder(req.valid.body.ids), 200, 'Order saved', 'Failed to save the order');

// PUT /api/admin/extras/:id/services
export const setExtraServices = handler((req) => ExtraModel.setServices(parseId(req.params.id), req.valid.body.serviceIds), 200, 'Services saved', 'Failed to save the services');
