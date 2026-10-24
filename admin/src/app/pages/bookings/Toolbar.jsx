// Toolbar for the Bookings Requests table:
//   - search (global, fuzzy over what's loaded server-side)
//   - faceted filter by Service
//   - date range on Submitted
//   - reset filters
//
// Components reused from the project's shared table kit (already adapted to Luxon for dates).
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import PropTypes from "prop-types";

import { DateFilter } from "components/shared/table/DateFilter";
import { FacedtedFilter } from "components/shared/table/FacedtedFilter";
import { Button, Input } from "components/ui";
import { nowInStudio } from "utils/date";

export function BookingsToolbar({ table, serviceOptions }) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    // One line that keeps its width whatever is selected: the filters show only a count
    // badge and "Reset filters" keeps its space while hidden, so nothing jumps to a new row.
    <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
      <SearchInput table={table} />
      <Filters table={table} serviceOptions={serviceOptions} />
      <Button
        variant="flat"
        className={clsx(
          "h-8 shrink-0 border border-line px-3 text-small text-ink-muted hover:text-ink",
          !isFiltered && "invisible",
        )}
        onClick={() => table.resetColumnFilters()}
      >
        Reset filters
      </Button>
    </div>
  );
}

function SearchInput({ table }) {
  return (
    <Input
      value={table.getState().globalFilter ?? ""}
      onChange={(e) => table.setGlobalFilter(e.target.value)}
      prefix={<MagnifyingGlassIcon className="size-4 text-ink-muted" />}
      placeholder="Search name, email, phone…"
      classNames={{
        root: "shrink-0",
        input:
          "h-8 w-56 rounded-none border-0 border-b border-line bg-transparent px-0 text-small text-ink placeholder:text-ink-muted focus:border-ink focus:ring-0",
      }}
    />
  );
}

function Filters({ table, serviceOptions }) {
  return (
    <div className="flex flex-nowrap items-center gap-2">
      {serviceOptions?.length > 0 && table.getColumn("service") && (
        <FacedtedFilter
          column={table.getColumn("service")}
          title="Service"
          options={serviceOptions.map((s) => ({ value: String(s.id), label: s.name }))}
          compact
        />
      )}
      {table.getColumn("submitted") && (
        <DateFilter
          column={table.getColumn("submitted")}
          title="Submitted"
          config={{ mode: "range", maxDate: nowInStudio().plus({ days: 1 }).toJSDate() }}
          compact
        />
      )}
    </div>
  );
}

BookingsToolbar.propTypes = {
  table: PropTypes.object,
  serviceOptions: PropTypes.array,
};
SearchInput.propTypes = { table: PropTypes.object };
Filters.propTypes = { table: PropTypes.object, serviceOptions: PropTypes.array };