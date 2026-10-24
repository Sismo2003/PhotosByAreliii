// The admin is English first (like the design); Spanish strings exist for the ES/EN switch.
export const locales = {
  en: {
    label: "English",
    flatpickr: null,
    i18n: () => import("./locales/en/translations.json"),
  },
  es: {
    label: "Español",
    flatpickr: () => import("flatpickr/dist/l10n/es").then((module) => module.Spanish),
    i18n: () => import("./locales/es/translations.json"),
  },
};
