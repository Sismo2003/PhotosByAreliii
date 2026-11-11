// TanStack table of the email templates (client-side: 25 rows). Sorting/filters live in the store
// so going into the editor and back keeps the list as it was; search and group are also in the URL
// (useTemplatesUrlState.js).
import {
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";

import { useEmailStore } from "slices";
import { fuzzyFilter } from "utils/react-table/fuzzyFilter";

import { columns } from "./columns";

export function useTemplatesTable(rows) {
  const { globalFilter, columnFilters } = useEmailStore((s) => s.templatesTable);
  const setTable = useEmailStore((s) => s.setTemplatesTable);
  const page = useEmailStore((s) => s.page);
  const pageSize = useEmailStore((s) => s.pageSize);
  const setPage = useEmailStore((s) => s.setPage);
  const setPageSize = useEmailStore((s) => s.setPageSize);
  const pagination = useMemo(() => ({ pageIndex: page - 1, pageSize }), [page, pageSize]);
  const data = useMemo(() => rows ?? [], [rows]);

  return useReactTable({
    data,
    columns,
    getRowId: (row) => row.key,
    state: { globalFilter, columnFilters, pagination, columnVisibility: { group: false } },
    filterFns: { fuzzy: fuzzyFilter },
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: (u) => setTable("globalFilter", u),
    onColumnFiltersChange: (u) => setTable("columnFilters", u),
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      if (next.pageSize !== pageSize) setPageSize(next.pageSize);
      else setPage(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    autoResetPageIndex: false,
  });
}
