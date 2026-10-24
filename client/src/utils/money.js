// Money — the API always sends cents (USD). Formatted in the portal's language.
import i18n from "i18next";

/** 8750 → "$87.50", 5000 → "$50". */
export function formatCents(cents) {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat(i18n.language === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}
