// Admin · Galleries — the list (design: Gallery*.dc.html; the storage rules are in
// docs/almacenamiento-fotos.md). A place to find any gallery, past or current: always-visible
// search, collapsible filters (State, Sort) and the shared server-side table. A row opens the
// gallery editor (/galleries/:id); "New gallery" opens /galleries/new. The sidebar's
// "delete old galleries" link lands here with ?sort=oldest, and Size shows what each one frees.
import clsx from "clsx";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router";

import { Page } from "components/shared/Page";
import { PageHeader } from "components/shared/layout/PageHeader";
import { Section } from "components/shared/layout/Section";
import { StatRow } from "components/shared/layout/StatRow";
import { useSectionSkin } from "components/shared/layout/useSectionSkin";
import { loadGalleriesListThunk, loadGalleriesSummaryThunk, useGalleriesStore } from "slices";
import { todayLabel } from "utils/date";

import { BookingsTable } from "../bookings/BookingsTable";
import { ToolsBar } from "../bookings/ToolsBar";
import { GalleryCard } from "./cells";
import { GalleriesFilters, GalleriesSearch } from "./GalleriesToolbar";
import { galleryPath, NEW_GALLERY_PATH } from "./helpers";
import { EMPTY_TEXT, formatSize, NO_MATCH_TEXT } from "./labels";
import { useGalleriesTable } from "./useGalleriesTable";
import { useGalleriesUrlState } from "./useGalleriesUrlState";

export default function Galleries() {
  // Must run before the store selectors below: it loads ?tab=…&sort=… into the store first.
  useGalleriesUrlState();
  const { isShadow } = useSectionSkin();
  const navigate = useNavigate();
  const tab = useGalleriesStore((s) => s.tab);
  const setTab = useGalleriesStore((s) => s.setTab);
  const clearFilters = useGalleriesStore((s) => s.clearFilters);
  const summary = useGalleriesStore((s) => s.summary);
  const list = useGalleriesStore((s) => s.list);
  const query = useGalleriesStore((s) => s.query);
  const setQuery = useGalleriesStore((s) => s.setQuery);
  const pageSize = useGalleriesStore((s) => s.pageSize);

  const table = useGalleriesTable({ rows: list.items, total: list.total, pageSize });

  useEffect(() => {
    loadGalleriesSummaryThunk();
  }, []);

  useEffect(() => {
    loadGalleriesListThunk();
  }, [tab, query, pageSize]);

  const counts = summary?.counts ?? {};
  const activeFilters = Number(tab !== "all") + Number(query.sort !== "newest");
  const filtered = activeFilters > 0 || Boolean(query.q);
  const open = (id) => navigate(galleryPath(id), { viewTransition: true });

  return (
    <Page title="Galleries">
      <div className="page-vt px-(--margin-x) pb-12">
        <PageHeader
          eyebrow={todayLabel()}
          title="Galleries"
          actions={
            <Link
              to={NEW_GALLERY_PATH}
              viewTransition
              className="inline-flex h-10 items-center border border-ink bg-ink px-4 text-small caps text-on-ink transition-colors hover:bg-ink/85"
            >
              New gallery
            </Link>
          }
        >
          <StatRow
            items={[
              { label: "Galleries", value: summary?.galleryCount },
              { label: "Drafts", value: summary?.counts?.draft },
              { label: "Photos", value: summary?.photoCount },
              { label: "Photos on disk", value: summary ? formatSize(summary.photosBytes) : null },
            ]}
          />
        </PageHeader>

        <Section className={clsx(isShadow ? "mt-6 py-1" : "mt-8")}>
          <GalleriesSearch value={query.q} onChange={setQuery} />
          <ToolsBar label="Filters" activeCount={activeFilters} storageKey="pba-galleries-tools-open" id="galleries-tools">
            <div className="min-w-0 grow">
              <GalleriesFilters
                tab={tab}
                onTab={setTab}
                counts={counts}
                query={query}
                onChange={setQuery}
                onClear={clearFilters}
                hasFilters={filtered}
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
            Card={GalleryCard}
            emptyText={filtered ? NO_MATCH_TEXT : EMPTY_TEXT[tab]}
            total={list.total}
            loading={list.loading}
          />
        </Section>
      </div>
    </Page>
  );
}
