// Small presentational pieces shared by the Bookings list and detail panel.
// Black/white design: hairlines (border-line), caps labels, no fills, square buttons.
import clsx from "clsx";
import PropTypes from "prop-types";

import { formatDate } from "utils/date";

import { TONE_DOT, TONE_TEXT } from "./labels";

/** Dot + caps label in the tone color ("● CONFIRMED", "○ DEPOSIT DUE $80"). */
export function ToneTag({ tone = "pending", children, className }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 text-tiny font-medium uppercase tracking-[0.12em]",
        TONE_TEXT[tone] ?? TONE_TEXT.pending,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={clsx("size-[7px] shrink-0 rounded-full border", TONE_DOT[tone] ?? TONE_DOT.pending)}
      />
      {children}
    </span>
  );
}

/** Square caps button, 44px tall. `solid` = ink fill (primary action), else hairline outline. */
export function ActionButton({ solid, danger, className, children, ...rest }) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex min-h-11 items-center justify-center border px-4 caps whitespace-nowrap transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        solid
          ? "border-ink bg-ink text-on-ink hover:bg-ink/85"
          : danger
            ? "border-alert bg-transparent text-alert hover:bg-alert/5"
            : "border-line-strong bg-transparent text-ink hover:border-ink",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Toggle-button group (payment method, keep/refund). */
export function ChoiceGroup({ label, options, value, onChange, disabled }) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <div role="group" aria-label={label} className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={clsx(
                "min-h-11 border px-4 text-small transition-colors disabled:opacity-40",
                on ? "border-ink bg-ink text-on-ink" : "border-line-strong bg-transparent text-ink hover:border-ink",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Section heading inside the detail panel. */
export function Section({ title, children, className }) {
  return (
    <section className={clsx("border-t border-line px-4 py-5 sm:px-6", className)}>
      {title && <h3 className="caps text-ink-muted">{title}</h3>}
      <div className={clsx(title && "mt-3", "text-small text-ink")}>{children}</div>
    </section>
  );
}

/** Key/value rows ("Total ··· $160"), stacked on phones, side by side from sm. */
export function KeyValueRows({ rows }) {
  return (
    <dl className="divide-y divide-line">
      {rows.filter(Boolean).map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-6">
          <dt className="shrink-0 text-ink-muted">{k}</dt>
          <dd className="min-w-0 break-words text-ink sm:text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** ActivityEvent list, newest first. */
export function History({ events }) {
  if (!events?.length) return <p className="text-ink-muted">No history yet.</p>;
  return (
    <ul className="space-y-2">
      {events.map((e) => (
        <li key={e.id} className="border-l border-line pl-3">
          <p className="text-ink">{e.message}</p>
          <p className="mt-0.5 text-tiny text-ink-muted">
            {formatDate(e.createdAt, "LLL d, yyyy · h:mm a")}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Inline alert line (late deposit, API error). */
export function AlertNote({ children, className }) {
  return (
    <div role="alert" className={clsx("border-l-2 border-alert pl-3 text-small text-alert", className)}>
      {children}
    </div>
  );
}

ToneTag.propTypes = { tone: PropTypes.string, children: PropTypes.node, className: PropTypes.string };
ActionButton.propTypes = {
  solid: PropTypes.bool,
  danger: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};
ChoiceGroup.propTypes = {
  label: PropTypes.string,
  options: PropTypes.array,
  value: PropTypes.string,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
};
Section.propTypes = { title: PropTypes.string, children: PropTypes.node, className: PropTypes.string };
KeyValueRows.propTypes = { rows: PropTypes.array };
History.propTypes = { events: PropTypes.array };
AlertNote.propTypes = { children: PropTypes.node, className: PropTypes.string };
