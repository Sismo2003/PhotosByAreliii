// Import Dependencies
import PropTypes from "prop-types";
import { useState } from "react";
import clsx from "clsx";
import { AdjustmentsHorizontalIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

// ----------------------------------------------------------------------

// Collapsible tools row of the table (filters + list/calendar switch). Closed it is a single slim
// line with a small toggle (and a count when filters are active); open it shows `children`.
// No rule of its own: the table's header line is the only separator. The open/closed choice is
// remembered per browser.

const DEFAULT_KEY = "pba-bookings-tools-open";

function readOpen(storageKey) {
  try {
    return localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

export function ToolsBar({ label, activeCount, children, storageKey = DEFAULT_KEY, id = "bookings-tools" }) {
  const [open, setOpen] = useState(() => readOpen(storageKey));

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {
      /* storage unavailable — the state just isn't remembered */
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={id}
        className="flex h-9 items-center gap-1.5 text-small text-ink-muted transition-colors hover:text-ink"
      >
        <AdjustmentsHorizontalIcon className="size-4" strokeWidth={1.5} />
        {label}
        {activeCount > 0 && (
          <span className="min-w-5 rounded-full bg-line px-1.5 text-center text-ink">
            {activeCount}
          </span>
        )}
        <ChevronDownIcon
          className={clsx("size-3.5 transition-transform", open && "rotate-180")}
          strokeWidth={1.5}
        />
      </button>
      <div
        id={id}
        inert={!open}
        className={clsx(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className={clsx("min-h-0", open ? "overflow-visible" : "overflow-hidden")}>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1 pb-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

ToolsBar.propTypes = {
  label: PropTypes.string,
  activeCount: PropTypes.number,
  children: PropTypes.node,
  storageKey: PropTypes.string,
  id: PropTypes.string,
};
