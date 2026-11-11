import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  contentBody,
  enabledBody,
  outboxQuery,
  settingsBody,
  testAllBody,
  testBody,
  testConnectionBody,
} from '../validators/email.schemas.js';
import {
  getEmailSettings,
  getTemplate,
  listOutbox,
  listTemplates,
  previewTemplate,
  publishTemplate,
  restoreDefault,
  restoreVersion,
  saveDraft,
  sendOutboxNow,
  setSending,
  setTemplateEnabled,
  testAll,
  testConnection,
  testTemplate,
  updateEmailSettings,
} from '../controllers/email.controller.js';

const router = Router();

router.use(requireAdmin);

// Settings → Email
router.get('/settings', getEmailSettings);
router.put('/settings', validate(settingsBody), updateEmailSettings);
router.put('/settings/enabled', validate(enabledBody), setSending);
router.post('/settings/test', validate(testConnectionBody), testConnection);

// Settings → Email templates (fixed paths before /:key)
router.get('/templates', listTemplates);
router.post('/templates/test-all', validate(testAllBody), testAll);
router.put('/templates/:key/enabled', validate(enabledBody), setTemplateEnabled);
router.get('/templates/:key/:locale', getTemplate);
router.post('/templates/:key/:locale/preview', validate(contentBody), previewTemplate);
router.put('/templates/:key/:locale/draft', validate(contentBody), saveDraft);
router.post('/templates/:key/:locale/publish', validate(contentBody), publishTemplate);
router.post('/templates/:key/:locale/restore', restoreDefault);
router.post('/templates/:key/:locale/versions/:versionId/restore', restoreVersion);
router.post('/templates/:key/:locale/test', validate(testBody), testTemplate);

// Outbox (the Mail screen's "Sent" tab builds on this in phase 2)
router.get('/outbox', validate(outboxQuery, 'query'), listOutbox);
router.post('/outbox/:id/send-now', sendOutboxNow);

export default router;
