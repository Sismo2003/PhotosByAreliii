// TanStack columns of the Add-ons table. Name, price and bookings sort on the server.
import { createColumnHelper } from "@tanstack/react-table";

import { ActiveCell, AddonAddsCell, AddonBookingsCell, AddonNameCell, AddonPriceCell, OfferedCell } from "./addonCells";

const col = createColumnHelper();
const base = { enableSorting: false };

export const addonColumns = [
  col.display({ id: "name", header: "Add-on", cell: AddonNameCell, size: 260, enableSorting: true, sortDescFirst: false }),
  col.display({ id: "price", header: "Price", cell: AddonPriceCell, size: 100, enableSorting: true, sortDescFirst: false }),
  col.display({ ...base, id: "adds", header: "Adds time", cell: AddonAddsCell, size: 110 }),
  col.display({ ...base, id: "offered", header: "Offered on", cell: OfferedCell, size: 200 }),
  col.display({ id: "bookings", header: "Bookings", cell: AddonBookingsCell, size: 110, enableSorting: true, sortDescFirst: true }),
  col.display({ ...base, id: "active", header: "Status", cell: ActiveCell, size: 100 }),
];
