// Layout pieces of the booking page that follow the Sections setting (Hairlines | Shadow).
import clsx from "clsx";
import PropTypes from "prop-types";

import { useSectionSkin } from "components/shared/layout/useSectionSkin";

const SHADOW = "rounded-xl bg-paper shadow-soft dark:shadow-none dark:ring-1 dark:ring-line";

/**
 * Information block: hairline rule under the title, or a soft card with Shadow. `boxed` frames
 * it in Hairlines too (side columns, where blocks need a clear edge each).
 */
export function Block({ title, children, className, boxed }) {
  const { isShadow } = useSectionSkin();
  return (
    <section
      className={clsx(
        isShadow ? [SHADOW, "p-5", boxed && "ring-1 ring-line-strong/50 dark:ring-line-strong"] : boxed && "border border-line-strong p-5",
        className,
      )}
    >
      {title && (
        <h2 className={clsx("caps text-ink-muted", !isShadow && "border-b border-line pb-2")}>{title}</h2>
      )}
      <div className={clsx(title && "mt-3", "text-small text-ink")}>{children}</div>
    </section>
  );
}

/** Boxed block for the Next step card (always framed; border or soft shadow). */
export function Card({ children, className, ...rest }) {
  const { isShadow } = useSectionSkin();
  return (
    <section className={clsx("p-5 sm:p-6", isShadow ? SHADOW : "border border-line", className)} {...rest}>
      {children}
    </section>
  );
}

Block.propTypes = { title: PropTypes.string, children: PropTypes.node, className: PropTypes.string, boxed: PropTypes.bool };
Card.propTypes = { children: PropTypes.node, className: PropTypes.string };
