// Cells of the Add-ons table (see addonColumns.js) and its phone card.
import PropTypes from "prop-types";

import { useServicesStore } from "slices";

import { ToneTag } from "../bookings/parts";
import { addsLabel, money, offeredLabel, plural } from "./labels";

export function AddonNameCell({ row }) {
  return <span className="truncate text-ink">{row.original.name}</span>;
}

export function AddonPriceCell({ row }) {
  return <span className="whitespace-nowrap text-ink">{money(row.original.priceCents)}</span>;
}

export function AddonAddsCell({ row }) {
  const m = row.original.minutes;
  return <span className={m ? "text-ink" : "text-ink-muted"}>{addsLabel(m)}</span>;
}

export function OfferedCell({ row }) {
  const options = useServicesStore((s) => s.options);
  const ids = row.original.serviceIds;
  return <span className={ids.length ? "text-ink" : "text-ink-muted"}>{offeredLabel(ids, options)}</span>;
}

export function AddonBookingsCell({ row }) {
  const n = row.original.bookingCount;
  return <span className={n ? "text-ink" : "text-ink-muted"}>{n}</span>;
}

export function ActiveCell({ row }) {
  return row.original.active ? <ToneTag tone="done">On</ToneTag> : <ToneTag tone="muted">Off</ToneTag>;
}

export function AddonCard({ booking: a }) {
  const options = useServicesStore((s) => s.options);
  return (
    <>
      <div className="flex w-full items-baseline justify-between gap-3">
        <span className="truncate text-body text-ink">{a.name}</span>
        <span className="shrink-0 text-ink">{money(a.priceCents)}</span>
      </div>
      <span className="text-small text-ink-muted">
        {[a.minutes ? addsLabel(a.minutes) : null, offeredLabel(a.serviceIds, options), plural(a.bookingCount, "booking")].filter(Boolean).join(" · ")}
      </span>
      {a.active ? <ToneTag tone="done">On</ToneTag> : <ToneTag tone="muted">Off</ToneTag>}
    </>
  );
}

AddonNameCell.propTypes = { row: PropTypes.object.isRequired };
AddonPriceCell.propTypes = AddonNameCell.propTypes;
AddonAddsCell.propTypes = AddonNameCell.propTypes;
OfferedCell.propTypes = AddonNameCell.propTypes;
AddonBookingsCell.propTypes = AddonNameCell.propTypes;
ActiveCell.propTypes = AddonNameCell.propTypes;
AddonCard.propTypes = { booking: PropTypes.object.isRequired };
