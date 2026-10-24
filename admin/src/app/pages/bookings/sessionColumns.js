// TanStack column definitions for the server-side tabs. Cells live in sessionCells.jsx.
//   - Upcoming / Expired / Cancelled → Date · Client · Session · Total · Payment · Status
//   - Follow-up / Done → the tracker: Date · Client · Balance · Gallery · Thank-you · Review · Next step
// Sorting is done by the server (GET /?sort=&dir=) over the whole tab, never over one page, so
// only columns the database can order are clickable (date, client, session, total). Column ids
// double as the `sort` values.
import { createColumnHelper } from "@tanstack/react-table";

import {
  BalanceCell,
  DateCell,
  GalleryCell,
  SessionClientCell,
  SessionServiceCell,
  PaymentCell,
  ReviewCell,
  StatusCell,
  ThanksCell,
  TotalCell,
} from "./sessionCells";

const col = createColumnHelper();
const base = { enableSorting: false };
const sortable = { enableSorting: true, sortDescFirst: false };

export const mainColumns = [
  col.display({ ...sortable, id: "date", header: "Date", cell: DateCell, size: 130 }),
  col.display({ ...sortable, id: "client", header: "Client", cell: SessionClientCell, size: 220 }),
  col.display({ ...sortable, id: "session", header: "Session", cell: SessionServiceCell, size: 220 }),
  col.display({ ...sortable, id: "total", header: "Total", cell: TotalCell, size: 90 }),
  col.display({ ...base, id: "payment", header: "Payment", cell: PaymentCell, size: 170 }),
  col.display({ ...base, id: "status", header: "Status", cell: StatusCell, size: 170 }),
];

export const trackerColumns = [
  col.display({ ...sortable, id: "date", header: "Session", cell: DateCell, size: 130 }),
  col.display({ ...sortable, id: "client", header: "Client", cell: SessionClientCell, size: 220 }),
  col.display({ ...base, id: "balance", header: "Balance", cell: BalanceCell, size: 120 }),
  col.display({ ...base, id: "gallery", header: "Gallery", cell: GalleryCell, size: 140 }),
  col.display({ ...base, id: "thanks", header: "Thank-you", cell: ThanksCell, size: 120 }),
  col.display({ ...base, id: "review", header: "Review", cell: ReviewCell, size: 120 }),
  col.display({ ...base, id: "next", header: "Next step", cell: StatusCell, size: 170 }),
];
