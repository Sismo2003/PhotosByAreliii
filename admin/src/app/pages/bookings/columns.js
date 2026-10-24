// TanStack column definitions for the Bookings Requests table. The cell components live in
// rows.jsx; this file only describes shape + filter behavior. The fuzzy search filter (Fuse)
// runs on the rows the page already loaded via /api/admin/bookings/requests, so it searches
// across code, client name, email and contact fields.
import { createColumnHelper } from "@tanstack/react-table";
import {
  ClientCell,
  CodeCell,
  ContactCell,
  ServiceCell,
  SubmittedCell,
  WhenCell,
} from "./rows";
import { toMillis } from "./helpers";

const columnHelper = createColumnHelper();

// Multi-select array filter for FacedtedFilter (button stores [value, value, ...]).
const arrIncludesSome = (row, columnId, value) => {
  if (!value?.length) return true;
  const cellValue = row.getValue(columnId);
  return cellValue != null && value.includes(String(cellValue));
};

export const columns = [
  columnHelper.accessor((row) => row.code, {
    id: "code",
    label: "Request",
    header: "Request",
    cell: CodeCell,
    enableSorting: true,
    size: 110,
  }),
  columnHelper.accessor(
    (row) => row.client?.displayName ?? row.client?.email ?? "",
    {
      id: "client",
      label: "Client",
      header: "Client",
      cell: ClientCell,
      enableSorting: true,
      size: 220,
    },
  ),
  columnHelper.accessor((row) => row.serviceId, {
    id: "service",
    label: "Service",
    header: "Service",
    cell: ServiceCell,
    enableSorting: true,
    // The toolbar's Service filter compares by id (serviceOptions are { value: id, label: name }).
    // Sorting still uses the snapshot name so the column stays alphabetical.
    sortingFn: (a, b) =>
      String(a.original.serviceNameSnapshot ?? "").localeCompare(
        String(b.original.serviceNameSnapshot ?? ""),
      ),
    filterFn: arrIncludesSome,
    size: 220,
  }),
  columnHelper.accessor(
    (row) => `${row.contactFirstName ?? ""} ${row.contactLastName ?? ""} ${row.contactEmail ?? ""} ${row.contactPhone ?? ""}`,
    {
      id: "contact",
      label: "Contact",
      header: "Contact",
      cell: ContactCell,
      enableSorting: false,
      size: 200,
    },
  ),
  columnHelper.accessor((row) => toMillis(row.startsAt), {
    id: "startsAt",
    label: "When",
    header: "When",
    cell: WhenCell,
    enableSorting: true,
    sortingFn: "basic",
    size: 170,
  }),
  columnHelper.accessor((row) => toMillis(row.createdAt), {
    id: "submitted",
    label: "Submitted",
    header: "Submitted",
    cell: SubmittedCell,
    enableSorting: true,
    sortingFn: "basic",
    size: 170,
  }),
];

// Default hidden on small viewports — surfaced via TableColumnsVisibility.
export const defaultHidden = {
  contact: false,
};