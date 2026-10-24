import { useTranslation } from "react-i18next";
import clsx from "clsx";

import { LANGUAGES } from "constants/app.constant";

/** EN | ES. `size="lg"` is the full-width segmented control used in Profile. */
export function LanguageSwitch({ size = "sm" }) {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage;
  const lg = size === "lg";

  return (
    <div
      role="radiogroup"
      aria-label={t("language.label")}
      className={clsx("flex", lg ? "w-full border border-line p-1" : "gap-3")}
    >
      {LANGUAGES.map((lang) => {
        const on = current === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            role="radio"
            aria-checked={on}
            lang={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={clsx(
              "caps transition-colors",
              lg
                ? ["min-h-11 flex-1", on ? "bg-ink text-on-ink" : "text-ink-muted hover:text-ink"]
                : ["min-h-11", on ? "text-ink" : "text-ink-muted hover:text-ink"],
            )}
          >
            {lg ? lang.label : lang.short}
          </button>
        );
      })}
    </div>
  );
}
