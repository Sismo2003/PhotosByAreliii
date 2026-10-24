// The next 14 days: sessions, requests asking for a date, deposits due, galleries that expire and
// rebook reminders, grouped by studio day. Data: GET /admin/overview/bookings → agenda[].
import { useState } from "react";
import { Link } from "react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import groupBy from "lodash/groupBy";
import PropTypes from "prop-types";

import { Skeleton } from "components/ui";
import { fromStudioDay, nowInStudio, toStudio } from "utils/date";

import { ToneTag } from "../bookings/parts";
import { money } from "../bookings/labels";

function tag(event) {
  switch (event.type) {
    case "session":
      return event.status === "CONFIRMED"
        ? { tone: "done", text: "Confirmed" }
        : { tone: "pending", text: "Awaiting deposit" };
    case "request":
      return { tone: "new", text: "Request" };
    case "deposit":
      return { tone: "alert", text: `Deposit due ${money(event.amountCents)}` };
    case "expiry":
      return { tone: "alert", text: "Gallery expires" };
    default:
      return { tone: "pending", text: "Rebook" };
  }
}

/** Line under the name: what it is, plus the time when it has one. */
function detail(event) {
  const time = event.at ? toStudio(event.at).toFormat("h:mm a") : null;
  if (event.type === "deposit") return time ? `Deposit deadline · ${time}` : "Deposit deadline";
  return [event.detail, time].filter(Boolean).join(" · ");
}

function dayHeading(day) {
  const dt = fromStudioDay(day);
  const diff = Math.round(dt.diff(nowInStudio().startOf("day"), "days").days);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return dt.toFormat("cccc");
}

// Fixed page instead of an inner scroll. A day split across two pages repeats its date.
const PAGE_SIZE = 6;
// Agenda type runs 10% smaller than the page (body 17 → 15.3px, small 14 → 12.6px…).
const TEXT = {
  day: "text-[1.575rem]",
  body: "text-[0.95625rem] leading-[1.5]",
  small: "text-[0.7875rem] leading-[1.2rem]",
  caps: "text-[0.675rem]! leading-[0.9rem]!",
  tag: "text-[0.62rem]!",
};

export function Agenda({ data }) {
  const [page, setPage] = useState(0);

  if (!data) return <AgendaSkeleton />;

  if (data.agenda.length === 0) {
    return (
      <p className={clsx("border-t border-line py-6 text-ink-muted", TEXT.small)}>
        Nothing in the next {data.agendaDays} days.
      </p>
    );
  }

  const pages = Math.ceil(data.agenda.length / PAGE_SIZE);
  const current = Math.min(page, pages - 1);
  const from = current * PAGE_SIZE;
  const shown = data.agenda.slice(from, from + PAGE_SIZE);
  const days = Object.entries(groupBy(shown, "day"));

  return (
    <div className="min-w-0 overflow-x-hidden">
      {days.map(([day, events]) => {
        const dt = fromStudioDay(day);
        return (
          <div key={day} className="flex gap-4 border-t border-line py-3.5">
            <div className="w-12 shrink-0">
              <p className={clsx("leading-none text-ink", TEXT.day)}>{dt.toFormat("dd")}</p>
              <p className={clsx("mt-1 caps text-ink-muted", TEXT.caps)}>{dt.toFormat("LLL")}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className={clsx("caps text-ink-muted", TEXT.caps)}>{dayHeading(day)}</p>
              <ul className="mt-1">
                {events.map((event) => {
                  const t = tag(event);
                  return (
                    <li key={event.id}>
                      <Link
                        to={event.href}
                        className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md px-2 py-1.5 transition-colors hover:bg-paper-alt"
                      >
                        <span className="min-w-0 flex-1">
                          <span className={clsx("block truncate text-ink", TEXT.body)}>{event.title}</span>
                          <span className={clsx("block truncate text-ink-muted", TEXT.small)}>{detail(event)}</span>
                        </span>
                        <ToneTag tone={t.tone} className={TEXT.tag}>
                          {t.text}
                        </ToneTag>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}

      {pages > 1 && (
        <nav aria-label="Agenda pages" className="flex items-center justify-between gap-4 border-t border-line pt-4">
          <span className={clsx("tabular-nums text-ink-muted", TEXT.small)}>
            {from + 1}–{from + shown.length} of {data.agenda.length}
          </span>
          <div className="flex items-center gap-2">
            <PageButton label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)}>
              <ChevronLeftIcon className="size-4" />
            </PageButton>
            <span className={clsx("min-w-12 text-center tabular-nums text-ink", TEXT.small)}>
              {current + 1} / {pages}
            </span>
            <PageButton label="Next page" disabled={current === pages - 1} onClick={() => setPage(current + 1)}>
              <ChevronRightIcon className="size-4" />
            </PageButton>
          </div>
        </nav>
      )}
    </div>
  );
}

/** Same round chevron buttons as the tables' pagination island. */
function PageButton({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full border border-line-strong text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line-strong"
    >
      {children}
    </button>
  );
}

PageButton.propTypes = {
  label: PropTypes.string,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  children: PropTypes.node,
};

Agenda.propTypes = {
  data: PropTypes.shape({ agenda: PropTypes.array.isRequired, agendaDays: PropTypes.number }),
};

function AgendaSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading agenda">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-4 border-t border-line py-4">
          <div className="w-14 shrink-0">
            <Skeleton className="h-7 w-9 rounded" />
            <Skeleton className="mt-2 h-3 w-8 rounded" />
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
          </div>
          <Skeleton className="h-3 w-24 self-center rounded" />
        </div>
      ))}
    </div>
  );
}
