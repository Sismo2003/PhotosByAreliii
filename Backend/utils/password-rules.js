// Password rules for a client's new password. The portal shows the same four as a checklist
// while the person types (client/src/utils/passwordRules.js — keep both in sync);
// this is the check that counts.
//   1. more than 8 characters
//   2. at least 1 uppercase letter
//   3. at least 1 number
//   4. doesn't contain the client's first or last name as we have it registered
export const PASSWORD_MIN_LENGTH_EXCLUSIVE = 8; // "more than 8"
export const PASSWORD_MAX = 128; // not a rule to show: stops a huge body from keeping argon2 busy

// "José" → "jose": case and accents don't hide a name.
const fold = (text) => String(text ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Words of the registered first/last name worth blocking. Under 3 letters they would reject
// almost every password ("Li", "Jo"). Falls back to the display name when there is no first/last.
export function nameWords({ firstName, lastName, displayName } = {}) {
  const source = [firstName, lastName].filter(Boolean).join(' ') || displayName || '';
  return [...new Set(fold(source).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3))];
}

export function checkPassword(password, names) {
  const typed = String(password ?? '');
  const folded = fold(typed);
  return {
    length: typed.length > PASSWORD_MIN_LENGTH_EXCLUSIVE,
    uppercase: /\p{Lu}/u.test(typed),
    number: /\p{Nd}/u.test(typed),
    noName: !nameWords(names).some((word) => folded.includes(word)),
  };
}

export const passwordMeetsRules = (password, names) => Object.values(checkPassword(password, names)).every(Boolean);
