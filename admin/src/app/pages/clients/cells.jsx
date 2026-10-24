// Cells of the Clients table (see columns.js) and its phone card. Same palette rules as the
// Bookings cells: hairlines, caps tags, no fills.
import { formatDate } from "utils/date";

import { ToneTag } from "../bookings/parts";
import { clientStatusLabel, loginInfo, money } from "./labels";

export function ReturningTag() {
  return <span className="caps border border-line px-1.5 py-px text-tiny text-ink-muted">Returning</span>;
}

export function NameCell({ row }) {
  const c = row.original;
  return (
    <div className="flex min-w-0 flex-col">
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-ink">{c.displayName}</span>
        {c.returning && <ReturningTag />}
      </span>
      <span className="mt-0.5 truncate text-small text-ink-muted">{c.email}</span>
    </div>
  );
}

export function SessionsCell({ row }) {
  const c = row.original;
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-ink">{c.sessionCount}</span>
      <span className="mt-0.5 truncate text-small text-ink-muted">{c.sessionTypes.join(", ") || "—"}</span>
    </div>
  );
}

/** Last session and next session, one under the other. */
export function ActivityCell({ row }) {
  const c = row.original;
  if (!c.lastSessionAt && !c.nextSessionAt) return <span className="text-ink-muted">—</span>;
  return (
    <div className="flex flex-col whitespace-nowrap text-small">
      {c.nextSessionAt && <span className="text-ink">Next {formatDate(c.nextSessionAt, "LLL d")}</span>}
      {c.lastSessionAt && <span className="text-ink-muted">Last {formatDate(c.lastSessionAt, "LLL d")}</span>}
    </div>
  );
}

export const ReceivedCell = ({ row }) => (
  <span className="text-ink">{row.original.receivedCents > 0 ? money(row.original.receivedCents) : "—"}</span>
);

export function LoginCell({ row }) {
  const info = loginInfo(row.original.login);
  return <ToneTag tone={info.tone}>{info.label}</ToneTag>;
}

export const StatusCell = ({ row }) => (
  <ToneTag tone={row.original.status?.tone} className="whitespace-normal">
    {clientStatusLabel(row.original.status)}
  </ToneTag>
);

// Phone card (inside the shared button of BookingsTable).
export function ClientCard({ booking: c }) {
  const meta = [c.sessionCount > 0 && `${c.sessionCount} · ${c.sessionTypes.join(", ")}`, c.receivedCents > 0 && money(c.receivedCents)]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <span className="flex items-center gap-2">
        <span className="text-ink text-[1.3125rem] leading-tight">{c.displayName}</span>
        {c.returning && <ReturningTag />}
      </span>
      <span className="text-small text-ink-muted">{c.email}</span>
      {meta && <span className="text-small text-ink-muted">{meta}</span>}
      <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        <ToneTag tone={c.status?.tone}>{clientStatusLabel(c.status)}</ToneTag>
      </span>
    </>
  );
}
