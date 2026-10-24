// TanStack table for the server-side tabs (Upcoming, Follow-up, Done, Expired, Cancelled).
// Search, Service filter and pagination happen on the server (GET /?tab=…), so the table only
// renders the page it is given; column sorting is also server-side (sort/dir in the query) — same shell as the Requests table (see BookingsTable.jsx).
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";

import { useBookingsStore } from "slices";

import { mainColumns, trackerColumns } from "./sessionColumns";

export function useSessionsTable({ tab, rows, total, pageSize }) {
  const page = useBookingsStore((s) => s.query.page);
  const sort = useBookingsStore((s) => s.query.sort);
  const dir = useBookingsStore((s) => s.query.dir);
  const setQuery = useBookingsStore((s) => s.setQuery);
  const setPageSize = useBookingsStore((s) => s.setPageSize);

  const columns = tab === "followup" || tab === "done" ? trackerColumns : mainColumns;
  const sorting = useMemo(() => (sort ? [{ id: sort, desc: dir === "desc" }] : []), [sort, dir]);
  const pagination = useMemo(() => ({ pageIndex: page - 1, pageSize }), [page, pageSize]);

  return useReactTable({
    data: rows,
    columns,
    state: { pagination, sorting },
    manualSorting: true,
    enableSortingRemoval: true,
    onSortingChange: (updater) => {
      const next = (typeof updater === "function" ? updater(sorting) : updater)[0];
      setQuery({ sort: next?.id ?? "", dir: next?.desc ? "desc" : "asc" });
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      if (next.pageSize !== pageSize) setPageSize(next.pageSize);
      else setQuery({ page: next.pageIndex + 1 });
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  });
}
