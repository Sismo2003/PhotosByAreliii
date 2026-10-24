---
name: admin-tables
description: Mandatory structure for every data table and every loading state in the admin (admin/src) — TanStack table shell, filters toolbar, phone cards, fixed height with scroll, floating pagination island, and Skeleton placeholders instead of "Loading…" text. Use whenever creating, editing or porting a table/list in admin/ (bookings, clients, galleries, services, mail…), including converting grid/div "lists" into tables.
---

# Admin tables — one structure, always

Every table an agent builds in `admin/` uses the same anatomy as Bookings. Do not invent a new
list layout (CSS-grid rows, ad-hoc cards, custom pagers). Reference implementation:
`admin/src/app/pages/bookings/`.

## Anatomy (top to bottom)

1. **Section** (`components/shared/layout/Section`) wrapping everything, respecting the
   Hairlines/Shadow skin (`useSectionSkin`).
2. **ToolsBar** (`ToolsBar.jsx`) with the filters: search + facet filters, column visibility when
   useful, active-filter count. Requests-style (client-side TanStack filters) → `Toolbar.jsx`;
   server-side → `SessionToolbar.jsx` (debounced search, resets to page 1).
3. **`BookingsTable`-style shell** (`BookingsTable.jsx`, generalised via `table`, `onOpen`,
   `Card`, `emptyText`, `total`, `loading`):
   - tablet/desktop: `Table/THead/TBody/Tr/Th/Td` from `components/ui`, sticky header
     (`bg-paper caps text-ink-muted`), row hover `hover:bg-paper-alt`, whole row clickable,
     `TableSortIcon` on sortable columns, empty row with `colSpan`;
   - **height limit + internal scroll**: `h-[calc(100vh-22rem)] overflow-auto` (phone list:
     `max-h-[calc(100vh-22rem)] overflow-auto`), with `pb-20` so the island never covers the last row;
   - phone (`< md`): stacked cards, no horizontal scroll, min tap target 44px;
   - `loading` with rows already on screen → `opacity-60`; first load (no rows yet) → **Skeleton**
     rows/cards in the same shape (the shell does this itself when `loading && rows.length === 0`),
     never a "Loading…" paragraph.
4. **Floating pagination island** (`components/shared/table/PaginationIsland.jsx`), absolutely
   positioned at the bottom of the table wrapper (`relative`). Rows-per-page select, "x–y of
   total", "Page n of m", prev/next. Never put a static footer pager under a table, and don't use
   `PaginationSection` for new tables.

## Data rules

- Columns in a `columns.js` (`createColumnHelper`), cells in `rows.jsx`/`*Cells.jsx`; the table
  instance lives in a `use<Name>Table.js` hook called at page level so toolbar and body share it.
- Server pagination (`manualPagination: true`, `pageCount` from total): derive `pagination` from
  the store (`page`, `pageSize`) — never local `useState` copies; a page-size change goes to the
  store's `setPageSize` (resets to page 1) and the load effect depends on `pageSize`.
  Pass `total` (server total) to the shell/island.
- List state (tab, search, filters, page, page size) lives in the URL query string, synced with the
  store (`bookings/useBookingsUrlState.js`: URL → store on first render, store → URL with `replace`;
  defaults omitted). New tables copy that pattern.
- Server-paginated tables sort on the server (`manualSorting: true`, `sort`/`dir` in the query and URL,
  allow-listed in the backend validator + `sortOrderBy`). Never sort just the loaded page; make a
  column non-sortable if the database can't order it (derived values).
- Dates → Luxon via `utils/date`; phones → `utils/phone` (see root CLAUDE.md).

## Style

Project palette only: `paper`, `paper-alt`, `ink`, `ink-muted`, `line`, `line-strong`, `alert`.
`caps` for headers, `ToneTag` (dot + caps) for statuses. No gray fills, no generic Tailwind
grays, no glass from other projects. Must work in dark mode and both section skins
(see memory: dark-mode-contrast, sections-skins). Don't repeat text already on the screen.

## Skeleton — mandatory for every loading state

Every component an agent generates that waits for data MUST show `Skeleton`
(`import { Skeleton } from "components/ui"`, the same component as REACT-COMPONETS) while loading.
Plain "Loading…" text, bare spinners for content areas and blank gaps are not allowed.

- Shape the skeleton like the content it replaces (same rows/columns/heights) so nothing jumps
  when data arrives: `<Skeleton className="h-4 w-2/3 rounded" />`.
- Tables: handled by the shell (see above). Stats: `StatRow` renders a Skeleton when a value is
  `null`/`undefined`. Detail pages: stacked Skeleton blocks with `aria-busy="true"`.
  Calendars/overlays: `<Skeleton aria-hidden className="absolute inset-0 opacity-50" />`.
- Spinners (`Spinner`/`GhostSpinner`) are only for button/action busy states, not for content.
- Keep it in the page's own file or a small `*Skeleton` component; use `animate={false}` only for
  reduced-motion cases.

## Checklist before finishing

- [ ] Uses the shared shell + island, not a custom list
- [ ] Filters toolbar present (search at minimum)
- [ ] Height-limited with scroll; header sticky; island doesn't hide rows
- [ ] Phone cards; empty state; **Skeleton** loading state (no "Loading…" text)
- [ ] Pagination wired to the store/server and `total` passed
- [ ] `npx eslint` and `npx vite build` clean in `admin/`
