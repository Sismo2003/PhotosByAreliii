// Keeps the Services page state in the URL (?view=addons&q=outfit&sort=price&dir=desc&page=2&size=50),
// same pattern as clients/useClientsUrlState.js: on first render the URL is loaded into the store
// (before the load effects run); afterwards every store change is written back with `replace`.
// Defaults are left out of the URL. Each view keeps its own filters (status/active/serviceId).
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";

import { useServicesStore } from "slices";

import { SORT_OPTIONS, STATUS_OPTIONS, VIEWS } from "./labels";

const SIZES = [10, 25, 50, 100];
const SORTS = SORT_OPTIONS.map((o) => o.sort).filter(Boolean);
const STATUSES = STATUS_OPTIONS.map((o) => o.value);

const positive = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

function hydrate(params) {
  if (![...params.keys()].length) return;
  const s = useServicesStore.getState();
  const view = VIEWS.some((v) => v.id === params.get("view")) ? params.get("view") : "services";
  const size = positive(params.get("size"));
  const sort = SORTS.includes(params.get("sort")) ? params.get("sort") : "";
  const common = { q: params.get("q") ?? "", page: positive(params.get("page")) ?? 1, sort, dir: params.get("dir") === "desc" ? "desc" : "asc" };
  useServicesStore.setState({
    view,
    pageSize: size && SIZES.includes(size) ? size : s.pageSize,
    ...(view === "services"
      ? { query: { ...common, status: STATUSES.includes(params.get("status")) ? params.get("status") : "" } }
      : {
          addonQuery: {
            ...common,
            active: ["yes", "no"].includes(params.get("active")) ? params.get("active") : "",
            serviceId: positive(params.get("service")) ? String(positive(params.get("service"))) : "",
          },
        }),
  });
}

export function useServicesUrlState() {
  const [params, setParams] = useSearchParams();
  const hydrated = useRef(false);
  if (!hydrated.current) {
    hydrated.current = true;
    hydrate(params);
  }

  const view = useServicesStore((s) => s.view);
  const pageSize = useServicesStore((s) => s.pageSize);
  const query = useServicesStore((s) => s.query);
  const addonQuery = useServicesStore((s) => s.addonQuery);

  useEffect(() => {
    const q = view === "services" ? query : addonQuery;
    const next = new URLSearchParams();
    if (view !== "services") next.set("view", view);
    if (q.page > 1) next.set("page", String(q.page));
    if (pageSize !== 25) next.set("size", String(pageSize));
    if (q.q) next.set("q", q.q);
    if (view === "services" && query.status) next.set("status", query.status);
    if (view === "addons" && addonQuery.active) next.set("active", addonQuery.active);
    if (view === "addons" && addonQuery.serviceId) next.set("service", String(addonQuery.serviceId));
    if (q.sort) {
      next.set("sort", q.sort);
      if (q.dir === "desc") next.set("dir", "desc");
    }
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [view, pageSize, query, addonQuery, params, setParams]);
}
