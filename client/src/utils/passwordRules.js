// The four rules for a client's new password, checked live while they type.
// Mirror of Backend/utils/password-rules.js (the server checks again): change both together.
// Labels are i18n keys (i18n/locales/*.json → password.rules.*).
//   1. more than 8 characters
//   2. at least 1 uppercase letter
//   3. at least 1 number
//   4. doesn't contain their registered first or last name
export const RULES = [
  { key: "length", label: "password.rules.length" },
  { key: "uppercase", label: "password.rules.uppercase" },
  { key: "number", label: "password.rules.number" },
  { key: "noName", label: "password.rules.noName" },
];

// "José" → "jose": case and accents don't hide a name.
const fold = (text) => String(text ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Words of the registered name worth blocking (3+ letters; otherwise "Li" would reject
// almost every password). Falls back to the display name when there is no first/last.
export function nameWords({ firstName, lastName, displayName } = {}) {
  const source = [firstName, lastName].filter(Boolean).join(" ") || displayName || "";
  return [...new Set(fold(source).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3))];
}

export function checkPassword(password, names) {
  const typed = String(password ?? "");
  const folded = fold(typed);
  return {
    length: typed.length > 8,
    uppercase: /\p{Lu}/u.test(typed),
    number: /\p{Nd}/u.test(typed),
    noName: !nameWords(names).some((word) => folded.includes(word)),
  };
}

export const meetsAllRules = (checks) => RULES.every(({ key }) => checks[key]);
