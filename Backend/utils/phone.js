// Phone numbers — project rule: always libphonenumber-js (never regex or string slicing).
// Same helpers as admin/src/utils/phone.js. Default country US (the studio is in Arizona).
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export const DEFAULT_COUNTRY = 'US';

/** Parse what someone typed; null unless it is a valid number. */
export function parsePhone(input, country = DEFAULT_COUNTRY) {
  if (!input) return null;
  const phone = parsePhoneNumberFromString(String(input), country);
  return phone?.isValid() ? phone : null;
}

/** "+14805550100" — the form stored in phoneE164 columns. */
export const toE164 = (input, country) => parsePhone(input, country)?.number ?? null;

/** "(480) 555-0100" for US numbers, "+52 55 1234 5678" for others; as typed if it can't be parsed. */
export function formatPhone(input, country = DEFAULT_COUNTRY) {
  const phone = parsePhone(input, country);
  if (!phone) return input ?? '';
  return phone.country === country ? phone.formatNational() : phone.formatInternational();
}
