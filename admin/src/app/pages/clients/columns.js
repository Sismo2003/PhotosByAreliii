// TanStack columns of the Clients table. Cells live in cells.jsx. Sorting is done by the server
// (GET /?sort=&dir=) over the whole list, so only columns the server can order are clickable;
// their ids double as the `sort` values. The default order is recent activity (no sort).
import { createColumnHelper } from "@tanstack/react-table";

import { ActivityCell, LoginCell, NameCell, ReceivedCell, SessionsCell, StatusCell } from "./cells";

const col = createColumnHelper();
const base = { enableSorting: false };

export const columns = [
  col.display({ id: "name", header: "Client", cell: NameCell, size: 260, enableSorting: true, sortDescFirst: false }),
  col.display({ ...base, id: "sessions", header: "Sessions", cell: SessionsCell, size: 170 }),
  col.display({ ...base, id: "activity", header: "Last · next", cell: ActivityCell, size: 130 }),
  col.display({ id: "received", header: "Received", cell: ReceivedCell, size: 110, enableSorting: true, sortDescFirst: true }),
  col.display({ ...base, id: "login", header: "Gallery login", cell: LoginCell, size: 150 }),
  col.display({ ...base, id: "status", header: "Status", cell: StatusCell, size: 190 }),
];
