// Keeps the Bookings list state in the URL (?tab=followup&q=ana&service=2&page=3&size=50&view=calendar&month=2026-11)
// so reload, back from a booking, and shared links land on the same list. The store stays the
// source of truth while the page is open:
//   - on first render the URL (when it has params) is loaded into the store, before the load effects run;
//   - afterwards every store change is written back with `replace` (no history spam).
// Defaults are left out of the URL to keep it short.
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";

import { CALENDAR_MIN_MONTH, useBookingsStore } from "slices";

import { TABS } from "./labels";

const TAB_IDS = TABS.map((t) => t.id);
const CALENDAR_TABS = ["requests", "upcoming"];
const SIZES = [10, 25, 50, 100];
const SORTS = ["date", "client", "service", "total"];

const positive = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

function readUrl(params) {
  if (![...params.keys()].length) return null;
  const tab = TAB_IDS.includes(params.get("tab")) ? params.get("tab") : null;
  const month = params.get("month");
  const size = positive(params.get("size"));
  const page = positive(params.get("page")) ?? 1;
  const state = {};
  if (tab) {
    state.tab = tab;
    state.view = params.get("view") === "calendar" && CALENDAR_TABS.includes(tab) ? "calendar" : "list";
  }
  if (size && SIZES.includes(size)) state.pageSize = size;
  return {
    state,
    tab,
    page,
    q: params.get("q") ?? "",
    serviceId: params.get("service") ?? "",
    sort: SORTS.includes(params.get("sort")) ? params.get("sort") : "",
    dir: params.get("dir") === "desc" ? "desc" : "asc",
    month: /^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? "") && month >= CALENDAR_MIN_MONTH ? month : null,
  };
}

function hydrate(params) {
  const url = readUrl(params);
  if (!url) return;
  const s = useBookingsStore.getState();
  const tab = url.tab ?? s.tab;
  const isRequests = tab === "requests";
  useBookingsStore.setState({
    ...url.state,
    page: isRequests ? url.page : 1,
    query: { q: url.q, serviceId: url.serviceId, page: isRequests ? 1 : url.page, sort: isRequests ? "" : url.sort, dir: url.dir },
    calendar: url.month ? { ...s.calendar, month: url.month } : s.calendar,
    // A different tab than the one in memory: drop its stale rows.
    ...(url.tab && url.tab !== s.tab ? { requests: { items: [], total: 0, summary: null }, list: { items: [], total: 0, loading: false, error: null } } : {}),
  });
}

export function useBookingsUrlState() {
  const [params, setParams] = useSearchParams();
  const hydrated = useRef(false);
  if (!hydrated.current) {
    hydrated.current = true;
    hydrate(params);
  }

  const tab = useBookingsStore((s) => s.tab);
  const view = useBookingsStore((s) => s.view);
  const pageSize = useBookingsStore((s) => s.pageSize);
  const requestsPage = useBookingsStore((s) => s.page);
  const query = useBookingsStore((s) => s.query);
  const month = useBookingsStore((s) => s.calendar.month);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set("tab", tab);
    if (view === "calendar") {
      next.set("view", "calendar");
      next.set("month", month);
    } else {
      const page = tab === "requests" ? requestsPage : query.page;
      if (page > 1) next.set("page", String(page));
      if (pageSize !== 25) next.set("size", String(pageSize));
      if (tab !== "requests") {
        if (query.q) next.set("q", query.q);
        if (query.serviceId) next.set("service", query.serviceId);
        if (query.sort) {
          next.set("sort", query.sort);
          if (query.dir === "desc") next.set("dir", "desc");
        }
      }
    }
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [tab, view, pageSize, requestsPage, query, month, params, setParams]);
}
