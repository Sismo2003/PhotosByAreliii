// Clients Zustand store — same pattern as slices/bookings (state shape + sync actions here,
// async work in ./thunks.js). List state (tab, query, page size) is mirrored in the URL by
// app/pages/clients/useClientsUrlState.js so reload and "back from a client" land on the same list.
import { create } from "zustand";

const initialList = { items: [], total: 0, loading: false, error: null };
// sort: "" = recent activity; "name" | "received" (+ dir asc | desc).
// heardFrom / login: "" = any.
const initialQuery = { q: "", heardFrom: "", login: "", page: 1, sort: "", dir: "asc" };
const initialClient = { data: null, loading: false, error: null };

export const useClientsStore = create((set) => ({
  tab: "all", // the "Group" filter: all | upcoming | followup | past | leads
  pageSize: 25,
  list: initialList,
  query: initialQuery,
  summary: null, // GET /summary: stats + tab counts
  client: initialClient, // the profile page: { data: { client, sessions, history }, loading }
  busy: false,

  setTab: (tab) => set((s) => ({ tab, query: { ...s.query, page: 1 } })),
  clearFilters: () => set((s) => ({ tab: "all", query: { ...s.query, q: "", heardFrom: "", login: "", page: 1 } })),
  // Page size is shared by every tab; back to page 1.
  setPageSize: (pageSize) => set((s) => ({ pageSize, query: { ...s.query, page: 1 } })),
  // Any filter change goes back to the first page; an explicit page change keeps filters.
  setQuery: (next) => set((s) => ({ query: { ...s.query, page: 1, ...next } })),

  _setList: (next) => set((s) => ({ list: { ...s.list, ...next } })),
  _setSummary: (summary) => set({ summary }),
  _setClient: (next) => set((s) => ({ client: { ...s.client, ...next } })),
  resetClient: () => set({ client: initialClient }),
  _setBusy: (busy) => set({ busy }),
}));
