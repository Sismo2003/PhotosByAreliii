// TanStack table of the Clients list. Search, tab, sort and pagination all happen on the server
// (GET /api/admin/clients), so the table only renders the page it is given. Same shell as the
// Bookings tables (bookings/BookingsTable.jsx).
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";

import { useClientsStore } from "slices";

import { columns } from "./columns";

export function useClientsTable({ rows, total, pageSize }) {
  const page = useClientsStore((s) => s.query.page);
  const sort = useClientsStore((s) => s.query.sort);
  const dir = useClientsStore((s) => s.query.dir);
  const setQuery = useClientsStore((s) => s.setQuery);
  const setPageSize = useClientsStore((s) => s.setPageSize);

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
