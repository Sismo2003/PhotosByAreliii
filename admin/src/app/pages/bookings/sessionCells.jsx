// Cells for the server-side tabs' tables (see sessionColumns.js). Same palette rules as rows.jsx.
import clsx from "clsx";

import { formatDate } from "utils/date";

import { TONE_TEXT, balanceCell, galleryLabel, money, paymentLabel, reviewLabel, statusLabel, thanksLabel } from "./labels";
import { ToneTag } from "./parts";

export function DateCell({ row }) {
  const b = row.original;
  return (
    <div className="flex flex-col whitespace-nowrap">
      <span className="text-ink">{formatDate(b.startsAt, "LLL d")}</span>
      <span className="mt-0.5 text-small text-ink-muted">{formatDate(b.startsAt, "h:mm a")}</span>
    </div>
  );
}

export function SessionClientCell({ row }) {
  const b = row.original;
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-ink">{b.client?.displayName ?? "—"}</span>
      <span className="mt-0.5 truncate text-small text-ink-muted">{b.client?.email ?? "—"}</span>
    </div>
  );
}

export function SessionServiceCell({ row }) {
  const b = row.original;
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-ink">{b.serviceNameSnapshot}</span>
      <span className="mt-0.5 truncate text-small text-ink-muted">{b.locationName ?? "—"}</span>
    </div>
  );
}

export const TotalCell = ({ row }) => <span className="text-ink">{money(row.original.totalCents)}</span>;

export const PaymentCell = ({ row }) => (
  <ToneTag tone={row.original.derived?.payment?.tone} className="whitespace-normal">
    {paymentLabel(row.original)}
  </ToneTag>
);

export const StatusCell = ({ row }) => (
  <ToneTag tone={row.original.derived?.status?.tone} className="whitespace-normal">
    {statusLabel(row.original)}
  </ToneTag>
);

function Tone({ tone, children }) {
  return <span className={clsx("text-small", TONE_TEXT[tone] ?? "text-line-strong")}>{children}</span>;
}

export function BalanceCell({ row }) {
  const bal = balanceCell(row.original);
  return <Tone tone={bal.tone}>{bal.text}</Tone>;
}

export const GalleryCell = ({ row }) => (
  <Tone tone={row.original.derived?.galleryState?.tone}>{galleryLabel(row.original)}</Tone>
);

export const ThanksCell = ({ row }) => (
  <Tone tone={row.original.thanksSentAt ? "done" : "muted"}>{thanksLabel(row.original)}</Tone>
);

export function ReviewCell({ row }) {
  const b = row.original;
  const done = b.reviewStatus === "RECEIVED" || b.reviewStatus === "REQUESTED";
  return <Tone tone={done ? "done" : "muted"}>{reviewLabel(b)}</Tone>;
}


// Phone card of the server-side tabs (inside the shared button of BookingsTable).
export function SessionCard({ booking: b }) {
  const meta = [b.serviceNameSnapshot, formatDate(b.startsAt, "h:mm a"), b.locationName]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <span className="caps text-ink-muted">{formatDate(b.startsAt, "ccc, LLL d · h:mm a")}</span>
      <span className="text-ink text-[1.3125rem] leading-tight">{b.client?.displayName ?? "—"}</span>
      <span className="text-small text-ink-muted">{meta}</span>
      <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        <ToneTag tone={b.derived?.status?.tone}>{statusLabel(b)}</ToneTag>
        <ToneTag tone={b.derived?.payment?.tone}>{paymentLabel(b)}</ToneTag>
      </span>
    </>
  );
}
