// The sign-in field takes an email OR a phone number. While typing we only need to know which one
// it is going to be: something made of digits and phone punctuation (+ ( ) - . space) is a phone,
// anything with a letter or "@" is an email. The phone itself is formatted and validated with
// libphonenumber-js (utils/phone.js) — this only picks the path.
import { formatPhoneInput } from "utils/phone";

const PHONE_CHARS = /^[\d\s()+.-]*$/;

/** "phone" | "email" | null (nothing typed yet, or just "+"). */
export function identifierKind(value = "") {
  const v = String(value).trim();
  if (!v) return null;
  if (PHONE_CHARS.test(v)) return /\d/.test(v) ? "phone" : null;
  return "email";
}

/** What the field shows after a keystroke: a phone formatted as you type, an email without spaces. */
export function formatIdentifierInput(next, previous = "") {
  const kind = identifierKind(next);
  if (kind === "phone") return formatPhoneInput(next, previous);
  return String(next).replace(/\s/g, ""); // an email never has spaces; otherwise left as typed
}
