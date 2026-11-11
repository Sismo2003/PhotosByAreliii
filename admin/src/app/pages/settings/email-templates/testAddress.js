// The last address used for test emails, remembered per browser (docs/correos.md §6: "by default,
// the last email used"). Storage can be missing (private mode): it just starts empty then.
const KEY = "pba-email-test-to";

export function readTestAddress() {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberTestAddress(email) {
  try {
    localStorage.setItem(KEY, email);
  } catch {
    /* not remembered — fine */
  }
}
