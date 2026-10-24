// Cells of the Services table (see columns.js) and its phone card. Same palette rules as the
// Bookings cells: hairlines, caps tags, no fills.
import PropTypes from "prop-types";

import { ToneTag } from "../bookings/parts";
import { packagesLabel, plural, priceRange, statusInfo } from "./labels";

export function NameCell({ row }) {
  const s = row.original;
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-ink">{s.name}</span>
      <span className="mt-0.5 truncate text-small text-ink-muted">{packagesLabel(s.packageCount, s.hiddenPackageCount)}</span>
    </div>
  );
}

export function PriceCell({ row }) {
  const s = row.original;
  return <span className="whitespace-nowrap text-ink">{priceRange(s.fromCents, s.toCents)}</span>;
}

export function AddonsCell({ row }) {
  const n = row.original.extraCount;
  return <span className={n ? "text-ink" : "text-ink-muted"}>{n ? plural(n, "add-on") : "None"}</span>;
}

export function BookingsCell({ row }) {
  const n = row.original.bookingCount;
  return <span className={n ? "text-ink" : "text-ink-muted"}>{n}</span>;
}

export function StatusCell({ row }) {
  const info = statusInfo(row.original.status);
  return <ToneTag tone={info.tone}>{info.label}</ToneTag>;
}

export function ServiceCard({ booking: s }) {
  const info = statusInfo(s.status);
  return (
    <>
      <div className="flex w-full items-baseline justify-between gap-3">
        <span className="truncate text-body text-ink">{s.name}</span>
        <span className="shrink-0 text-ink">{priceRange(s.fromCents, s.toCents)}</span>
      </div>
      <span className="text-small text-ink-muted">
        {[packagesLabel(s.packageCount, s.hiddenPackageCount), plural(s.extraCount, "add-on"), plural(s.bookingCount, "booking")].join(" · ")}
      </span>
      <ToneTag tone={info.tone}>{info.label}</ToneTag>
    </>
  );
}

NameCell.propTypes = { row: PropTypes.object.isRequired };
PriceCell.propTypes = NameCell.propTypes;
AddonsCell.propTypes = NameCell.propTypes;
BookingsCell.propTypes = NameCell.propTypes;
StatusCell.propTypes = NameCell.propTypes;
ServiceCard.propTypes = { booking: PropTypes.object.isRequired };
