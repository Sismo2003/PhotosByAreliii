// TanStack table of the Galleries list; search, state filter, sort and pages are all server-side.
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";

import { useGalleriesStore } from "slices";

import { columns } from "./columns";

export function useGalleriesTable({ rows, total, pageSize }) {
  const page = useGalleriesStore((s) => s.query.page);
  const sort = useGalleriesStore((s) => s.query.sort);
  const setQuery = useGalleriesStore((s) => s.setQuery);
  const setPageSize = useGalleriesStore((s) => s.setPageSize);

  // Only name and size are header sorts; newest / oldest come from the Sort select.
  const sorting = useMemo(() => (sort === "title" || sort === "size" ? [{ id: sort, desc: sort === "size" }] : []), [sort]);
  const pagination = useMemo(() => ({ pageIndex: page - 1, pageSize }), [page, pageSize]);

  return useReactTable({
    data: rows,
    columns,
    state: { pagination, sorting },
    manualSorting: true,
    enableSortingRemoval: true,
    onSortingChange: (updater) => {
      const next = (typeof updater === "function" ? updater(sorting) : updater)[0];
      setQuery({ sort: next?.id ?? "newest" });
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
