import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createExtraBody, extraListQuery, extraServicesBody, orderBody, updateExtraBody } from '../validators/service.schemas.js';
import { createExtra, deleteExtra, getExtra, listExtras, reorderExtras, setExtraServices, updateExtra } from '../controllers/extra.controller.js';

const router = Router();

router.use(requireAdmin);

router.put('/order', validate(orderBody), reorderExtras);
router.get('/', validate(extraListQuery, 'query'), listExtras);
router.post('/', validate(createExtraBody), createExtra);
router.get('/:id', getExtra);
router.patch('/:id', validate(updateExtraBody), updateExtra);
router.delete('/:id', deleteExtra);
router.put('/:id/services', validate(extraServicesBody), setExtraServices);

export default router;
