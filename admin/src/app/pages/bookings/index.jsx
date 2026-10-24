// Admin · Bookings — every tab of docs/api-bookings.md (design: AdminBookings*.dc.html).
//   - Requests: TanStack table over GET /requests (client-side filters, see useBookingsTable).
//   - Upcoming / Follow-up / Done / Expired / Cancelled: server-side list over GET /?tab=.
//   - Requests and Upcoming can switch to the month calendar (GET /calendar).
// Header stats and tab counts come from GET /summary. Every booking, in any tab, opens the same
// page (/bookings/:id, see booking/index.jsx) and remembers which tab to come back to.
//
// State management follows the slices/<domain>/{store,thunks}.js pattern used in
// rebate/FrontEnd, with Zustand for the store (see admin/src/slices/bookings).
import clsx from "clsx";
import PropTypes from "prop-types";
import { useEffect } from "react";
import { CalendarDaysIcon, ListBulletIcon } from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router";

import { Page } from "components/shared/Page";
import { PageHeader } from "components/shared/layout/PageHeader";
import { Section } from "components/shared/layout/Section";
import { useSectionSkin } from "components/shared/layout/useSectionSkin";
import { StatRow } from "components/shared/layout/StatRow";
import { todayLabel } from "utils/date";
import {
  useBookingsStore,
  loadRequestsThunk,
  loadSummaryThunk,
  loadListThunk,
  loadCalendarThunk,
  loadServicesThunk,
} from "slices";

import { BookingsTable } from "./BookingsTable";
import { CalendarView } from "./CalendarView";
import { bookingPath } from "./helpers";
import { EMPTY_TEXT, NO_MATCH_TEXT, TABS, money } from "./labels";
import { SessionCard } from "./sessionCells";
import { SessionToolbar } from "./SessionToolbar";
import { ToolsBar } from "./ToolsBar";
import { BookingsToolbar } from "./Toolbar";
import { RequestCard } from "./rows";
import { useBookingsTable } from "./useBookingsTable";
import { useBookingsUrlState } from "./useBookingsUrlState";
import { useSessionsTable } from "./useSessionsTable";

// Tabs whose bookings show up on the calendar (requests + active future sessions).
const CALENDAR_TABS = ["requests", "upcoming"];

