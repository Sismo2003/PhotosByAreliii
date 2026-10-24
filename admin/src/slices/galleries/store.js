// Galleries Zustand store — same pattern as slices/clients. The list state (tab, query, page size)
// is mirrored in the URL by app/pages/galleries/useGalleriesUrlState.js; the editor page keeps
// the open gallery in `gallery.data` and every action answers with the fresh gallery.
import { create } from "zustand";

const initialList = { items: [], total: 0, loading: false, error: null };
// sort: newest | oldest | size | title
const initialQuery = { q: "", page: 1, sort: "newest" };
const initialGallery = { data: null, loading: false, error: null };

export const useGalleriesStore = create((set) => ({
  tab: "all", // the "State" filter: all | draft | delivered | expired
  pageSize: 25,
  list: initialList,
  query: initialQuery,
  summary: null, // { counts, photoCount, photosBytes, galleryCount }
  gallery: initialGallery,
  busy: false,

  setTab: (tab) => set((s) => ({ tab, query: { ...s.query, page: 1 } })),
  setPageSize: (pageSize) => set((s) => ({ pageSize, query: { ...s.query, page: 1 } })),
  setQuery: (next) => set((s) => ({ query: { ...s.query, page: 1, ...next } })),
  clearFilters: () => set((s) => ({ tab: "all", query: { ...s.query, q: "", sort: "newest", page: 1 } })),

  _setList: (next) => set((s) => ({ list: { ...s.list, ...next } })),
  _setSummary: (summary) => set({ summary }),
  _setGallery: (next) => set((s) => ({ gallery: { ...s.gallery, ...next } })),
  resetGallery: () => set({ gallery: initialGallery }),
  _setBusy: (busy) => set({ busy }),
}));
