// TanStack columns of the Galleries table. Cells live in cells.jsx. Sorting is done by the
// server over the whole list; only name and size can be ordered by clicking (their ids are the
// `sort` values), the rest of the orders live in the Sort filter.
import { createColumnHelper } from "@tanstack/react-table";

import { ExpiresCell, GalleryCell, PhotosCell, SessionCell, SizeCell, StatusCell } from "./cells";

const col = createColumnHelper();
const base = { enableSorting: false };

export const columns = [
  col.display({ id: "title", header: "Gallery", cell: GalleryCell, size: 320, enableSorting: true, sortDescFirst: false }),
  col.display({ ...base, id: "session", header: "Session", cell: SessionCell, size: 180 }),
  col.display({ ...base, id: "photos", header: "Photos", cell: PhotosCell, size: 90 }),
  col.display({ id: "size", header: "Size", cell: SizeCell, size: 100, enableSorting: true, sortDescFirst: true }),
  col.display({ ...base, id: "status", header: "Status", cell: StatusCell, size: 210 }),
  col.display({ ...base, id: "expires", header: "Expires", cell: ExpiresCell, size: 120 }),
];
