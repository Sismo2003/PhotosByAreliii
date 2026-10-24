// Import Dependencies
import PropTypes from "prop-types";

// Local Imports
import {
  Pagination,
  PaginationItems,
  PaginationNext,
  PaginationPrevious,
  Select,
} from "components/ui";
import { useBreakpointsContext } from "app/contexts/breakpoint/context";

// ----------------------------------------------------------------------

// `total` = rows on the server when the table is paginated manually (otherwise the loaded rows).
// `pageSizes` / `unit` change the page-size menu and the count (the photo grid pages by full rows).
export function PaginationSection({ table, total, pageSizes = [10, 20, 30, 40, 50, 100], unit = "entries" }) {
  const paginationState = table.getState().pagination;
  const { isXl, is2xl } = useBreakpointsContext();
  const shown = table.getRowModel().rows.length;
  const start = paginationState.pageIndex * paginationState.pageSize;
  const all = total ?? table.getCoreRowModel().rows.length;

  return (
    <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
      <div className="flex items-center space-x-2 text-xs-plus ">
        <span>Show</span>
        <Select
          data={pageSizes}
          value={paginationState.pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
          classNames={{
            root: "w-fit",
            select: "h-7 rounded-full py-1 text-xs ltr:pr-7! rtl:pl-7!",
          }}
        />
        <span>{unit}</span>
      </div>
      <div>
        <Pagination
          total={table.getPageCount()}
          value={paginationState.pageIndex + 1}
          onChange={(page) => table.setPageIndex(page - 1)}
          siblings={isXl ? 2 : is2xl ? 3 : 1}
          boundaries={isXl ? 2 : 1}
        >
          <PaginationPrevious />
          <PaginationItems />
          <PaginationNext />
        </Pagination>
      </div>
      <div className="truncate text-xs-plus">
        {shown === 0 ? 0 : start + 1} - {start + shown} of {all} {unit}
      </div>
    </div>
  );
}

PaginationSection.propTypes = {
  table: PropTypes.object,
  total: PropTypes.number,
  pageSizes: PropTypes.arrayOf(PropTypes.number),
  unit: PropTypes.string,
};
