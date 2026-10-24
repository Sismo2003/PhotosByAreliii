// TanStack table for the Bookings Requests list. Both the toolbar (filters, search,
// column visibility) and the body (rows, pagination) need the same table instance, so the
// hook lives in its own file and gets called once at the page level.
import {
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";

import { fuzzyFilter } from "utils/react-table/fuzzyFilter";
import { useBookingsStore } from "slices";

import { columns } from "./columns";

export function useBookingsTable({ rows, total, pageSize }) {
  const page = useBookingsStore((s) => s.page);
  const setPage = useBookingsStore((s) => s.setPage);
  const setPageSize = useBookingsStore((s) => s.setPageSize);

  // Lives in the store so leaving for a request view and coming back keeps the same list.
  const { sorting, globalFilter, columnFilters } = useBookingsStore((s) => s.requestsTable);
  const setRequestsTable = useBookingsStore((s) => s.setRequestsTable);
  const pagination = useMemo(() => ({ pageIndex: page - 1, pageSize }), [page, pageSize]);

  const flatRows = useMemo(() => rows ?? [], [rows]);

  const table = useReactTable({
    data: flatRows,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination },
    filterFns: { fuzzy: fuzzyFilter },
    globalFilterFn: fuzzyFilter,
    onSortingChange: (u) => setRequestsTable("sorting", u),
    onGlobalFilterChange: (u) => setRequestsTable("globalFilter", u),
    onColumnFiltersChange: (u) => setRequestsTable("columnFilters", u),
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      if (next.pageSize !== pageSize) setPageSize(next.pageSize);
      else setPage(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  });

  return table;
}