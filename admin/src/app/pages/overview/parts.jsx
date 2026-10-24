// Pieces shared by the Overview widgets: the widget frame, the error line and the chart tooltip.
import { Link } from "react-router";
import clsx from "clsx";
import PropTypes from "prop-types";

import { Section } from "components/shared/layout/Section";

/** 28px heading + optional caps link on the right (AdminDashboard.dc.html), inside a Section. */
export function Widget({ title, link, linkLabel, aside, className, children }) {
  return (
    <Section as="section" className={clsx("py-5", className)}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 className="text-title text-ink">{title}</h2>
        {aside}
        {link && (
          <Link
            to={link}
            className="caps border-b border-ink pb-[3px] text-ink transition-colors hover:border-ink-muted hover:text-ink-muted"
          >
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </Section>
  );
}

Widget.propTypes = {
  title: PropTypes.node.isRequired,
  link: PropTypes.string,
  linkLabel: PropTypes.string,
  aside: PropTypes.node,
  className: PropTypes.string,
  children: PropTypes.node,
};

/** Small error line with a retry — a widget that failed never blanks the others. */
export function WidgetError({ message, onRetry }) {
  return (
    <p className="text-small text-alert">
      {message}{" "}
      <button type="button" onClick={() => onRetry()} className="underline underline-offset-2">
        Try again
      </button>
    </p>
  );
}

WidgetError.propTypes = { message: PropTypes.string, onRetry: PropTypes.func.isRequired };

/** Chart tooltip: paper card on a hairline, positioned by the caller (absolute). */
export function ChartTooltip({ style, children }) {
  return (
    <div
      role="status"
      style={style}
      className="pointer-events-none absolute z-10 min-w-40 rounded-md border border-line bg-paper px-3 py-2 text-small text-ink shadow-soft"
    >
      {children}
    </div>
  );
}

ChartTooltip.propTypes = { style: PropTypes.object, children: PropTypes.node };

/** Square color key used in legends and tooltips. */
export function Swatch({ color, className }) {
  return (
    <span
      aria-hidden="true"
      className={clsx("inline-block size-2.5 shrink-0 rounded-[2px] ring-1 ring-line", className)}
      style={{ background: color }}
    />
  );
}

Swatch.propTypes = { color: PropTypes.string.isRequired, className: PropTypes.string };
