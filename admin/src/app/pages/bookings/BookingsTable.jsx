// Table shell shared by every Bookings tab — the TanStack table (tablet/desktop, fixed height
// with its own scroll and sticky header), stacked cards (phone) and the pagination footer.
// The table instance and the toolbar live at the page level (useBookingsTable.js for Requests,
// useSessionsTable.js for the rest). Clicking a row opens the booking page (booking/index.jsx).
import { flexRender } from "@tanstack/react-table";
import clsx from "clsx";
import PropTypes from "prop-types";

import { TableSortIcon } from "components/shared/table/TableSortIcon";
import { PaginationIsland } from "components/shared/table/PaginationIsland";
import { Skeleton, Table, TBody, Td, Th, THead, Tr } from "components/ui";

const SKELETON_ROWS = 8;
const range = (n) => Array.from({ length: n }, (_, i) => i);


export function BookingsTable({ table, onOpen, Card, emptyText, total, loading }) {
  const rows = table.getRowModel().rows;
  const colCount = table.getVisibleLeafColumns().length;
  // First load (nothing to show yet): skeleton rows/cards in the same shape as the real ones.
  const skeleton = loading && rows.length === 0;

  return (
    <div className={clsx("relative mt-2 flex flex-col", loading && "opacity-60 transition-opacity")}>
      {/* Phone: stacked cards, no horizontal scroll */}
      <ul className="max-h-[calc(100vh-22rem)] overflow-auto pb-20 md:hidden">
        {skeleton &&
          range(5).map((i) => (
            <li key={i} className="border-line flex flex-col gap-2 border-t py-4">
              <Skeleton className="h-3 w-1/3 rounded" />
              <Skeleton className="h-5 w-2/3 rounded" />
              <Skeleton className="h-3 w-4/5 rounded" />
            </li>
          ))}
        {!skeleton && rows.length === 0 && (
          <li className="border-line text-ink-muted border-t py-10 text-center">{emptyText}</li>
        )}
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onOpen(row.original.id)}
              className="border-line hover:bg-paper-alt flex min-h-11 w-full flex-col gap-1.5 border-t py-4 text-left transition-colors"
            >
              <Card booking={row.original} />
            </button>
          </li>
        ))}
      </ul>

      <div className="hidden flex-col overflow-hidden md:flex">
        <div className="h-[calc(100vh-22rem)] overflow-auto pb-20">
          <Table
            hoverable
            className="text-small w-full text-left rtl:text-right"
          >
            <THead>
              {table.getHeaderGroups().map((hg) => (
                <Tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <Th
                      key={h.id}
                      className="border-line bg-paper caps text-ink-muted sticky top-0 z-10 border-b py-3"
                    >
                      {h.column.getCanSort() ? (
                        <button
                          type="button"
                          className="flex items-center gap-2"
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          <span>
                            {h.isPlaceholder
                              ? null
                              : flexRender(
                                  h.column.columnDef.header,
                                  h.getContext(),
                                )}
                          </span>
                          <TableSortIcon sorted={h.column.getIsSorted()} />
                        </button>
                      ) : h.isPlaceholder ? null : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </Th>
                  ))}
                </Tr>
              ))}
            </THead>
            <TBody>
              {skeleton &&
                range(SKELETON_ROWS).map((i) => (
                  <Tr key={i}>
                    {range(colCount).map((c) => (
                      <Td key={c} className="border-line border-b py-3 align-top">
                        <Skeleton className={c % 2 ? "h-4 w-2/3 rounded" : "h-4 w-5/6 rounded"} />
                        <Skeleton className="mt-1.5 h-3 w-1/2 rounded" />
                      </Td>
                    ))}
                  </Tr>
                ))}
              {!skeleton && table.getRowModel().rows.length === 0 && (
                <Tr>
                  <Td
                    colSpan={colCount}
                    className="border-line text-ink-muted border-b py-10 text-center"
                  >
                    {emptyText}
                  </Td>
                </Tr>
              )}
              {table.getRowModel().rows.map((row) => (
                <Tr
                  key={row.id}
                  onClick={() => onOpen(row.original.id)}
                  className="hover:bg-paper-alt cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <Td
                      key={cell.id}
                      className="border-line border-b py-3 align-top"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </Td>
                  ))}
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      </div>
      <PaginationIsland table={table} total={total} />
    </div>
  );
}

BookingsTable.propTypes = {
  table: PropTypes.object,
  onOpen: PropTypes.func.isRequired,
  Card: PropTypes.elementType.isRequired,
  emptyText: PropTypes.string,
  total: PropTypes.number,
  loading: PropTypes.bool,
};
