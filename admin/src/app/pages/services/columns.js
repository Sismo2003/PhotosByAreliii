// TanStack columns of the Services table. Cells live in cells.jsx. Sorting is done by the server
// (GET /?sort=&dir=); the ids of the sortable columns double as the `sort` values. No sort = the
// order Areli set with "Reorder".
import { createColumnHelper } from "@tanstack/react-table";

import { AddonsCell, BookingsCell, NameCell, PriceCell, StatusCell } from "./cells";

const col = createColumnHelper();
const base = { enableSorting: false };

export const columns = [
  col.display({ id: "name", header: "Service", cell: NameCell, size: 280, enableSorting: true, sortDescFirst: false }),
  col.display({ id: "price", header: "Price", cell: PriceCell, size: 130, enableSorting: true, sortDescFirst: false }),
  col.display({ ...base, id: "addons", header: "Add-ons", cell: AddonsCell, size: 110 }),
  col.display({ id: "bookings", header: "Bookings", cell: BookingsCell, size: 110, enableSorting: true, sortDescFirst: true }),
  col.display({ ...base, id: "status", header: "Status", cell: StatusCell, size: 150 }),
];