export default function Bookings() {
  // Must run before the store selectors below: it loads ?tab=…&page=… into the store first.
  useBookingsUrlState();
  const { isShadow } = useSectionSkin();
  const tab = useBookingsStore((s) => s.tab);
  const setTab = useBookingsStore((s) => s.setTab);
  const view = useBookingsStore((s) => s.view);
  const setView = useBookingsStore((s) => s.setView);
  const summary = useBookingsStore((s) => s.summary);
  const services = useBookingsStore((s) => s.services);
  const navigate = useNavigate();
  // Every stage opens the same booking page; it remembers which tab to come back to.
  const openBooking = (id) => navigate(bookingPath(id), { state: { from: tab }, viewTransition: true });

  // Requests tab
  const requests = useBookingsStore((s) => s.requests);
  const loading = useBookingsStore((s) => s.loading);
  const page = useBookingsStore((s) => s.page);
  const pageSize = useBookingsStore((s) => s.pageSize);

  // Server-side tabs
  const list = useBookingsStore((s) => s.list);
  const query = useBookingsStore((s) => s.query);
  const setQuery = useBookingsStore((s) => s.setQuery);

  const calendar = useBookingsStore((s) => s.calendar);
  const setMonth = useBookingsStore((s) => s.setMonth);

  const table = useBookingsTable({
    rows: requests.items,
    total: requests.total,
    pageSize,
  });

  const sessionsTable = useSessionsTable({
    tab,
    rows: list.items,
    total: list.total,
    pageSize,
  });

  const isRequests = tab === "requests";
  const canCalendar = CALENDAR_TABS.includes(tab);
  const showCalendar = canCalendar && view === "calendar";

  useEffect(() => {
    loadServicesThunk();
    loadSummaryThunk();
  }, []);

  useEffect(() => {
    if (isRequests) loadRequestsThunk();
  }, [isRequests, page, pageSize]);

  useEffect(() => {
    if (!isRequests) loadListThunk();
  }, [isRequests, tab, query, pageSize]);

  useEffect(() => {
    if (showCalendar) loadCalendarThunk();
  }, [showCalendar, calendar.month]);

  const counts = summary?.counts ?? {};
  const filtered = Boolean(query.q || query.serviceId);
  const tableState = table.getState();
  const activeFilters = isRequests
    ? tableState.columnFilters.length + (tableState.globalFilter ? 1 : 0)
    : Number(Boolean(query.q)) + Number(Boolean(query.serviceId));

  return (
    <Page title="Bookings">
      <div className="page-vt px-(--margin-x) pb-12">
        <PageHeader
          eyebrow={todayLabel()}
          title="Bookings"
          actions={
            <Link
              to="/bookings/new"
              viewTransition
              className="inline-flex h-10 items-center border border-ink bg-ink px-4 text-small caps text-on-ink transition-colors hover:bg-ink/85"
            >
              New booking
            </Link>
          }
        >
          <StatRow
            items={[
              { label: "Requests to confirm", value: summary?.requests },
              { label: "Sessions this week", value: summary?.sessionsThisWeek },
              {
                label: "Payments pending",
                value: summary ? money(summary.paymentsPendingCents) : null,
              },
              { label: "Follow-ups due", value: summary?.followupsDue },
            ]}
          />
        </PageHeader>

        <div className="mt-6">
          <nav
            aria-label="Booking tabs"
            className={clsx(
              "flex max-w-full gap-1 overflow-x-auto rounded-full p-1",
              isShadow ? "bg-paper-alt" : "border border-line",
            )}
          >
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => !active && setTab(t.id)}
                  className={clsx(
                    "flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-body font-medium transition-colors",
                    active
                      ? isShadow
                        ? "bg-paper text-ink shadow-sm"
                        : "bg-paper-alt text-ink ring-1 ring-line-strong"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {t.label}
                  {counts[t.id] != null && (
                    <span className={clsx("text-small", active ? "text-ink" : "text-ink-muted")}>
                      {counts[t.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <Section className={clsx(isShadow ? "mt-6 py-1" : "mt-8")}>
          {/* Table tools: belong to the table, so they live inside it, quieter than the tabs. */}
          <ToolsBar label={showCalendar ? "View" : "Filters"} activeCount={activeFilters}>
            <div className="min-w-0">
              {!showCalendar &&
                (isRequests ? (
                  <BookingsToolbar table={table} serviceOptions={services} />
                ) : (
                  <SessionToolbar
                    key={tab}
                    query={query}
                    onChange={setQuery}
                    serviceOptions={services}
                  />
                ))}
            </div>
            {canCalendar && <ViewToggle view={view} onChange={setView} />}
          </ToolsBar>
          {showCalendar ? (
            <CalendarView
              data={{ days: calendar.days }}
              month={calendar.month}
              onMonthChange={setMonth}
              loading={calendar.loading}
              onPickBooking={(b) => openBooking(b.id)}
            />
          ) : isRequests ? (
            <BookingsTable
              table={table}
              onOpen={openBooking}
              Card={RequestCard}
              emptyText="No requests match your filters."
              total={requests.total}
              loading={loading}
            />
          ) : (
            <div className="mt-2">
              {list.error && (
                <p role="alert" className="py-4 text-small text-alert">
                  {list.error}
                </p>
              )}
              <BookingsTable
                table={sessionsTable}
                onOpen={openBooking}
                Card={SessionCard}
                emptyText={filtered ? NO_MATCH_TEXT : EMPTY_TEXT[tab]}
                total={list.total}
                loading={list.loading}
              />
            </div>
          )}
        </Section>
      </div>

    </Page>
  );
}

function ViewToggle({ view, onChange }) {
  return (
    <div role="group" aria-label="View" className="ml-auto flex shrink-0 gap-0.5">
      {[
        { id: "list", label: "List", Icon: ListBulletIcon },
        { id: "calendar", label: "Calendar", Icon: CalendarDaysIcon },
      ].map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          aria-label={label}
          title={label}
          onClick={() => onChange(id)}
          className={clsx(
            "flex size-8 items-center justify-center rounded-md transition-colors",
            view === id ? "bg-line text-ink" : "text-ink-muted hover:text-ink",
          )}
        >
          <Icon className="size-[18px]" strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

ViewToggle.propTypes = { view: PropTypes.string, onChange: PropTypes.func };
