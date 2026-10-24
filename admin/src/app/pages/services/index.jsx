// Admin · Services — what Areli offers (design: AdminServices.dc.html, without the landing tabs).
//   Header numbers (GET /summary) · two views: Services and Add-ons · always-visible search ·
//   collapsible filters · server-side tables with the shared Bookings shell.
// A service opens its own page (/services/:id: details, packages and the add-ons it allows);
// an add-on opens a dialog. This catalog feeds New booking and /book and nothing on the public
// landing: its copy and photos live in the frontend code.
// State management: slices/services (Zustand), list state mirrored in the URL.
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { Page } from "components/shared/Page";
import { PageHeader } from "components/shared/layout/PageHeader";
import { Section } from "components/shared/layout/Section";
import { StatRow } from "components/shared/layout/StatRow";
import { useSectionSkin } from "components/shared/layout/useSectionSkin";
import {
  loadAddonsListThunk,
  loadServiceOptionsThunk,
  loadServicesListThunk,
  loadServicesSummaryThunk,
  reorderAddonsThunk,
  reorderServicesThunk,
  useServicesStore,
} from "slices";
import { listAddons } from "services/catalog";
import { todayLabel } from "utils/date";

import { BookingsTable } from "../bookings/BookingsTable";
import { ActionButton } from "../bookings/parts";
import { ToolsBar } from "../bookings/ToolsBar";
import { AddonCard } from "./addonCells";
import { AddonDialog } from "./AddonDialog";
import { ServiceCard } from "./cells";
import { EMPTY_TEXT, NEW_SERVICE_PATH, NO_MATCH_TEXT, servicePath, VIEWS } from "./labels";
import { ReorderDialog } from "./ReorderDialog";
import { AddonsFilters, ServicesFilters, ServicesSearch } from "./ServicesToolbar";
import { useAddonsTable, useServicesTable } from "./useServicesTable";
import { useServicesUrlState } from "./useServicesUrlState";

