// Pages of the Photos grid, through a TanStack table so it can use the shared static footer
// PaginationSection (the user chose it over the PaginationIsland for this grid, 2026-10-05).
// The gallery already brings every photo, so paging is client-side.
// Page sizes are multiples of the grid's column counts at every breakpoint (SIZES in PhotosTab),
// so a page always ends on a full row.
import { getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table";
import { useEffect, useState } from "react";

export const PAGE_SIZES = {
  S: [105, 210], // 3 / 5 / 7 columns
  M: [30, 60, 120], // 2 / 3 / 5 columns
  L: [12, 24, 48], // 1 / 2 / 3 columns
};

const columns = [];

export function usePhotoPages(photos, size, resetKey) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZES[size][0] });

  // Another thumbnail size: its first page size, staying on the page that holds the first photo in view.
  useEffect(() => {
    setPagination((p) => {
      const pageSize = PAGE_SIZES[size].includes(p.pageSize) ? p.pageSize : PAGE_SIZES[size][0];
      return { pageSize, pageIndex: Math.floor((p.pageIndex * p.pageSize) / pageSize) };
    });
  }, [size]);

  // Another set or order: back to the first page.
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [resetKey]);

  const table = useReactTable({
    data: photos,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    getRowId: (p) => String(p.id),
  });

  // Deleting or moving photos can leave the last page empty.
  const pages = Math.max(1, Math.ceil(photos.length / pagination.pageSize));
  useEffect(() => {
    if (pagination.pageIndex >= pages) setPagination((p) => ({ ...p, pageIndex: pages - 1 }));
  }, [pages, pagination.pageIndex]);

  /** Shows the page that holds this photo (e.g. the last one seen in the viewer). */
  const showPhoto = (id) => {
    const i = photos.findIndex((p) => p.id === id);
    if (i >= 0) setPagination((p) => ({ ...p, pageIndex: Math.floor(i / p.pageSize) }));
  };

  return { table, pageSize: pagination.pageSize, pages, pagePhotos: table.getRowModel().rows.map((r) => r.original), showPhoto };
}
