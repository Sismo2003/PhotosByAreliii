// Import Dependencies
import clsx from "clsx";

// Local Imports
import { useSidebarContext } from "app/contexts/sidebar/context";

// ----------------------------------------------------------------------

export function SidebarToggleBtn() {
  const { toggle, isExpanded } = useSidebarContext();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isExpanded ? "Close menu" : "Open menu"}
      aria-expanded={isExpanded}
      className={clsx(
        isExpanded && "active",
        "sidebar-toggle-btn -ml-2 flex size-11 cursor-pointer flex-col items-start justify-center space-y-1.5 pl-2 text-ink outline-hidden focus-visible:outline-2 focus-visible:outline-ink",
      )}
    >
      <span />
      <span />
      <span />
    </button>
  );
}