export default function Services() {
  // Must run before the store selectors below: it loads ?view=…&page=… into the store first.
  useServicesUrlState();
  const { isShadow } = useSectionSkin();
  const navigate = useNavigate();
  const view = useServicesStore((s) => s.view);
  const setView = useServicesStore((s) => s.setView);
  const summary = useServicesStore((s) => s.summary);
  const pageSize = useServicesStore((s) => s.pageSize);
  const list = useServicesStore((s) => s.list);
  const query = useServicesStore((s) => s.query);
  const setQuery = useServicesStore((s) => s.setQuery);
  const clearFilters = useServicesStore((s) => s.clearFilters);
  const addons = useServicesStore((s) => s.addons);
  const addonQuery = useServicesStore((s) => s.addonQuery);
  const setAddonQuery = useServicesStore((s) => s.setAddonQuery);
  const clearAddonFilters = useServicesStore((s) => s.clearAddonFilters);
  const options = useServicesStore((s) => s.options);

  const [dialog, setDialog] = useState(null); // { addon } | null
  const [reordering, setReordering] = useState(false);

  const servicesTable = useServicesTable({ rows: list.items, total: list.total, pageSize });
  const addonsTable = useAddonsTable({ rows: addons.items, total: addons.total, pageSize });

  useEffect(() => {
    loadServicesSummaryThunk();
    loadServiceOptionsThunk();
  }, []);
  useEffect(() => {
    if (view === "services") loadServicesListThunk();
  }, [view, query, pageSize]);
  useEffect(() => {
    if (view === "addons") loadAddonsListThunk();
  }, [view, addonQuery, pageSize]);

  const isServices = view === "services";
  const state = isServices ? list : addons;
  const q = isServices ? query : addonQuery;
  const activeFilters = isServices ? Number(Boolean(query.status)) : Number(Boolean(addonQuery.active)) + Number(Boolean(addonQuery.serviceId));
  const filtered = activeFilters > 0 || Boolean(q.q);

  return (
    <Page title="Services">
      <div className="page-vt px-(--margin-x) pb-12">
        <PageHeader
          eyebrow={todayLabel()}
          title="Services"
          actions={
            <>
              <button type="button" onClick={() => setReordering(true)} className="min-h-11 text-small text-ink underline underline-offset-4 hover:text-ink-muted">
                Reorder
              </button>
              {isServices ? (
                <Link
                  to={NEW_SERVICE_PATH}
                  viewTransition
                  className="inline-flex h-10 items-center border border-ink bg-ink px-4 text-small caps text-on-ink transition-colors hover:bg-ink/85"
                >
                  Add service
                </Link>
              ) : (
                <ActionButton solid className="h-10 min-h-10" onClick={() => setDialog({ addon: null })}>
                  Add add-on
                </ActionButton>
              )}
            </>
          }
        >
          <StatRow
            items={[
              { label: "Bookable services", value: summary?.live },
              { label: "Packages on offer", value: summary?.packages },
              { label: "Add-ons on", value: summary?.activeExtras },
              { label: "All services", value: summary?.services },
            ]}
          />
        </PageHeader>

        <Section className={clsx(isShadow ? "mt-6 py-1" : "mt-8")}>
          <div role="tablist" aria-label="Catalog" className="flex gap-6 border-b border-line">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                onClick={() => setView(v.id)}
                className={clsx(
                  "-mb-px min-h-11 border-b-2 caps transition-colors",
                  view === v.id ? "border-ink text-ink" : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>

          {isServices ? (
            <ServicesSearch key="s" id="services-q" label="Find a service" placeholder="Service name" value={query.q} onChange={setQuery} />
          ) : (
            <ServicesSearch key="a" id="addons-q" label="Find an add-on" placeholder="Add-on name" value={addonQuery.q} onChange={setAddonQuery} />
          )}
          <ToolsBar label="Filters" activeCount={activeFilters} storageKey="pba-services-tools-open" id="services-tools">
            <div className="min-w-0 grow">
              {isServices ? (
                <ServicesFilters query={query} counts={summary?.counts ?? {}} onChange={setQuery} onClear={clearFilters} hasFilters={filtered} />
              ) : (
                <AddonsFilters query={addonQuery} onChange={setAddonQuery} onClear={clearAddonFilters} hasFilters={filtered} />
              )}
            </div>
          </ToolsBar>
          {state.error && (
            <p role="alert" className="py-4 text-small text-alert">
              {state.error}
            </p>
          )}
          {isServices ? (
            <BookingsTable
              table={servicesTable}
              onOpen={(id) => navigate(servicePath(id), { viewTransition: true })}
              Card={ServiceCard}
              emptyText={filtered ? NO_MATCH_TEXT.services : EMPTY_TEXT.services}
              total={list.total}
              loading={list.loading}
            />
          ) : (
            <BookingsTable
              table={addonsTable}
              onOpen={(id) => setDialog({ addon: addons.items.find((a) => a.id === id) ?? null })}
              Card={AddonCard}
              emptyText={filtered ? NO_MATCH_TEXT.addons : EMPTY_TEXT.addons}
              total={addons.total}
              loading={addons.loading}
            />
          )}
        </Section>
      </div>

      {dialog && <AddonDialog key={dialog.addon?.id ?? "new"} show onClose={() => setDialog(null)} addon={dialog.addon} />}
      {reordering && <OrderFor view={view} options={options} onClose={() => setReordering(false)} />}
    </Page>
  );
}

// Reorder works on the whole set (not the page on screen), so it loads its own copy.
function OrderFor({ view, options, onClose }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      if (view === "services") {
        if (live) setItems(options.map((o) => ({ id: o.id, label: o.name })));
      } else {
        const { data } = await listAddons({ page: 1, pageSize: 100 });
        if (live) setItems((data.data?.items ?? []).map((a) => ({ id: a.id, label: a.name })));
      }
    })();
    return () => {
      live = false;
    };
  }, [view, options]);

  if (!items) return null;
  return (
    <ReorderDialog
      show
      onClose={onClose}
      title={view === "services" ? "Reorder services" : "Reorder add-ons"}
      items={items}
      onSave={view === "services" ? reorderServicesThunk : reorderAddonsThunk}
    />
  );
}
