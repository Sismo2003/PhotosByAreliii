// English by default, Spanish too (docs/portal-cliente-plan.md §1.4). The choice is remembered in
// this browser; saving it on the account (Client.locale, used for emails) comes with PATCH /me.
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import { setDateLocale } from "utils/date";
import en from "./locales/en.json";
import es from "./locales/es.json";

export const LANG_STORAGE_KEY = "pba-client-lang";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, es: { translation: es } },
    fallbackLng: "en",
    supportedLngs: ["en", "es"],
    nonExplicitSupportedLngs: true, // "es-MX" → es
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

const apply = (lng) => {
  const code = lng?.startsWith("es") ? "es" : "en";
  document.documentElement.lang = code;
  setDateLocale(code);
};
apply(i18n.resolvedLanguage);
i18n.on("languageChanged", apply);

export default i18n;
