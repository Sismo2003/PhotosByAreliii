// Async actions of the Email slice. Loads write errors to the store; mutations resolve to
// { ok, data } | { ok: false, error } so the page can toast the API's `error_message`.
import {
  getEmailSettings,
  listEmailTemplates,
  saveEmailSettings,
  sendAllTests,
  setEmailSending,
  setTemplateEnabled,
  testEmailConnection,
} from "services/email";

import { useEmailStore } from "./store";

export async function loadEmailSettingsThunk() {
  const { _setSettings } = useEmailStore.getState();
  _setSettings({ loading: true, error: null });
  try {
    const { data } = await getEmailSettings();
    _setSettings({ data: data.data, loading: false });
  } catch (err) {
    _setSettings({ loading: false, error: err.message ?? "Could not load the email settings" });
  }
}

export async function loadEmailTemplatesThunk() {
  const { _setTemplates } = useEmailStore.getState();
  _setTemplates({ loading: true, error: null });
  try {
    const { data } = await listEmailTemplates();
    _setTemplates({ data: data.data, loading: false });
  } catch (err) {
    _setTemplates({ loading: false, error: err.message ?? "Could not load the emails" });
  }
}

async function run(call, after) {
  const { _setBusy } = useEmailStore.getState();
  _setBusy(true);
  try {
    const { data } = await call();
    after?.(data.data);
    return { ok: true, data: data.data };
  } catch (err) {
    return { ok: false, error: err };
  } finally {
    useEmailStore.getState()._setBusy(false);
  }
}

const keepSettings = (data) => useEmailStore.getState()._setSettings({ data });

export const saveEmailSettingsThunk = (body) => run(() => saveEmailSettings(body), keepSettings);
export const setEmailSendingThunk = (enabled) => run(() => setEmailSending(enabled), keepSettings);
// Testing doesn't block the form (no busy flag): the button shows its own spinner.
export async function testEmailConnectionThunk(smtp) {
  try {
    const { data } = await testEmailConnection(smtp);
    if (!smtp) loadEmailSettingsThunk(); // the saved server's result is remembered (lastTest)
    return { ok: true, data: data.data };
  } catch (err) {
    return { ok: false, error: err };
  }
}

export async function setTemplateEnabledThunk(key, enabled) {
  const { _patchTemplate } = useEmailStore.getState();
  _patchTemplate(key, { enabled }); // optimistic: the switch moves at once
  try {
    await setTemplateEnabled(key, enabled);
    return { ok: true };
  } catch (err) {
    _patchTemplate(key, { enabled: !enabled });
    return { ok: false, error: err };
  }
}

export const sendAllTestsThunk = (locale, to) => run(() => sendAllTests(locale, to));
