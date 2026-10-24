// Bookings API — contract in docs/api-bookings.md (database/handoff.md §4.4–§5.2).
// All endpoints are under /api/admin/bookings (mounted in Backend/app.js with requireAdmin).
// Money always travels as integer cents; dates as UTC ISO strings.
import axios from "utils/axios";

const BASE = "/admin/bookings";

// ---- Requests tab (first iteration) ----

export const getRequests = ({ q, serviceId, dateFrom, dateTo, page = 1, pageSize = 25 } = {}) =>
  axios.get(`${BASE}/requests`, {
    params: { q, serviceId, dateFrom, dateTo, page, pageSize },
  });

export const getRequestsCalendar = (month /* "YYYY-MM" */) =>
  axios.get(`${BASE}/requests/calendar`, { params: { month } });

// ---- Reads ----

/** Header stats + tab counts. */
export const getSummary = () => axios.get(`${BASE}/summary`);

/** One tab of the list: requests | upcoming | followup | done | expired | cancelled. */
export const listBookings = ({ tab, q, serviceId, page = 1, pageSize = 25, sort, dir }) =>
  axios.get(BASE, {
    params: {
      tab,
      q: q || undefined,
      serviceId: serviceId || undefined,
      page,
      pageSize,
      sort: sort || undefined,
      dir: sort ? dir : undefined,
    },
  });

/** Requests + active sessions for one "YYYY-MM" month, grouped by studio day. */
export const getCalendar = (month) => axios.get(`${BASE}/calendar`, { params: { month } });

export const getBooking = (id) => axios.get(`${BASE}/${id}`);

// ---- Request actions ----

export const confirmBooking = (id, { note } = {}) =>
  axios.post(`${BASE}/${id}/confirm`, { note });

export const declineBooking = (id, reason) =>
  axios.post(`${BASE}/${id}/decline`, { reason });

export const resolveMatch = (id, action) =>
  axios.post(`${BASE}/${id}/match`, { action });

// ---- Session actions (each returns the booking with `derived`) ----

/** { kind: DEPOSIT|BALANCE, method: ZELLE|CASH_APP|CASH, amountCents, note? } */
export const recordPayment = (id, body) => axios.post(`${BASE}/${id}/payments`, body);

/** { startsAt } — UTC ISO */
export const rescheduleBooking = (id, startsAt) =>
  axios.post(`${BASE}/${id}/reschedule`, { startsAt });

/** { reason: CancelReason, deposit: "keep" | "refund" } */
export const cancelBooking = (id, { reason, deposit }) =>
  axios.post(`${BASE}/${id}/cancel`, { reason, deposit });

export const expireBooking = (id) => axios.post(`${BASE}/${id}/expire`);

export const reopenBooking = (id) => axios.post(`${BASE}/${id}/reopen`);

export const archiveBooking = (id) => axios.post(`${BASE}/${id}/archive`);

export const unarchiveBooking = (id) => axios.post(`${BASE}/${id}/unarchive`);

export const markReviewReceived = (id) => axios.post(`${BASE}/${id}/review-received`);

/** { kind: RebookKind | null, dueOn?: "YYYY-MM-DD", label? } — null closes open reminders. */
export const setRebookReminder = (id, body) =>
  axios.post(`${BASE}/${id}/rebook-reminder`, body);

// ---- New booking (manual, admin only) — docs/nuevo-booking-admin.md ----

/** Services + packages + extras + studio numbers for the New booking form. */
export const getNewBookingCatalog = () => axios.get(`${BASE}/new/catalog`);

/** Typeahead over existing clients (name, email or phone). */
export const searchClientsForBooking = (q) => axios.get(`${BASE}/new/clients`, { params: { q } });

/** Is this email / phone already a client? → { client, matchedBy, conflict } */
export const lookupClientForBooking = ({ email, phone }) =>
  axios.get(`${BASE}/new/client-lookup`, { params: { email, phone } });

/** Creates the client (or reuses the existing one) and the booking in one call. */
export const createManualBooking = (body) => axios.post(BASE, body);
