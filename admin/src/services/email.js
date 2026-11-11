// Email module API — docs/correos.md. Everything under /api/admin/email (admin only).
import axios from "utils/axios";

const BASE = "/admin/email";

// ---- Settings → Email ----
export const getEmailSettings = () => axios.get(`${BASE}/settings`);
/** { smtp: { host, port, security, user, password? }, from: { name, address }, replyTo, adminNotifyEmail, dailyLimit } */
export const saveEmailSettings = (body) => axios.put(`${BASE}/settings`, body);
export const setEmailSending = (enabled) => axios.put(`${BASE}/settings/enabled`, { enabled });
/** Without `smtp`, tests the saved server. */
export const testEmailConnection = (smtp) => axios.post(`${BASE}/settings/test`, smtp ? { smtp } : {});

// ---- Templates ----
export const listEmailTemplates = () => axios.get(`${BASE}/templates`);
export const setTemplateEnabled = (key, enabled) => axios.put(`${BASE}/templates/${key}/enabled`, { enabled });
export const getEmailTemplate = (key, locale) => axios.get(`${BASE}/templates/${key}/${locale}`);
export const previewEmailTemplate = (key, locale, content, config) =>
  axios.post(`${BASE}/templates/${key}/${locale}/preview`, { content }, config);
export const saveTemplateDraft = (key, locale, content) => axios.put(`${BASE}/templates/${key}/${locale}/draft`, { content });
export const publishTemplate = (key, locale, content) => axios.post(`${BASE}/templates/${key}/${locale}/publish`, { content });
export const restoreTemplateDefault = (key, locale) => axios.post(`${BASE}/templates/${key}/${locale}/restore`);
export const restoreTemplateVersion = (key, locale, versionId) =>
  axios.post(`${BASE}/templates/${key}/${locale}/versions/${versionId}/restore`);
export const sendTemplateTest = (key, locale, content, to) => axios.post(`${BASE}/templates/${key}/${locale}/test`, { content, to });
export const sendAllTests = (locale, to) => axios.post(`${BASE}/templates/test-all`, { locale, to });

// ---- Outbox ----
export const listOutbox = (params) => axios.get(`${BASE}/outbox`, { params });
export const sendOutboxNow = (id) => axios.post(`${BASE}/outbox/${id}/send-now`);
