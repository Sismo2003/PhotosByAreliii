// Email Zustand store — same pattern as slices/services (state + sync actions here, async work in
// ./thunks.js). Settings → Email and the templates list share it; the editor keeps its own state.
import { create } from "zustand";

const initialTable = { sorting: [], globalFilter: "", columnFilters: [] };

export const useEmailStore = create((set) => ({
  settings: { data: null, loading: false, error: null }, // { settings, fileError, status, hostinger }
  templates: { data: null, loading: false, error: null }, // { groups, locales, templates, variables, cards }
  templatesTable: initialTable,
  page: 1,
  pageSize: 50,
  busy: false,

  _setSettings: (next) => set((s) => ({ settings: { ...s.settings, ...next } })),
  _setTemplates: (next) => set((s) => ({ templates: { ...s.templates, ...next } })),
  _patchTemplate: (key, patch) =>
    set((s) => {
      const data = s.templates.data;
      if (!data) return {};
      return { templates: { ...s.templates, data: { ...data, templates: data.templates.map((t) => (t.key === key ? { ...t, ...patch } : t)) } } };
    }),
  setTemplatesTable: (field, updater) =>
    set((s) => {
      const prev = s.templatesTable[field];
      return { templatesTable: { ...s.templatesTable, [field]: typeof updater === "function" ? updater(prev) : updater }, page: 1 };
    }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  _setBusy: (busy) => set({ busy }),
}));
