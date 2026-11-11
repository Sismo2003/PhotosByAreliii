// Public surface of the Email slice.
export { useEmailStore } from "./store";
export {
  loadEmailSettingsThunk,
  loadEmailTemplatesThunk,
  saveEmailSettingsThunk,
  setEmailSendingThunk,
  testEmailConnectionThunk,
  setTemplateEnabledThunk,
  sendAllTestsThunk,
} from "./thunks";
