// Bookings Zustand store — mirrors the slices/<domain>/store.js pattern used in
// rebate/FrontEnd (Redux Toolkit + thunks), translated to Zustand. Async work lives in
// ./thunks.js; this file only owns state shape and synchronous actions.
//
// React components subscribe with selectors, e.g.:
//   const items = useBookingsStore((s) => s.requests.items);
//   const loading = useBookingsStore((s) => s.loading);
import { create } from "zustand";
import { nowInStudio } from "utils/date";

const initialRequests = { items: [], total: 0, summary: null };
const initialList = { items: [], total: 0, loading: false, error: null };
// sort: "" = the tab's own order; otherwise date | client | service | total (+ dir asc | desc).
const initialQuery = { q: "", serviceId: "", page: 1, sort: "", dir: "asc" };
const initialCalendar = { days: [], month: nowInStudio().toFormat("yyyy-LL"), loading: false };
const initialBooking = { booking: null, conflictWith: null, loading: false };

// Earliest month the calendar can show. The studio opens 2026-10-01 so we clamp there.
// Anything before this is rejected by setMonth so callers can't bypass the UI guard.
export const CALENDAR_MIN_MONTH = "2026-10";
function monthKey(month) {
  const [y, m] = month.split("-").map(Number);
  return y * 12 + (m - 1);
}
const CALENDAR_MIN_KEY = monthKey(CALENDAR_MIN_MONTH);

export const useBookingsStore = create((set, get) => ({
  // Active tab (docs/api-bookings.md §1): requests | upcoming | followup | done | expired | cancelled
  tab: "requests",
  view: "list", // "list" | "calendar"

  // Requests tab — client-side TanStack table over /requests
  page: 1,
  pageSize: 25,
  requests: initialRequests,
  // Sorting / search / filters of the Requests table. Kept here (not in component state) so
  // they survive the round trip to the booking page (/bookings/:id) and back.
  requestsTable: { sorting: [], globalFilter: "", columnFilters: [] },
  loading: false,
  error: null,

  // Other tabs — server-side search, Service filter and pagination over GET /?tab=
  list: initialList,
  query: initialQuery,

  // Header stats + tab counts (GET /summary)
  summary: null,

  // Calendar state (GET /calendar?month=)
  calendar: initialCalendar,

  // Service options for the filters (loaded lazily)
  services: [],

  // Drawer state — booking detail fetched on demand; `busyId` tracks which booking is acting.
  bookingId: null,
  booking: initialBooking,
  busyId: null,

  // ---- Tab / page ----
  setTab: (tab) =>
    set({
      tab,
      view: "list",
      requests: initialRequests,
      list: initialList,
      query: { ...get().query, page: 1, sort: "", dir: "asc" },
      bookingId: null,
    }),
  setView: (view) => set({ view }),
  setPage: (page) => set({ page }),
  // Page size is shared by every tab (Requests and the server-side lists); back to page 1.
  setPageSize: (pageSize) =>
    set((s) => ({ pageSize, page: 1, query: { ...s.query, page: 1 } })),
  setRequestsTable: (key, updater) =>
    set((s) => {
      const prev = s.requestsTable[key];
      const next = typeof updater === "function" ? updater(prev) : updater;
      return { requestsTable: { ...s.requestsTable, [key]: next } };
    }),
  setQuery: (next) =>
    set((s) => ({
      // Any filter change goes back to the first page; an explicit page change keeps filters.
      query: { ...s.query, page: 1, ...next },
    })),
  setMonth: (month) =>
    set((s) => ({
      calendar: {
        ...s.calendar,
        month: monthKey(month) < CALENDAR_MIN_KEY ? CALENDAR_MIN_MONTH : month,
      },
    })),

  // ---- Drawer / request view (both load one booking by id) ----
  openBooking: (id) => set({ bookingId: id, booking: { ...initialBooking, loading: true } }),
  closeBooking: () =>
    set({ bookingId: null, booking: initialBooking, busyId: null }),

  // ---- Internal setters (used by thunks) ----
  _setRequests: (next) =>
    set((s) => ({ requests: { ...s.requests, ...next }, loading: false, error: null })),
  _setLoading: (loading) => set({ loading, error: loading ? null : get().error }),
  _setError: (error) => set({ error, loading: false }),
  _setList: (next) => set((s) => ({ list: { ...s.list, ...next } })),
  _setSummary: (summary) => set({ summary }),
  _setCalendar: (next) =>
    set((s) => ({ calendar: { ...s.calendar, ...next, loading: false } })),
  _setCalendarLoading: (loading) =>
    set((s) => ({ calendar: { ...s.calendar, loading } })),
  _setServices: (services) => set({ services }),
  _setBooking: (next) =>
    set((s) => ({ booking: { ...s.booking, ...next, loading: false } })),
  _setBookingLoading: (loading) =>
    set((s) => ({ booking: { ...s.booking, loading } })),
  _setBusy: (busyId) => set({ busyId }),
}));
