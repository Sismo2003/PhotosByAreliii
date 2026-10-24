// Month calendar over GET /calendar?month= — requests (dashed) and active sessions (solid).
// Desktop: chips inside each day ("5:00 PM Jasmine"), click opens the detail.
// Tablet / phone: dots per day + the agenda of the picked day underneath (design).
// Days are studio days (America/Phoenix), built with Luxon.
import clsx from "clsx";
import { Skeleton } from "components/ui";
import { DateTime } from "luxon";
import PropTypes from "prop-types";
import { useMemo, useState } from "react";

import { CALENDAR_MIN_MONTH } from "slices";
import { STUDIO_ZONE, formatDate, nowInStudio } from "utils/date";

import { paymentLabel, statusLabel } from "./labels";
import { ToneTag } from "./parts";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS = 3;

const monthStart = (month) => DateTime.fromISO(`${month}-01`, { zone: STUDIO_ZONE });

// Weeks start on Sunday: Luxon weekday is 1 (Mon)…7 (Sun) → offset 0 for Sunday.
function buildWeeks(month) {
  const first = monthStart(month);
  const lead = first.weekday % 7;
  const total = Math.ceil((lead + first.daysInMonth) / 7) * 7;
  const start = first.minus({ days: lead });
  const cells = Array.from({ length: total }, (_, i) => {
    const dt = start.plus({ days: i });
    return { dt, iso: dt.toISODate(), inMonth: dt.hasSame(first, "month") };
  });
  return Array.from({ length: total / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

const firstName = (b) => b.client?.firstName ?? b.client?.displayName?.split(" ")[0] ?? b.code;
const isRequest = (b) => b.status === "REQUEST";

export function CalendarView({ data, month, onMonthChange, loading, onPickBooking }) {
  const weeks = useMemo(() => buildWeeks(month), [month]);
  const byDate = useMemo(() => {
    const m = new Map();
    (data?.days ?? []).forEach((d) => m.set(d.date, d.items ?? []));
    return m;
  }, [data]);

  const todayIso = nowInStudio().toISODate();
  const [picked, setPicked] = useState(todayIso);
  const first = monthStart(month);
  const canGoBack = month > CALENDAR_MIN_MONTH;
  const shift = (n) => onMonthChange(first.plus({ months: n }).toFormat("yyyy-LL"));
  const agenda = byDate.get(picked) ?? [];

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <h2 className="text-title text-ink">{first.toFormat("LLLL yyyy")}</h2>
        <div className="flex items-center gap-1">
          <NavButton label="Previous month" disabled={!canGoBack} onClick={() => shift(-1)}>
            ←
          </NavButton>
          <NavButton
            label="This month"
            onClick={() => {
              onMonthChange(nowInStudio().toFormat("yyyy-LL"));
              setPicked(todayIso);
            }}
          >
            Today
          </NavButton>
          <NavButton label="Next month" onClick={() => shift(1)}>
            →
          </NavButton>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-small text-ink-muted">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-3 w-5 border border-line bg-paper-alt" />
          Session
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-3 w-5 border border-dashed border-line-strong" />
          Request
        </span>
      </div>

      <div className="relative mt-3 border-b border-line">
        {loading && (
          <Skeleton aria-hidden="true" className="absolute inset-0 z-10 opacity-50" />
        )}
        <div className="grid grid-cols-7 border-b border-line">
          {WEEKDAYS.map((w) => (
            <span key={w} className="py-2 text-center caps text-ink-muted lg:px-2 lg:text-left">
              {w}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0].iso} className="grid grid-cols-7">
            {week.map((cell) => (
              <DayCell
                key={cell.iso}
                cell={cell}
                items={cell.inMonth ? (byDate.get(cell.iso) ?? []) : []}
                isToday={cell.iso === todayIso}
                isPicked={cell.iso === picked}
                onPick={() => setPicked(cell.iso)}
                onPickBooking={onPickBooking}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Agenda of the picked day — tablet and phone only */}
      <div className="lg:hidden">
        <h3 className="mt-5 caps text-ink-muted">
          {DateTime.fromISO(picked, { zone: STUDIO_ZONE }).toFormat("cccc, LLLL d")}
        </h3>
        {agenda.length === 0 ? (
          <p className="py-6 text-ink-muted">No sessions this day.</p>
        ) : (
          <ul className="mt-2">
            {agenda.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onPickBooking(b)}
                  className={clsx(
                    "flex min-h-11 w-full flex-col gap-1 border-t py-3 text-left",
                    isRequest(b) ? "border-dashed border-line-strong" : "border-line",
                  )}
                >
                  <span className="caps text-ink-muted">
                    {formatDate(b.startsAt, "h:mm a")}
                    {isRequest(b) && " · Request"}
                  </span>
                  <span className="text-body-l text-ink">{b.client?.displayName ?? firstName(b)}</span>
                  {b.serviceNameSnapshot && (
                    <span className="text-small text-ink-muted">{b.serviceNameSnapshot}</span>
                  )}
                  {b.derived && (
                    <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <ToneTag tone={b.derived.status?.tone}>{statusLabel(b)}</ToneTag>
                      <ToneTag tone={b.derived.payment?.tone}>{paymentLabel(b)}</ToneTag>
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DayCell({ cell, items, isToday, isPicked, onPick, onPickBooking }) {
  const num = (
    <span
      className={clsx(
        "inline-flex size-7 items-center justify-center text-small",
        isToday ? "bg-ink text-on-ink" : cell.inMonth ? "text-ink" : "text-line-strong",
      )}
    >
      {cell.dt.day}
    </span>
  );

  return (
    <div className={clsx("border-t border-line", !cell.inMonth && "bg-paper-alt/50")}>
      {/* lg+: chips */}
      <div className="hidden min-h-28 p-1.5 lg:block">
        {num}
        <ul className="mt-1 space-y-1">
          {items.slice(0, MAX_CHIPS).map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onPickBooking(b)}
                title={`${b.code} · ${b.client?.displayName ?? ""}`}
                className={clsx(
                  "block w-full truncate px-1.5 py-1 text-left text-small text-ink transition-colors",
                  isRequest(b)
                    ? "border border-dashed border-line-strong hover:border-ink"
                    : "border border-paper-alt bg-paper-alt hover:border-ink",
                )}
              >
                {formatDate(b.startsAt, "h:mm a")} {firstName(b)}
              </button>
            </li>
          ))}
        </ul>
        {items.length > MAX_CHIPS && (
          <span className="mt-1 block text-tiny text-ink-muted">+{items.length - MAX_CHIPS} more</span>
        )}
      </div>

      {/* tablet / phone: day button with dots */}
      <button
        type="button"
        onClick={onPick}
        disabled={!cell.inMonth}
        aria-label={`${cell.dt.toFormat("cccc, LLLL d")}, ${items.length} ${items.length === 1 ? "booking" : "bookings"}`}
        aria-pressed={isPicked}
        className={clsx(
          "flex min-h-14 w-full flex-col items-center gap-1 py-1.5 lg:hidden",
          isPicked && cell.inMonth && "bg-paper-alt",
        )}
      >
        {num}
        <span className="flex flex-wrap justify-center gap-0.5">
          {items.slice(0, 4).map((b) => (
            <span
              key={b.id}
              aria-hidden="true"
              className={clsx(
                "size-1.5 rounded-full border border-ink",
                isRequest(b) ? "bg-transparent" : "bg-ink",
              )}
            />
          ))}
        </span>
      </button>
    </div>
  );
}

function NavButton({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="min-h-11 min-w-11 px-2 caps text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

CalendarView.propTypes = {
  data: PropTypes.object,
  month: PropTypes.string,
  onMonthChange: PropTypes.func,
  loading: PropTypes.bool,
  onPickBooking: PropTypes.func,
};
DayCell.propTypes = {
  cell: PropTypes.object,
  items: PropTypes.array,
  isToday: PropTypes.bool,
  isPicked: PropTypes.bool,
  onPick: PropTypes.func,
  onPickBooking: PropTypes.func,
};
NavButton.propTypes = {
  label: PropTypes.string,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  children: PropTypes.node,
};
