import ServiceModel from '../models/service.model.js';
import { parseId, sendError } from '../utils/http.js';

const send = (res, status, data, message) => res.status(status).json({ message, data, error: false });

const handler = (run, status, message, failure) => async (req, res) => {
  try {
    return send(res, status, await run(req), message);
  } catch (error) {
    return sendError(res, error, failure);
  }
};

// GET /api/admin/services/active → [{ id, name, slug }] (Bookings' Service filter)
export const listActiveServices = handler(() => ServiceModel.listLive(), 200, 'Services loaded', 'Failed to load services');

// GET /api/admin/services/options → [{ id, name, status }] (every service, for pickers)
export const listServiceOptions = handler(() => ServiceModel.options(), 200, 'Services loaded', 'Failed to load services');

// GET /api/admin/services/summary
export const getSummary = handler(() => ServiceModel.summary(), 200, 'Summary loaded', 'Failed to load the summary');

// GET /api/admin/services?q&status&sort&dir&page&pageSize
export const listServices = handler((req) => ServiceModel.list(req.valid.query), 200, 'Services loaded', 'Failed to load services');

// GET /api/admin/services/:id
export const getService = handler((req) => ServiceModel.get(parseId(req.params.id)), 200, 'Service loaded', 'Failed to load the service');

// POST /api/admin/services
export const createService = handler((req) => ServiceModel.create(req.valid.body), 201, 'Service created', 'Failed to create the service');

// PATCH /api/admin/services/:id
export const updateService = handler((req) => ServiceModel.update(parseId(req.params.id), req.valid.body), 200, 'Service updated', 'Failed to update the service');

// DELETE /api/admin/services/:id
export const deleteService = handler((req) => ServiceModel.remove(parseId(req.params.id)), 200, 'Service deleted', 'Failed to delete the service');

// PUT /api/admin/services/order
export const reorderServices = handler((req) => ServiceModel.reorder(req.valid.body.ids), 200, 'Order saved', 'Failed to save the order');

// PUT /api/admin/services/:id/extras
export const setServiceExtras = handler((req) => ServiceModel.setExtras(parseId(req.params.id), req.valid.body.extraIds), 200, 'Add-ons saved', 'Failed to save the add-ons');

// POST /api/admin/services/:id/packages
export const createPackage = handler((req) => ServiceModel.createPackage(parseId(req.params.id), req.valid.body), 201, 'Package created', 'Failed to create the package');

// PUT /api/admin/services/:id/packages/order
export const reorderPackages = handler((req) => ServiceModel.reorderPackages(parseId(req.params.id), req.valid.body.ids), 200, 'Order saved', 'Failed to save the order');

// PATCH /api/admin/services/packages/:packageId
export const updatePackage = handler((req) => ServiceModel.updatePackage(parseId(req.params.packageId, 'package id'), req.valid.body), 200, 'Package updated', 'Failed to update the package');

// DELETE /api/admin/services/packages/:packageId
export const deletePackage = handler((req) => ServiceModel.removePackage(parseId(req.params.packageId, 'package id')), 200, 'Package deleted', 'Failed to delete the package');
