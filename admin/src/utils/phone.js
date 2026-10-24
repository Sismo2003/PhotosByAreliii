// Phone numbers — project rule: always libphonenumber-js (never regex or string slicing).
// Clients are matched by the E.164 form (database/handoff.md §4.4, Client.phoneE164);
// default country US (the studio is in Arizona).
import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js";

export const DEFAULT_COUNTRY = "US";

/** Parse what someone typed; null if it isn't a possible number. */
export function parsePhone(input, country = DEFAULT_COUNTRY) {
  if (!input) return null;
  const phone = parsePhoneNumberFromString(String(input), country);
  return phone?.isPossible() ? phone : null;
}

/** "+14805550100" — the identifier stored in Client.phoneE164. */
export const toE164 = (input, country) => parsePhone(input, country)?.number ?? null;

/** "(480) 555-0100" for US numbers, "+52 55 1234 5678" for others. */
export function formatPhone(input, country = DEFAULT_COUNTRY) {
  const phone = parsePhone(input, country);
  if (!phone) return input ?? "";
  return phone.country === country ? phone.formatNational() : phone.formatInternational();
}

/** For yup: `.test("phone", "Enter a valid phone number.", isValidPhone)`. */
export const isValidPhone = (input, country = DEFAULT_COUNTRY) =>
  !input || !!parsePhoneNumberFromString(String(input), country)?.isValid();

/** "tel:+14805550100" for links. */
export const telHref = (input, country) => {
  const e164 = toE164(input, country);
  return e164 ? `tel:${e164}` : undefined;
};

/**
 * For inputs: "4802898309" → "(480) 555-0100" while typing (AsYouType, US by default; a leading
 * "+" keeps international numbers). Pass the previous value so Backspace over a separator —
 * "(480) " → "(480)" — removes the digit before it instead of re-adding the separator.
 */
export function formatPhoneInput(next, previous = "", country = DEFAULT_COUNTRY) {
  const digits = (v) => String(v ?? "").replace(/\D/g, "");
  const intl = String(next ?? "").trim().startsWith("+");
  let nums = digits(next);
  // Backspace over a separator changed no digit: remove the last digit instead.
  if (next.length < previous.length && nums === digits(previous)) nums = nums.slice(0, -1);
  nums = nums.slice(0, 15);
  if (!nums) return intl ? "+" : "";
  return new AsYouType(country).input(intl ? `+${nums}` : nums);
}
