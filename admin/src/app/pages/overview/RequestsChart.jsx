// Website requests per month: booked / still waiting / not booked (stacked bars).
// Data: GET /admin/overview/bookings → months[]. "Not booked" = declined, expired or cancelled.
import { useState } from "react";
import { DateTime } from "luxon";
import PropTypes from "prop-types";

import { Skeleton } from "components/ui";

import { ChartTooltip, Swatch } from "./parts";

const SERIES = [
  { key: "booked", label: "Booked", color: "var(--pba-ink)" },
  { key: "waiting", label: "Waiting", color: "var(--pba-line-strong)" },
  { key: "notBooked", label: "Not booked", color: "var(--pba-alert)" },
];
const PLOT_H = 168; // px
const GAP = 2; // px of surface between stacked segments

const monthLabel = (month, format) => DateTime.fromFormat(month, "yyyy-MM").toFormat(format);

/** 0, a round step, 2× and 3× it — enough to read the bars without a busy grid. */
function niceTicks(max) {
  const step = Math.max(1, Math.ceil(max / 3));
  return [0, step, step * 2, step * 3];
}

export function RequestsChart({ data }) {
  const [hover, setHover] = useState(null);

  if (!data) return <RequestsChartSkeleton />;

  const { months, totals } = data;
  const answered = totals.booked + totals.notBooked;
  const all = answered + totals.waiting;
  const ticks = niceTicks(Math.max(...months.map((m) => m.booked + m.waiting + m.notBooked), 1));
  const top = ticks.at(-1);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="caps text-ink-muted">Booked</p>
          <p className="mt-2 text-[2.5rem] leading-none text-ink">
            {answered ? `${Math.round((totals.booked / answered) * 100)}%` : "—"}
          </p>
          <p className="mt-1 text-small text-ink-muted">of answered requests, last {months.length} months</p>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-small text-ink">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <Swatch color={s.color} />
              {s.label} <span className="tabular-nums text-ink-muted">{totals[s.key]}</span>
            </li>
          ))}
        </ul>
      </div>

      {all === 0 ? (
        <p className="mt-6 border-t border-line pt-6 text-small text-ink-muted">
          No requests from the website in the last {months.length} months.
        </p>
      ) : (
        <div className="relative mt-6 flex gap-3">
          {/* y axis */}
          <div className="relative w-6 shrink-0 text-right text-tiny tabular-nums text-ink-muted" style={{ height: PLOT_H }}>
            {ticks.map((t) => (
              <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: (t / top) * PLOT_H }}>
                {t}
              </span>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            {/* recessive grid */}
            <div className="absolute inset-x-0 top-0" style={{ height: PLOT_H }} aria-hidden="true">
              {ticks.map((t) => (
                <div
                  key={t}
                  className={t === 0 ? "absolute inset-x-0 border-t border-line-strong/60" : "absolute inset-x-0 border-t border-line"}
                  style={{ bottom: (t / top) * PLOT_H }}
                />
              ))}
            </div>
            <div className="relative grid" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}>
              {months.map((m, i) => {
                const segments = SERIES.filter((s) => m[s.key] > 0);
                return (
                  <div
                    key={m.month}
                    className="group flex cursor-default flex-col items-center"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <div
                      className="flex w-full flex-col-reverse items-center rounded-sm group-hover:bg-paper-alt/70"
                      style={{ height: PLOT_H, gap: GAP }}
                      aria-label={`${monthLabel(m.month, "LLLL")}: ${SERIES.map((s) => `${m[s.key]} ${s.label.toLowerCase()}`).join(", ")}`}
                      role="img"
                    >
                      {segments.map((s, j) => (
                        <div
                          key={s.key}
                          className={j === segments.length - 1 ? "w-[42%] max-w-10 rounded-t-[4px]" : "w-[42%] max-w-10"}
                          style={{ height: Math.max((m[s.key] / top) * PLOT_H - GAP, 2), background: s.color }}
                        />
                      ))}
                    </div>
                    <span className={hover === i ? "mt-2 caps text-ink" : "mt-2 caps text-ink-muted"}>
                      {monthLabel(m.month, "LLL")}
                    </span>
                  </div>
                );
              })}
            </div>
            {hover != null && (
              <ChartTooltip
                // Beside the hovered month, never on top of it.
                style={
                  hover < months.length / 2
                    ? { top: 0, left: `${((hover + 1) / months.length) * 100}%` }
                    : { top: 0, right: `${((months.length - hover) / months.length) * 100}%` }
                }
              >
                <p className="caps text-ink-muted">{monthLabel(months[hover].month, "LLLL yyyy")}</p>
                <ul className="mt-1.5 space-y-0.5">
                  {SERIES.map((s) => (
                    <li key={s.key} className="flex items-center gap-2">
                      <Swatch color={s.color} />
                      <span className="flex-1">{s.label}</span>
                      <span className="tabular-nums">{months[hover][s.key]}</span>
                    </li>
                  ))}
                </ul>
              </ChartTooltip>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

RequestsChart.propTypes = {
  data: PropTypes.shape({
    months: PropTypes.arrayOf(PropTypes.object).isRequired,
    totals: PropTypes.object.isRequired,
  }),
};

function RequestsChartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading requests">
      <Skeleton className="h-3 w-16 rounded" />
      <Skeleton className="mt-3 h-10 w-24 rounded" />
      <div className="mt-6 flex items-end gap-6 pl-9" style={{ height: PLOT_H }}>
        {[45, 70, 30, 85, 60, 50].map((h) => (
          <Skeleton key={h} className="flex-1 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}
