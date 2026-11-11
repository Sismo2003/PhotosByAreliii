// Phone numbers — project rule: always libphonenumber-js (never regex or string slicing).
// Same helpers as client/src/utils/phone.js and admin/src/utils/phone.js; default country US.
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export const DEFAULT_COUNTRY: CountryCode = "US";

export function parsePhone(input?: string | null, country: CountryCode = DEFAULT_COUNTRY) {
  if (!input) return null;
  const phone = parsePhoneNumberFromString(String(input), country);
  return phone?.isPossible() ? phone : null;
}

/** "(480) 555-0100" for US numbers, "+52 55 1234 5678" for others. */
export function formatPhone(input?: string | null, country: CountryCode = DEFAULT_COUNTRY) {
  const phone = parsePhone(input, country);
  if (!phone) return input ?? "";
  return phone.country === country ? phone.formatNational() : phone.formatInternational();
}

/** "tel:+14805550100". */
export const telHref = (input?: string | null) => {
  const e164 = parsePhone(input)?.number;
  return e164 ? `tel:${e164}` : undefined;
};

/** "sms:+14805550100?&body=…" (the "?&" form works on both iOS and Android). */
export const smsHref = (input?: string | null, body = "") => {
  const e164 = parsePhone(input)?.number;
  return e164 ? `sms:${e164}${body ? `?&body=${encodeURIComponent(body)}` : ""}` : undefined;
};
