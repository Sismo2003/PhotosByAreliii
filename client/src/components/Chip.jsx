// Filter chip — one row of them scrolls sideways on phones (portal plan §1.3). Galleries, Bookings, Payments.
import clsx from "clsx";

export function Chip({ on, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={clsx(
        "caps min-h-9 shrink-0 border px-4 transition-colors",
        on ? "border-ink bg-ink text-on-ink" : "border-line text-ink-muted hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children }) {
  return <div className="hide-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">{children}</div>;
}
