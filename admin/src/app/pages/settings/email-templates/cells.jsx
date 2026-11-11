// Cells of the email templates table and the phone card. One row = one email of the catalog
// (docs/correos.md §2): what it is and when it goes, how it is triggered, whether Areli changed its
// text (per language) and its on/off switch.
import clsx from "clsx";
import PropTypes from "prop-types";

import { statusLabel, triggerLabel } from "../email/labels";
import { StatusDot, TemplateSwitch } from "../email/parts";

export function EmailCell({ row }) {
  const t = row.original;
  return (
    <div className="min-w-0 max-w-md">
      <p className="text-body text-ink">
        {t.name}
        {!t.wired && <span className="ml-2 caps text-ink-muted">· Not in use yet</span>}
      </p>
      <p className="mt-0.5 text-small text-ink-muted">{t.when}</p>
    </div>
  );
}

export function TriggerCell({ row }) {
  return <span className="text-small whitespace-nowrap text-ink">{triggerLabel(row.original.trigger)}</span>;
}

/** "EN Edited · ES Original" — only what differs from the original is worth a second look. */
export function LanguagesCell({ row }) {
  const { locales } = row.original;
  return (
    <ul className="space-y-0.5 text-small">
      {Object.entries(locales).map(([locale, l]) => {
        const s = statusLabel(l.status);
        return (
          <li key={locale} className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="w-5 caps text-ink-muted">{locale}</span>
            <span className={s.className}>{s.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function SwitchCell({ row }) {
  return <TemplateSwitch entry={row.original} size="sm" />;
}

/** Phone: one stacked card per email. */
export function TemplateCard({ booking: t }) {
  const edited = Object.entries(t.locales).filter(([, l]) => l.status !== "default");
  return (
    <div className="flex w-full items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="caps text-ink-muted">{triggerLabel(t.trigger)}</p>
        <p className="mt-1 text-body text-ink">{t.name}</p>
        <p className="mt-0.5 text-small text-ink-muted">{t.when}</p>
        {edited.length > 0 && (
          <p className="mt-1 flex items-center gap-2 text-small text-ink">
            <StatusDot state="on" className={clsx("size-2", edited.some(([, l]) => l.status === "draft") && "border-warning bg-warning")} />
            {edited.map(([locale, l]) => `${locale.toUpperCase()} ${statusLabel(l.status).label.toLowerCase()}`).join(" · ")}
          </p>
        )}
      </div>
      <TemplateSwitch entry={t} size="sm" />
    </div>
  );
}

const rowProp = { row: PropTypes.shape({ original: PropTypes.object }) };
EmailCell.propTypes = rowProp;
TriggerCell.propTypes = rowProp;
LanguagesCell.propTypes = rowProp;
SwitchCell.propTypes = rowProp;
TemplateCard.propTypes = { booking: PropTypes.object };
