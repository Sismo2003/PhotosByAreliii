// Services Zustand store — same pattern as slices/clients (state + sync actions here, async work
// in ./thunks.js). Two lists share the page: services and add-ons (`view`). List state is mirrored
// in the URL by app/pages/services/useServicesUrlState.js.
import { create } from "zustand";

const initialList = { items: [], total: 0, loading: false, error: null };
const initialQuery = { q: "", status: "", sort: "", dir: "asc", page: 1 };
const initialAddonQuery = { q: "", active: "", serviceId: "", sort: "", dir: "asc", page: 1 };
const initialService = { data: null, loading: false, error: null };

export const useServicesStore = create((set) => ({
  view: "services", // services | addons
  pageSize: 25,
  list: initialList,
  query: initialQuery,
  addons: initialList,
  addonQuery: initialAddonQuery,
  summary: null,
  options: [], // every service, for the add-on dialog and filter
  service: initialService, // the detail page
  busy: false,

  setView: (view) => set({ view }),
  setPageSize: (pageSize) => set((s) => ({ pageSize, query: { ...s.query, page: 1 }, addonQuery: { ...s.addonQuery, page: 1 } })),
  setQuery: (next) => set((s) => ({ query: { ...s.query, page: 1, ...next } })),
  setAddonQuery: (next) => set((s) => ({ addonQuery: { ...s.addonQuery, page: 1, ...next } })),
  clearFilters: () => set((s) => ({ query: { ...s.query, q: "", status: "", page: 1 } })),
  clearAddonFilters: () => set((s) => ({ addonQuery: { ...s.addonQuery, q: "", active: "", serviceId: "", page: 1 } })),

  _setList: (next) => set((s) => ({ list: { ...s.list, ...next } })),
  _setAddons: (next) => set((s) => ({ addons: { ...s.addons, ...next } })),
  _setSummary: (summary) => set({ summary }),
  _setOptions: (options) => set({ options }),
  _setService: (next) => set((s) => ({ service: { ...s.service, ...next } })),
  resetService: () => set({ service: initialService }),
  _setBusy: (busy) => set({ busy }),
}));
