import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createPackageBody,
  createServiceBody,
  orderBody,
  serviceExtrasBody,
  serviceListQuery,
  updatePackageBody,
  updateServiceBody,
} from '../validators/service.schemas.js';
import {
  createPackage,
  createService,
  deletePackage,
  deleteService,
  getService,
  getSummary,
  listActiveServices,
  listServiceOptions,
  listServices,
  reorderPackages,
  reorderServices,
  setServiceExtras,
  updatePackage,
  updateService,
} from '../controllers/service.controller.js';

const router = Router();

router.use(requireAdmin);

// Fixed paths before /:id, or "summary" would be read as an id.
router.get('/active', listActiveServices);
router.get('/options', listServiceOptions);
router.get('/summary', getSummary);
router.put('/order', validate(orderBody), reorderServices);
router.patch('/packages/:packageId', validate(updatePackageBody), updatePackage);
router.delete('/packages/:packageId', deletePackage);

router.get('/', validate(serviceListQuery, 'query'), listServices);
router.post('/', validate(createServiceBody), createService);
router.get('/:id', getService);
router.patch('/:id', validate(updateServiceBody), updateService);
router.delete('/:id', deleteService);
router.put('/:id/extras', validate(serviceExtrasBody), setServiceExtras);
router.post('/:id/packages', validate(createPackageBody), createPackage);
router.put('/:id/packages/order', validate(orderBody), reorderPackages);

export default router;
