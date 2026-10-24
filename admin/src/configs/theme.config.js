// Default display settings. The palette itself is fixed by the Photos By Areliii design
// system (styles/index.css); only these preferences can be changed from the Customizer.
export const defaultTheme = {
  themeMode: "light",
  // Options: "light", "dark", "system". The design is white-first, so light is the default.

  themeLayout: "sideblock",
  // Options: "sideblock" (the design, default), "main-layout" (template icon rail + panel)

  cardSkin: "bordered",
  // Options: "bordered" (hairline rules, as in the design), "shadow-sm"

  // Language settings
  defaultLang: "en",
  fallbackLang: "en",

  // Notification settings
  notification: {
    isExpanded: false,
    position: "bottom-right",
    visibleToasts: 4,
  },
};
