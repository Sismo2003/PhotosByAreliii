// Website visits, last 30 days, from Cloudflare Web Analytics (Backend/services/cloudflare-analytics.js).
// A visit = someone landing on any page of the site from outside it (first page of a session).
// INTEGRATION(cloudflare-analytics): until the backend has its keys it answers { ready: false } and
// this shows "Not connected" — docs/overview-integraciones.md.
import { useState } from "react";
import { DateTime } from "luxon";
import PropTypes from "prop-types";

import { Skeleton } from "components/ui";

const W = 240;
const H = 48;

function Sparkline({ daily }) {
  const [hover, setHover] = useState(null);
  if (daily.length < 2) return null;
  const max = Math.max(...daily.map((d) => d.visits), 1);
  const x = (i) => (i / (daily.length - 1)) * W;
  const y = (v) => H - 2 - (v / max) * (H - 4);
  const points = daily.map((d, i) => `${x(i)},${y(d.visits)}`).join(" ");
  const day = hover != null ? daily[hover] : null;

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-12 w-full overflow-visible"
        role="img"
        aria-label="Visits per day"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          setHover(Math.round(((e.clientX - box.left) / box.width) * (daily.length - 1)));
        }}
      >
        <polyline points={points} fill="none" stroke="var(--pba-ink)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {day && (
          <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="var(--pba-line-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <p className="mt-1 h-5 text-small text-ink-muted tabular-nums">
        {day ? `${DateTime.fromISO(day.date).toFormat("LLL d")} · ${day.visits.toLocaleString("en-US")} visits` : ""}
      </p>
    </div>
  );
}

Sparkline.propTypes = { daily: PropTypes.array.isRequired };

export function VisitsWidget({ data }) {
  if (!data) {
    return (
      <div aria-busy="true" aria-label="Loading visits">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="mt-3 h-10 w-28 rounded" />
        <Skeleton className="mt-5 h-12 w-full rounded" />
      </div>
    );
  }

  if (!data.ready) {
    return (
      <div>
        <p className="caps text-ink-muted">Not connected</p>
        <p className="mt-2 text-small text-ink-muted">
          Visits will show here once Cloudflare Web Analytics is set up on the website.
        </p>
      </div>
    );
  }

  if (data.error) return <p className="text-small text-alert">{data.error}</p>;

  const change = data.previousVisits ? Math.round(((data.visits - data.previousVisits) / data.previousVisits) * 100) : null;

  return (
    <div>
      <p className="caps text-ink-muted">Last {data.days} days</p>
      <p className="mt-2 text-[2.5rem] leading-none text-ink tabular-nums">{data.visits.toLocaleString("en-US")}</p>
      <p className="mt-1 text-small text-ink-muted">
        {change == null ? "" : `${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change)}% vs previous ${data.days} days · `}
        {data.pageViews.toLocaleString("en-US")} pages viewed
      </p>
      <Sparkline daily={data.daily} />
    </div>
  );
}

VisitsWidget.propTypes = {
  data: PropTypes.shape({
    ready: PropTypes.bool,
    error: PropTypes.string,
    days: PropTypes.number,
    visits: PropTypes.number,
    previousVisits: PropTypes.number,
    pageViews: PropTypes.number,
    daily: PropTypes.array,
  }),
};
