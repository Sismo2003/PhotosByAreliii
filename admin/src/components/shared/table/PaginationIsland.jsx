// Floating pagination capsule that sits over the bottom of a table (ported from the
// CallCenter history island, restyled with the project's paper/ink/line tokens so it follows
// light/dark and the Hairlines/Shadow section skin). Works with a TanStack table; pass `total`
// when pagination is manual (server rows), otherwise the loaded rows are counted.
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";

import { useSectionSkin } from "components/shared/layout/useSectionSkin";

const PAGE_SIZES = [10, 25, 50, 100];

function PageButton({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full border border-line-strong text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line-strong"
    >
      {children}
    </button>
  );
}

PageButton.propTypes = {
  label: PropTypes.string,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  children: PropTypes.node,
};

export function PaginationIsland({ table, total }) {
  const { isShadow } = useSectionSkin();
  const { pageIndex, pageSize } = table.getState().pagination;
  const pages = Math.max(1, table.getPageCount());
  const all = total ?? table.getCoreRowModel().rows.length;
  const shown = table.getRowModel().rows.length;
  const from = shown === 0 ? 0 : pageIndex * pageSize + 1;
  const sizes = PAGE_SIZES.includes(pageSize) ? PAGE_SIZES : [...PAGE_SIZES, pageSize].sort((a, b) => a - b);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-3">
      <nav
        aria-label="Pagination"
        className={clsx(
          "pointer-events-auto flex max-w-full flex-wrap items-center justify-between gap-x-5 gap-y-2 rounded-full bg-paper/85 px-4 py-2 backdrop-blur-xl",
          isShadow ? "shadow-soft dark:shadow-none dark:ring-1 dark:ring-line" : "ring-1 ring-line-strong",
        )}
      >
        <div className="flex items-center gap-3 text-small text-ink-muted">
          <label className="flex items-center gap-2">
            <span className="hidden sm:inline">Rows</span>
            <select
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="h-7 rounded-full border border-line-strong bg-transparent py-0 pl-2.5 pr-7 text-small text-ink focus:border-ink focus:outline-none focus:ring-0"
            >
              {sizes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <span className="hidden sm:inline">
            {from}–{from === 0 ? 0 : from + shown - 1} of {all}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-small text-ink-muted">
            Page {pageIndex + 1} of {pages}
          </span>
          <PageButton label="Previous page" disabled={pageIndex <= 0} onClick={() => table.setPageIndex(pageIndex - 1)}>
            <ChevronLeftIcon className="size-4" strokeWidth={1.5} />
          </PageButton>
          <PageButton label="Next page" disabled={pageIndex + 1 >= pages} onClick={() => table.setPageIndex(pageIndex + 1)}>
            <ChevronRightIcon className="size-4" strokeWidth={1.5} />
          </PageButton>
        </div>
      </nav>
    </div>
  );
}

PaginationIsland.propTypes = {
  table: PropTypes.object,
  total: PropTypes.number,
};
