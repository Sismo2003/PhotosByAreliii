// Live summary beside the form (below it on phones): price lines, deposit, and the submit button.
import clsx from "clsx";
import PropTypes from "prop-types";

import { Switch } from "components/ui";
import { formatDate } from "utils/date";

import { INTEGRATIONS } from "../booking/integrations";
import { money } from "../labels";
import { durationLabel } from "../../services/labels";
import { ActionButton } from "../parts";

function Line({ label, value, strong }) {
  return (
    <div className={clsx("flex items-baseline justify-between gap-4 py-2", strong && "text-ink")}>
      <dt className={strong ? "caps text-ink" : "text-small text-ink-muted"}>{label}</dt>
      <dd className={strong ? "text-[1.75rem] leading-none text-ink" : "text-small text-ink"}>{value}</dd>
    </div>
  );
}

export function Summary({ v, service, pkg, extras, price, busy, onSubmit }) {
  const email = INTEGRATIONS.newBookingEmail; // INTEGRATION(newBookingEmail)
  const paid = v.payMode !== "NONE";
  // Add-ons like "Extra 30 minutes" lengthen the session (the server does the same sum).
  const addedMinutes = extras.reduce((sum, e) => sum + (e.minutes ?? 0) * v.extraQty[e.id], 0);
  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="border border-line p-5">
        <h2 className="caps text-ink-muted">Summary</h2>
        <p className="mt-3 text-[1.25rem] leading-tight text-ink">
          {v.clientMode === "existing" && v.client ? v.client.displayName : v.displayName || v.firstName || "New client"}
        </p>
        <p className="mt-1 text-small text-ink-muted">
          {[service?.name, pkg?.name, v.date && v.time && formatDate(`${v.date}T${v.time}`, "ccc, LLL d · h:mm a")]
            .filter(Boolean)
            .join(" · ") || "Nothing chosen yet"}
        </p>

        <dl className="mt-4 divide-y divide-line border-y border-line">
          <Line label={pkg?.name ?? "Package"} value={pkg ? money(price.packageCents) : "—"} />
          {extras.map((e) => (
            <Line key={e.id} label={`${e.name} × ${v.extraQty[e.id]}`} value={money(e.priceCents * v.extraQty[e.id])} />
          ))}
          {addedMinutes > 0 && <Line label="Session length" value={durationLabel(pkg.durationMinutes + addedMinutes)} />}
          {price.travelCents > 0 && <Line label="Travel" value={money(price.travelCents)} />}
          {price.adjustmentCents !== 0 && <Line label="Adjustment" value={money(price.adjustmentCents)} />}
        </dl>
        <dl className="mt-1">
          <Line label="Total" value={money(price.totalCents)} strong />
          <Line label="Deposit (50%)" value={money(price.depositCents)} />
        </dl>

        <p className="mt-3 text-small text-ink-muted">
          {paid
            ? "Starts as Confirmed."
            : "Starts as Awaiting deposit — the client has 48 hours to pay it."}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4" title={email.pendingNote}>
          <span className="text-small text-ink-muted">{email.label}</span>
          <Switch checked={false} disabled aria-label={email.label} />
        </div>
        {!email.ready && <p className="mt-1 text-small text-ink-muted">{email.pendingNote}</p>}

        <ActionButton solid className="mt-5 w-full" disabled={busy} onClick={onSubmit}>
          {busy ? "Creating…" : "Create booking"}
        </ActionButton>
      </div>
    </aside>
  );
}

Line.propTypes = { label: PropTypes.string, value: PropTypes.node, strong: PropTypes.bool };
Summary.propTypes = {
  v: PropTypes.object,
  service: PropTypes.object,
  pkg: PropTypes.object,
  extras: PropTypes.array,
  price: PropTypes.object,
  busy: PropTypes.bool,
  onSubmit: PropTypes.func,
};
