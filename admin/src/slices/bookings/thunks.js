// Async actions for the Bookings slice — mirrors slices/<domain>/thunk.js in
// rebate/FrontEnd. Each function reads/writes the store via getState()/setState() and
// surfaces errors through the store (loads) or as { ok, error } (mutations) so the UI can react.
import { useBookingsStore } from "./store";
import {
  getRequests,
  getSummary,
  listBookings,
  getCalendar,
  getBooking,
  confirmBooking,
  declineBooking,
  resolveMatch,
  recordPayment,
  rescheduleBooking,
  cancelBooking,
  expireBooking,
  reopenBooking,
  archiveBooking,
  unarchiveBooking,
  markReviewReceived,
  setRebookReminder,
} from "services/bookings";

// ---------------------------------------------------------------------------
// Loads
// ---------------------------------------------------------------------------

export async function loadRequestsThunk() {
  const { page, pageSize, _setRequests, _setLoading, _setError } =
    useBookingsStore.getState();
  _setLoading(true);
  try {
    const { data } = await getRequests({ page, pageSize });
    _setRequests(data.data);
  } catch (err) {
    _setRequests({ items: [], total: 0, summary: null });
    _setError(err.message ?? "Could not load requests");
  }
}

export async function loadSummaryThunk() {
  const { _setSummary } = useBookingsStore.getState();
  try {
    const { data } = await getSummary();
    _setSummary(data.data ?? null);
  } catch {
    _setSummary(null);
  }
}

// Ignore responses that arrive after the tab/filters changed again (fast typing in Search).
let listRequestSeq = 0;

export async function loadListThunk() {
  const { tab, query, pageSize, _setList } = useBookingsStore.getState();
  if (tab === "requests") return;
  const seq = ++listRequestSeq;
  _setList({ loading: true, error: null });
  try {
    const { data } = await listBookings({ tab, ...query, pageSize });
    if (seq !== listRequestSeq) return;
    _setList({
      items: data.data?.items ?? [],
      total: data.data?.total ?? 0,
      loading: false,
    });
  } catch (err) {
    if (seq !== listRequestSeq) return;
    _setList({ items: [], total: 0, loading: false, error: err.message ?? "Could not load bookings" });
  }
}

export async function loadCalendarThunk() {
  const { calendar, _setCalendar, _setCalendarLoading } =
    useBookingsStore.getState();
  _setCalendarLoading(true);
  try {
    const { data } = await getCalendar(calendar.month);
    _setCalendar({ days: data.data?.days ?? [] });
  } catch {
    _setCalendar({ days: [] });
  }
}

export async function loadServicesThunk() {
  const { _setServices } = useBookingsStore.getState();
  try {
    const res = await fetch("/api/admin/services/active", {
      credentials: "include",
    });
    if (!res.ok) throw new Error("services endpoint unavailable");
    const body = await res.json();
    _setServices(Array.isArray(body?.data) ? body.data : []);
  } catch {
    _setServices([]);
  }
}

export async function loadBookingThunk(id) {
  const { _setBooking, _setBookingLoading } = useBookingsStore.getState();
  _setBookingLoading(true);
  try {
    const { data } = await getBooking(id);
    // The drawer moved on to another booking (or closed) while this one was loading.
    if (useBookingsStore.getState().bookingId !== id) return;
    _setBooking({ booking: data.data.booking, conflictWith: data.data.conflictWith });
  } catch {
    if (useBookingsStore.getState().bookingId !== id) return;
    _setBooking({ booking: null, conflictWith: null });
  }
}

// Everything a mutation can change: the open list, the header stats/tab counts and the calendar.
async function refreshAfterMutation() {
  const { tab, view } = useBookingsStore.getState();
  await Promise.all([
    tab === "requests" ? loadRequestsThunk() : loadListThunk(),
    loadSummaryThunk(),
    view === "calendar" ? loadCalendarThunk() : null,
  ]);
}

// Shared runner: marks the booking busy, calls the API, then refreshes. `keepOpen` reloads the
// detail so the drawer shows the new state (e.g. Upcoming → Confirmed); otherwise it closes.
async function runAction(id, call, { keepOpen = true } = {}) {
  const { _setBusy, closeBooking } = useBookingsStore.getState();
  _setBusy(id);
  try {
    const { data } = await call();
    if (keepOpen) await loadBookingThunk(id);
    else closeBooking();
    await refreshAfterMutation();
    return { ok: true, data: data?.data };
  } catch (err) {
    return { ok: false, error: err };
  } finally {
    _setBusy(null);
  }
}

// ---------------------------------------------------------------------------
// Request actions
// ---------------------------------------------------------------------------

// Stays open: the booking page then shows the new stage (Request → Deposit).
export const confirmBookingThunk = (id) => runAction(id, () => confirmBooking(id));

export const declineBookingThunk = (id, reason) =>
  runAction(id, () => declineBooking(id, reason), { keepOpen: false });

export const resolveMatchThunk = (id, action) => runAction(id, () => resolveMatch(id, action));

// ---------------------------------------------------------------------------
// Session actions (docs/api-bookings.md §3)
// ---------------------------------------------------------------------------

export const recordPaymentThunk = (id, body) => runAction(id, () => recordPayment(id, body));

export const rescheduleBookingThunk = (id, startsAt) =>
  runAction(id, () => rescheduleBooking(id, startsAt));

export const cancelBookingThunk = (id, body) => runAction(id, () => cancelBooking(id, body));

export const expireBookingThunk = (id) => runAction(id, () => expireBooking(id));

export const reopenBookingThunk = (id) => runAction(id, () => reopenBooking(id));

export const archiveBookingThunk = (id) => runAction(id, () => archiveBooking(id));

export const unarchiveBookingThunk = (id) => runAction(id, () => unarchiveBooking(id));

export const reviewReceivedThunk = (id) => runAction(id, () => markReviewReceived(id));

export const setRebookReminderThunk = (id, body) =>
  runAction(id, () => setRebookReminder(id, body));
