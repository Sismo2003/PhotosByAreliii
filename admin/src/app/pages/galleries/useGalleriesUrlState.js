// Keeps the Galleries list state in the URL (?tab=draft&q=ana&sort=oldest&page=2&size=50), same
// pattern as clients/useClientsUrlState.js. The sidebar's "delete old galleries" link lands on
// ?sort=oldest. Defaults are left out of the URL.
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";

import { useGalleriesStore } from "slices";

import { SORT_OPTIONS, TABS } from "./labels";

const TAB_IDS = TABS.map((t) => t.id);
const SORT_IDS = SORT_OPTIONS.map((s) => s.id);
const SIZES = [10, 25, 50, 100];

const positive = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

function hydrate(params) {
  if (![...params.keys()].length) return;
  const s = useGalleriesStore.getState();
  const tab = TAB_IDS.includes(params.get("tab")) ? params.get("tab") : "all";
  const size = positive(params.get("size"));
  useGalleriesStore.setState({
    tab,
    pageSize: size && SIZES.includes(size) ? size : s.pageSize,
    query: { q: params.get("q") ?? "", page: positive(params.get("page")) ?? 1, sort: SORT_IDS.includes(params.get("sort")) ? params.get("sort") : "newest" },
    ...(tab !== s.tab ? { list: { items: [], total: 0, loading: false, error: null } } : {}),
  });
}

export function useGalleriesUrlState() {
  const [params, setParams] = useSearchParams();
  const hydrated = useRef(false);
  if (!hydrated.current) {
    hydrated.current = true;
    hydrate(params);
  }

  const tab = useGalleriesStore((s) => s.tab);
  const pageSize = useGalleriesStore((s) => s.pageSize);
  const query = useGalleriesStore((s) => s.query);

  useEffect(() => {
    const next = new URLSearchParams();
    if (tab !== "all") next.set("tab", tab);
    if (query.page > 1) next.set("page", String(query.page));
    if (pageSize !== 25) next.set("size", String(pageSize));
    if (query.q) next.set("q", query.q);
    if (query.sort !== "newest") next.set("sort", query.sort);
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [tab, pageSize, query, params, setParams]);
}
