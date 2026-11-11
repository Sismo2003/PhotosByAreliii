// Keeps the templates list state in the URL (?q=gallery&group=booking,gallery&sent=scheduled) so a
// reload or Back from the editor lands on the same list. Same idea as bookings/useBookingsUrlState:
// URL → store on first render, store → URL afterwards with `replace`. Defaults are left out.
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";

import { useEmailStore } from "slices";

const list = (value) => (value ? value.split(",").filter(Boolean) : []);

export function useTemplatesUrlState() {
  const [params, setParams] = useSearchParams();
  const hydrated = useRef(false);
  if (!hydrated.current) {
    hydrated.current = true;
    if ([...params.keys()].length) {
      const columnFilters = [
        list(params.get("group")).length && { id: "group", value: list(params.get("group")) },
        list(params.get("sent")).length && { id: "trigger", value: list(params.get("sent")) },
      ].filter(Boolean);
      useEmailStore.setState({ templatesTable: { sorting: [], globalFilter: params.get("q") ?? "", columnFilters }, page: 1 });
    }
  }

  const { globalFilter, columnFilters } = useEmailStore((s) => s.templatesTable);

  useEffect(() => {
    const next = new URLSearchParams();
    if (globalFilter) next.set("q", globalFilter);
    const group = columnFilters.find((f) => f.id === "group")?.value;
    const sent = columnFilters.find((f) => f.id === "trigger")?.value;
    if (group?.length) next.set("group", group.join(","));
    if (sent?.length) next.set("sent", sent.join(","));
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [globalFilter, columnFilters, params, setParams]);
}
