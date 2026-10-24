// Progress of the client's journey (Request → Deposit → Confirmed → Session → Follow-up → Done).
// Informative only (not clickable, so it doesn't compete with the Next step card). The line fills
// from the left when the page opens and again when the stage advances; the current step has a soft
// halo. Both animations respect prefers-reduced-motion. Phones get a compact "Step 3 of 6" bar.
import clsx from "clsx";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";

import { STEPS } from "./stage";

const LAST = STEPS.length - 1;

export function StageProgress({ stage }) {
  const { current, complete, alert, terminal } = stage;

  // Start at 0 and move to the real value after mount, so the CSS transition has something to animate.
  const target = terminal ? 0 : (current / LAST) * 100;
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setPct(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  if (terminal) return null; // Cancelled / declined / expired show a notice instead (StageNotice).

  const accent = alert ? "bg-alert" : "bg-ink";
  const label = STEPS[current].label;

  return (
    <nav aria-label="Booking progress">
      {/* Phones */}
      <div className="sm:hidden">
        <p className="text-small text-ink-muted">
          Step {current + 1} of {STEPS.length} · <span className="text-ink">{label}</span>
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line">
          <div
            className={clsx("h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none", accent)}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Tablet / desktop */}
      <div className="relative hidden sm:block">
        <div className="absolute top-[7px] right-[8.333%] left-[8.333%] h-0.5 rounded-full bg-line">
          <div
            className={clsx("h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none", accent)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <ol className="relative grid grid-cols-6">
          {STEPS.map((step, i) => {
            const done = i < current || (complete && i === current);
            const isCurrent = i === current && !complete;
            return (
              <li
                key={step.id}
                aria-current={isCurrent ? "step" : undefined}
                className="flex flex-col items-center gap-2"
              >
                <span className="relative flex size-4 items-center justify-center">
                  {isCurrent && (
                    <span
                      aria-hidden="true"
                      className={clsx("absolute inline-flex size-4 rounded-full opacity-30 motion-safe:animate-ping", accent)}
                    />
                  )}
                  <span
                    className={clsx(
                      "relative flex size-4 items-center justify-center rounded-full border-2 transition-colors duration-500",
                      done && "border-ink bg-ink text-on-ink",
                      isCurrent && (alert ? "border-alert bg-alert" : "border-ink bg-paper"),
                      !done && !isCurrent && "border-line-strong bg-paper",
                    )}
                  >
                    {done && (
                      <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M2.5 6.5l2.2 2.2L9.5 3.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </span>
                <span
                  className={clsx(
                    "text-small",
                    isCurrent ? "font-medium text-ink" : done ? "text-ink-muted" : "text-ink-muted/70",
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

StageProgress.propTypes = {
  stage: PropTypes.shape({
    current: PropTypes.number,
    complete: PropTypes.bool,
    alert: PropTypes.bool,
    terminal: PropTypes.string,
  }).isRequired,
};
