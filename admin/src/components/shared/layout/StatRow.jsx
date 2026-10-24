// Import Dependencies
import PropTypes from "prop-types";
import clsx from "clsx";

// Local Imports
import { Skeleton } from "components/ui";
import { useSectionSkin } from "./useSectionSkin";

// ----------------------------------------------------------------------

// Row of big numbers between hairlines (Bookings: "Requests to confirm", "Sessions this week"…).
// 4 across on desktop, 2×2 on tablet and phone. A null/undefined value renders a Skeleton
// (the number is still loading).

export function StatRow({ items, className }) {
  const { isShadow } = useSectionSkin();
  return (
    <dl
      className={clsx(
        "mt-5 grid grid-cols-2 md:grid-cols-4",
        isShadow
          ? "rounded-xl bg-paper px-6 shadow-soft dark:shadow-none dark:ring-1 dark:ring-line"
          : "border-y border-line",
        className,
      )}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          className={clsx(
            "py-[18px]",
            i % 2 === 1 && "border-l border-line pl-6",
            i >= 2 && "border-t border-line md:border-t-0",
            i === 2 && "md:border-l md:pl-6",
          )}
        >
          <dt className="caps text-ink-muted">{item.label}</dt>
          <dd className="mt-2 text-[2.5rem] leading-none text-ink">
            {item.value == null ? <Skeleton className="h-10 w-16 rounded" /> : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

StatRow.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({ label: PropTypes.string, value: PropTypes.node }),
  ).isRequired,
  className: PropTypes.string,
};
