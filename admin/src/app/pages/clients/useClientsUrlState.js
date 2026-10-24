// Keeps the Clients list state in the URL (?tab=followup&q=ana&sort=name&dir=desc&page=2&size=50),
// same pattern as bookings/useBookingsUrlState.js: on first render the URL is loaded into the
// store (before the load effects run); afterwards every store change is written back with
// `replace`. Defaults are left out of the URL.
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";

import { useClientsStore } from "slices";

import { TABS } from "./labels";

const TAB_IDS = TABS.map((t) => t.id);
const SIZES = [10, 25, 50, 100];
const SORTS = ["name", "received"];
const HEARD = ["INSTAGRAM", "FRIEND", "GOOGLE", "TIKTOK", "RETURNING_CLIENT", "OTHER"];
const LOGINS = ["none", "invited", "active"];

const positive = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

function hydrate(params) {
  if (![...params.keys()].length) return;
  const s = useClientsStore.getState();
  const tab = TAB_IDS.includes(params.get("tab")) ? params.get("tab") : s.tab;
  const size = positive(params.get("size"));
  const sort = SORTS.includes(params.get("sort")) ? params.get("sort") : "";
  useClientsStore.setState({
    tab,
    pageSize: size && SIZES.includes(size) ? size : s.pageSize,
    query: {
      q: params.get("q") ?? "",
      heardFrom: HEARD.includes(params.get("heard")) ? params.get("heard") : "",
      login: LOGINS.includes(params.get("login")) ? params.get("login") : "",
      page: positive(params.get("page")) ?? 1, sort, dir: params.get("dir") === "desc" ? "desc" : "asc",
    },
    // A different tab than the one in memory: drop its stale rows.
    ...(tab !== s.tab ? { list: { items: [], total: 0, loading: false, error: null } } : {}),
  });
}

export function useClientsUrlState() {
  const [params, setParams] = useSearchParams();
  const hydrated = useRef(false);
  if (!hydrated.current) {
    hydrated.current = true;
    hydrate(params);
  }

  const tab = useClientsStore((s) => s.tab);
  const pageSize = useClientsStore((s) => s.pageSize);
  const query = useClientsStore((s) => s.query);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set("tab", tab);
    if (query.page > 1) next.set("page", String(query.page));
    if (pageSize !== 25) next.set("size", String(pageSize));
    if (query.q) next.set("q", query.q);
    if (query.heardFrom) next.set("heard", query.heardFrom);
    if (query.login) next.set("login", query.login);
    if (query.sort) {
      next.set("sort", query.sort);
      if (query.dir === "desc") next.set("dir", "desc");
    }
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [tab, pageSize, query, params, setParams]);
}
