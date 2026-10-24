// English copy of the Clients pages (design: AdminClients.dc.html). The backend sends keys and
// tones (Backend/services/client-derive.js); this file turns them into text. Money arrives in
// integer cents; dates as UTC ISO strings (reminder `dueOn` is a plain studio day).
import { formatDate } from "utils/date";

import { statusLabel as bookingStatusLabel, money } from "../bookings/labels";

export { money };
export { HEARD_FROM } from "../bookings/new/options";

export const TABS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "followup", label: "Follow-up" },
  { id: "past", label: "Past clients" },
  { id: "leads", label: "Leads" },
];

export const EMPTY_TEXT = {
  all: "No clients yet. Add one, or wait for the first booking request.",
  upcoming: "Nobody has a session coming up.",
  followup: "Every client is taken care of.",
  past: "No past clients yet.",
  leads: "No leads right now.",
};

export const NO_MATCH_TEXT = "No clients match. Try fewer filters or another search.";

/** Toolbar "Sort" choices → store `sort` + `dir`. */
export const SORT_OPTIONS = [
  { id: "recent", label: "Recent activity", sort: "", dir: "asc" },
  { id: "name", label: "Name A–Z", sort: "name", dir: "asc" },
  { id: "received", label: "Most received", sort: "received", dir: "desc" },
];

export const sortOptionId = ({ sort, dir }) =>
  SORT_OPTIONS.find((o) => o.sort === (sort || "") && (o.sort === "" || o.dir === dir))?.id ?? "custom";

// ---------------------------------------------------------------------------
// Status (the one line of the Status column) and gallery login
// ---------------------------------------------------------------------------

const CLIENT_STATUS = {
  past_client: "Past client",
  new_request: "New request",
  lead_cancelled: "Lead · cancelled",
  lead_expired: "Lead · expired",
  no_session: "No session yet",
};

/** client.status → "Confirmed", "Balance due $80", "Past client", "Lead · expired"… */
export function clientStatusLabel(status) {
  if (!status) return "—";
  if (CLIENT_STATUS[status.key]) return CLIENT_STATUS[status.key];
  // A late deposit is an alert-toned "awaiting deposit".
  if (status.key === "awaiting_deposit" && status.tone === "alert") return "Deposit overdue";
  return bookingStatusLabel({ derived: { status, balanceCents: status.amountCents } });
}

const LOGIN = {
  none: { label: "No login yet", tone: "muted" },
  invited: { label: "Invite sent", tone: "pending" },
  active: { label: "Active", tone: "done" },
};

export const LOGIN_OPTIONS = [
  { value: "none", label: LOGIN.none.label },
  { value: "invited", label: LOGIN.invited.label },
  { value: "active", label: LOGIN.active.label },
];

export const loginInfo = (login) => LOGIN[login?.state] ?? LOGIN.none;

/** "Invite sent Sep 8" / "Last signed in Sep 21" — the date that goes with the state, if any. */
export function loginDetail(login) {
  if (login?.state === "active" && login.lastLoginAt) return `Last signed in ${formatDate(login.lastLoginAt, "LLL d")}`;
  if (login?.state === "invited" && login.invitedAt) return `Invite sent ${formatDate(login.invitedAt, "LLL d")}`;
  return null;
}

/** "2 sessions" / "1 session" / "No session yet". */
export const sessionsLabel = (n) => (n > 0 ? `${n} ${n === 1 ? "session" : "sessions"}` : "No session yet");
