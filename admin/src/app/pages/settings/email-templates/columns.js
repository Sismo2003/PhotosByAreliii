// Columns of the email templates table. Cells live in cells.jsx. Everything is client-side: the
// catalog is a fixed list of 25 emails, loaded at once.
import { createColumnHelper } from "@tanstack/react-table";

import { EmailCell, LanguagesCell, SwitchCell, TriggerCell } from "./cells";

const columnHelper = createColumnHelper();

// Multi-select filter for FacedtedFilter (stores [value, …]).
const arrIncludesSome = (row, columnId, value) => !value?.length || value.includes(String(row.getValue(columnId)));

export const columns = [
  columnHelper.accessor((row) => `${row.name} ${row.when} ${row.key}`, {
    id: "email",
    header: "Email",
    cell: EmailCell,
    enableSorting: false,
  }),
  columnHelper.accessor("group", {
    id: "group",
    header: "Group",
    filterFn: arrIncludesSome,
    enableSorting: false,
    enableGlobalFilter: false,
  }),
  columnHelper.accessor("trigger", {
    id: "trigger",
    header: "Sent",
    cell: TriggerCell,
    filterFn: arrIncludesSome,
    enableSorting: false,
    enableGlobalFilter: false,
  }),
  columnHelper.display({ id: "languages", header: "Text", cell: LanguagesCell }),
  columnHelper.display({ id: "enabled", header: "On", cell: SwitchCell }),
];
