// Admin · Clients — the list (design: AdminClients.dc.html).
//   Header numbers (GET /summary) · always-visible search · collapsible filters (Group: All /
//   Upcoming / Follow-up / Past clients / Leads, Found me via, Gallery login, Sort) · server-side
//   table with the shared Bookings shell. It is a place to find past clients, not a tabbed inbox.
// A row opens the client's own page (/clients/:id, see client/index.jsx); "Add client" opens
// /clients/new. State management: slices/clients (Zustand), list state mirrored in the URL.
import clsx from "clsx";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router";

import { Page } from "components/shared/Page";
import { PageHeader } from "components/shared/layout/PageHeader";
import { Section } from "components/shared/layout/Section";
import { StatRow } from "components/shared/layout/StatRow";
import { useSectionSkin } from "components/shared/layout/useSectionSkin";
import { loadClientsListThunk, loadClientsSummaryThunk, useClientsStore } from "slices";
import { todayLabel } from "utils/date";

import { BookingsTable } from "../bookings/BookingsTable";
import { ToolsBar } from "../bookings/ToolsBar";
import { ClientCard } from "./cells";
import { ClientsFilters, ClientsSearch } from "./ClientsToolbar";
import { clientPath, NEW_CLIENT_PATH } from "./helpers";
import { EMPTY_TEXT, money, NO_MATCH_TEXT } from "./labels";
import { useClientsTable } from "./useClientsTable";
import { useClientsUrlState } from "./useClientsUrlState";

export default function Clients() {
  // Must run before the store selectors below: it loads ?tab=…&page=… into the store first.
  useClientsUrlState();
  const { isShadow } = useSectionSkin();
  const navigate = useNavigate();
  const tab = useClientsStore((s) => s.tab);
  const setTab = useClientsStore((s) => s.setTab);
  const clearFilters = useClientsStore((s) => s.clearFilters);
  const summary = useClientsStore((s) => s.summary);
  const list = useClientsStore((s) => s.list);
  const query = useClientsStore((s) => s.query);
  const setQuery = useClientsStore((s) => s.setQuery);
  const pageSize = useClientsStore((s) => s.pageSize);

  const table = useClientsTable({ rows: list.items, total: list.total, pageSize });

  useEffect(() => {
    loadClientsSummaryThunk();
  }, []);

  useEffect(() => {
    loadClientsListThunk();
  }, [tab, query, pageSize]);

  const counts = summary?.counts ?? {};
  const activeFilters = Number(tab !== "all") + Number(Boolean(query.heardFrom)) + Number(Boolean(query.login));
  const filtered = activeFilters > 0 || Boolean(query.q);
  const open = (id) => navigate(clientPath(id), { state: { from: tab }, viewTransition: true });

  return (
    <Page title="Clients">
      <div className="page-vt px-(--margin-x) pb-12">
        <PageHeader
          eyebrow={todayLabel()}
          title="Clients"
          actions={
            <Link
              to={NEW_CLIENT_PATH}
              viewTransition
              className="inline-flex h-10 items-center border border-ink bg-ink px-4 text-small caps text-on-ink transition-colors hover:bg-ink/85"
            >
              Add client
            </Link>
          }
        >
          <StatRow
            items={[
              { label: "Clients", value: summary?.total },
              { label: "Returning clients", value: summary?.returning },
              {
                label: summary ? `Received in ${summary.year}` : "Received this year",
                value: summary ? money(summary.receivedYearCents) : null,
              },
              { label: "Reach out soon", value: summary?.reachOutSoon },
            ]}
          />
        </PageHeader>

        <Section className={clsx(isShadow ? "mt-6 py-1" : "mt-8")}>
          <ClientsSearch value={query.q} onChange={setQuery} />
          <ToolsBar label="Filters" activeCount={activeFilters} storageKey="pba-clients-tools-open" id="clients-tools">
            <div className="min-w-0 grow">
              <ClientsFilters
                tab={tab}
                onTab={setTab}
                counts={counts}
                query={query}
                onChange={setQuery}
                onClear={clearFilters}
                hasFilters={activeFilters > 0 || Boolean(query.q)}
              />
            </div>
          </ToolsBar>
          {list.error && (
            <p role="alert" className="py-4 text-small text-alert">
              {list.error}
            </p>
          )}
          <BookingsTable
            table={table}
            onOpen={open}
            Card={ClientCard}
            emptyText={filtered ? NO_MATCH_TEXT : EMPTY_TEXT[tab]}
            total={list.total}
            loading={list.loading}
          />
        </Section>
      </div>
    </Page>
  );
}
