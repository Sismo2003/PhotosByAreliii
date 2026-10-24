// Disk of the photo folder as a donut, one slice per gallery (bytes really on disk — the backend
// walks each galleries/<id> folder). "Whole disk" adds what else is on the disk and the free
// space; "Galleries" splits only what the galleries take, so small ones stay visible.
// Data: GET /admin/overview/storage.
import { useState } from "react";
import { Link } from "react-router";
import clsx from "clsx";
import PropTypes from "prop-types";

import { Skeleton } from "components/ui";
import { LEVEL_STYLES, formatSize } from "components/shared/storage/storageLevel";

import { Swatch } from "./parts";

const RAMP = [1, 2, 3, 4, 5].map((n) => `var(--pba-chart-${n})`);
const REST = "var(--pba-chart-rest)";
const FREE = "var(--pba-chart-free)";
const LEVEL_LABEL = { OK: "Plenty of space", LOW: "Getting full", CRITICAL: "Almost full", FULL: "Full — uploads blocked" };

const R = 80; // donut radius (stroke center), px in the 200×200 viewBox
const STROKE = 26;
const C = 2 * Math.PI * R;
const GAP = 2; // px of surface between slices

/** Five gallery slices at most, then the rest folded — past ~6 slices a donut stops reading. */
function buildSlices(data, mode) {
  const galleryCount = mode === "disk" ? 4 : 5;
  const top = data.galleries.slice(0, galleryCount);
  const rest = data.galleries.slice(galleryCount);
  const slices = top.map((g, i) => ({
    key: `g${g.id}`,
    label: g.client,
    sub: g.title,
    href: `/galleries/${g.id}`,
    bytes: g.bytes,
    estimated: g.estimated,
    color: RAMP[i],
  }));
  if (rest.length) {
    slices.push({
      key: "rest",
      label: `${rest.length} other ${rest.length === 1 ? "gallery" : "galleries"}`,
      href: "/galleries?sort=oldest",
      bytes: rest.reduce((sum, g) => sum + g.bytes, 0),
      estimated: rest.some((g) => g.estimated),
      color: mode === "disk" ? RAMP[4] : REST,
    });
  }
  if (mode === "disk") {
    slices.push({ key: "other", label: "Other files", sub: "Uploads in progress, system files", bytes: data.otherBytes, color: REST });
    slices.push({ key: "free", label: "Free", bytes: data.freeBytes, color: FREE });
  }
  const total = slices.reduce((sum, s) => sum + s.bytes, 0) || 1;
  let start = 0;
  return slices
    .filter((s) => s.bytes > 0)
    .map((s) => {
      const len = (s.bytes / total) * C;
      const slice = { ...s, pct: (s.bytes / total) * 100, offset: start, len };
      start += len;
      return slice;
    });
}

const pctLabel = (pct) => (pct < 0.1 ? "<0.1%" : pct < 10 ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`);

export function StorageChart({ data }) {
  const [mode, setMode] = useState("disk");
  const [active, setActive] = useState(null);

  if (!data) return <StorageChartSkeleton />;

  const hasGalleries = data.galleries.length > 0;
  const view = hasGalleries ? mode : "disk";
  const slices = buildSlices(data, view);
  const current = slices.find((s) => s.key === active);
  const center = current
    ? { value: formatSize(current.bytes), label: current.label }
    : view === "disk"
      ? { value: formatSize(data.freeBytes), label: "free" }
      : { value: formatSize(data.galleriesBytes), label: "in galleries" };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={clsx("text-small", LEVEL_STYLES[data.level]?.text)}>
          {LEVEL_LABEL[data.level]} · {formatSize(data.freeBytes)} free of {formatSize(data.totalBytes)}
        </p>
        {hasGalleries && (
          <div role="group" aria-label="Show" className="inline-flex rounded-md border border-line p-0.5">
            {[
              { id: "disk", label: "Whole disk" },
              { id: "galleries", label: "Galleries" },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={view === o.id}
                onClick={() => setMode(o.id)}
                className={clsx(
                  "caps rounded px-3 py-1.5 transition-colors",
                  view === o.id ? "bg-ink text-paper" : "text-ink-muted hover:text-ink",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 grid items-center gap-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <div className="relative mx-auto w-full max-w-60">
          <svg viewBox="0 0 200 200" className="w-full -rotate-90" role="img" aria-label="Disk use by gallery">
            {slices.map((s) => (
              <circle
                key={s.key}
                cx="100"
                cy="100"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={active === s.key ? STROKE + 6 : STROKE}
                strokeDasharray={`${Math.max(s.len - (slices.length > 1 ? GAP : 0), 0.75)} ${C}`}
                strokeDashoffset={-s.offset}
                className="cursor-pointer transition-[stroke-width] duration-150"
                onMouseEnter={() => setActive(s.key)}
                onMouseLeave={() => setActive(null)}
              >
                <title>{`${s.label}: ${formatSize(s.bytes)} (${pctLabel(s.pct)})`}</title>
              </circle>
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
            <span className="text-title leading-none text-ink">{center.value}</span>
            <span className="mt-1 line-clamp-2 text-small text-ink-muted">{center.label}</span>
          </div>
        </div>

        <ul className="min-w-0">
          {slices.map((s) => {
            const row = (
              <>
                <Swatch color={s.color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">{s.label}</span>
                  {s.sub && <span className="block truncate text-small text-ink-muted">{s.sub}</span>}
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="block text-ink">
                    {s.estimated && <span title="Estimated: the photos aren't on this disk">≈ </span>}
                    {formatSize(s.bytes)}
                  </span>
                  <span className="block text-small text-ink-muted">{pctLabel(s.pct)}</span>
                </span>
              </>
            );
            const cls = clsx(
              "-mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors",
              active === s.key && "bg-paper-alt",
            );
            const hover = { onMouseEnter: () => setActive(s.key), onMouseLeave: () => setActive(null) };
            return (
              <li key={s.key} className="border-t border-line first:border-t-0">
                {s.href ? (
                  <Link to={s.href} className={clsx(cls, "hover:bg-paper-alt")} {...hover}>
                    {row}
                  </Link>
                ) : (
                  <div className={cls} {...hover}>
                    {row}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {!hasGalleries && <p className="mt-4 text-small text-ink-muted">No gallery has photos on this disk yet.</p>}
    </div>
  );
}

StorageChart.propTypes = {
  data: PropTypes.shape({
    totalBytes: PropTypes.number,
    freeBytes: PropTypes.number,
    otherBytes: PropTypes.number,
    galleriesBytes: PropTypes.number,
    level: PropTypes.string,
    hasEstimates: PropTypes.bool,
    galleries: PropTypes.array.isRequired,
  }),
};

function StorageChartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading storage">
      <Skeleton className="h-4 w-56 rounded" />
      <div className="mt-5 grid items-center gap-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <Skeleton className="mx-auto aspect-square w-full max-w-60 rounded-full" />
        <div className="space-y-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-2.5 rounded-[2px]" />
              <Skeleton className="h-4 flex-1 rounded" />
              <Skeleton className="h-4 w-14 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
