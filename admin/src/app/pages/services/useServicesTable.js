// TanStack tables of the Services page (services and add-ons). Search, filters, sort and
// pagination happen on the server, so a table only renders the page it is given. Same shell as
// the Bookings tables (bookings/BookingsTable.jsx).
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";

import { useServicesStore } from "slices";

import { addonColumns } from "./addonColumns";
import { columns } from "./columns";

function useTable({ rows, total, pageSize, query, setQuery, cols }) {
  const setPageSize = useServicesStore((s) => s.setPageSize);
  const { page, sort, dir } = query;
  const sorting = useMemo(() => (sort ? [{ id: sort, desc: dir === "desc" }] : []), [sort, dir]);
  const pagination = useMemo(() => ({ pageIndex: page - 1, pageSize }), [page, pageSize]);

  return useReactTable({
    data: rows,
    columns: cols,
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

export function useServicesTable({ rows, total, pageSize }) {
  const query = useServicesStore((s) => s.query);
  const setQuery = useServicesStore((s) => s.setQuery);
  return useTable({ rows, total, pageSize, query, setQuery, cols: columns });
}

export function useAddonsTable({ rows, total, pageSize }) {
  const query = useServicesStore((s) => s.addonQuery);
  const setQuery = useServicesStore((s) => s.setAddonQuery);
  return useTable({ rows, total, pageSize, query, setQuery, cols: addonColumns });
}
