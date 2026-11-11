// Words shared by the email screens.
const TRIGGER = {
  auto: "Automatic",
  manual: "You send it",
  scheduled: "Scheduled",
};
export const triggerLabel = (t) => TRIGGER[t] ?? t;

const STATUS = {
  default: { label: "Original", className: "text-ink-muted" },
  published: { label: "Edited", className: "text-ink" },
  draft: { label: "Unpublished changes", className: "text-warning" },
};
export const statusLabel = (s) => STATUS[s] ?? STATUS.default;

export const templatePath = (key, locale) => `/settings/email-templates/${key}${locale && locale !== "en" ? `?lang=${locale}` : ""}`;
