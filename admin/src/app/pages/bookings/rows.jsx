// Cells for the Bookings table. Project rules:
//   - dates always through utils/date (Luxon, America/Phoenix)
//   - phones always through utils/phone (libphonenumber-js)
//   - everything in the project's white/black palette; no gray fills or rounded corners
import { formatDate, fromNow } from "utils/date";
import { formatPhone, telHref } from "utils/phone";

// ---------------------------------------------------------------------------
// Code — "PBA-0142". EB Garamond semibold (project font) instead of font-mono, which
// renders thin and disappears against the dark bg-paper.
// ---------------------------------------------------------------------------
export function CodeCell({ row }) {
  return (
    <span className="text-[0.95rem] font-semibold tracking-tight text-ink">
      {row.original.code}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Client — display name + email muted underneath.
// ---------------------------------------------------------------------------
export function ClientCell({ row }) {
  const c = row.original.client;
  const name = c?.displayName ?? "—";
  const sub = c?.email ?? "—";
  return (
    <div className="flex flex-col">
      <span className="text-ink">{name}</span>
      <span className="mt-0.5 text-small text-ink-muted">{sub}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Service — package name only ("Graduation session"); the service name is already on screen
// (filter/tabs), so it is only a fallback. Extras as small caption when present.
// ---------------------------------------------------------------------------
export function ServiceCell({ row }) {
  const b = row.original;
  return (
    <div className="flex flex-col">
      <span className="text-ink">{b.packageNameSnapshot || b.serviceNameSnapshot}</span>
      {b.extras?.length > 0 && (
        <span className="mt-0.5 text-small text-ink-muted">
          {b.extras.map((e) => (e.quantity > 1 ? `${e.nameSnapshot} × ${e.quantity}` : e.nameSnapshot)).join(" · ")}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contact — phone as a tel: link, email muted. Hidden on narrow viewports via
// column visibility (see columns.js).
// ---------------------------------------------------------------------------
export function ContactCell({ row }) {
  const b = row.original;
  const phone = b.contactPhone ?? b.client?.phone ?? null;
  const email = b.contactEmail ?? b.client?.email ?? null;
  return (
    <div className="flex flex-col">
      {phone ? (
        <a
          href={telHref(phone)}
          className="text-ink underline-offset-2 hover:underline"
        >
          {formatPhone(phone)}
        </a>
      ) : (
        <span className="text-ink-muted">—</span>
      )}
      <span className="mt-0.5 truncate text-small text-ink-muted">{email ?? "—"}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// When — "Oct 12 · 8:00 AM" with a small "in 4 days" underneath.
// ---------------------------------------------------------------------------
export function WhenCell({ row }) {
  const b = row.original;
  return (
    <div className="flex flex-col whitespace-nowrap">
      <span className="text-ink">{formatDate(b.startsAt, "LLL d · h:mm a")}</span>
      <span className="mt-0.5 text-small text-ink-muted">
        {fromNow(b.startsAt)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Submitted — "Sep 30 · 2 days ago".
// ---------------------------------------------------------------------------
export function SubmittedCell({ row }) {
  return (
    <div className="flex flex-col whitespace-nowrap">
      <span className="text-ink">{formatDate(row.original.createdAt, "LLL d")}</span>
      <span className="mt-0.5 text-small text-ink-muted">
        {fromNow(row.original.createdAt)}
      </span>
    </div>
  );
}

// Phone card of the Requests tab (inside the shared button of BookingsTable).
export function RequestCard({ booking: b }) {
  return (
    <>
      <span className="caps text-ink-muted">{formatDate(b.startsAt, "ccc, LLL d · h:mm a")}</span>
      <span className="text-ink text-[1.3125rem] leading-tight">{b.client?.displayName ?? "—"}</span>
      <span className="text-small text-ink-muted">
        {[b.code, b.serviceNameSnapshot, b.locationName].filter(Boolean).join(" · ")}
      </span>
      <span className="text-small text-ink-muted mt-1">Sent {fromNow(b.createdAt)}</span>
    </>
  );
}
