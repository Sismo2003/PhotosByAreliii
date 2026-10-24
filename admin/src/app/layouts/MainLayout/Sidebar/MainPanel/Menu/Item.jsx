// Import Dependencies
import PropTypes from "prop-types";
import clsx from "clsx";

// Local Imports
import { useBreakpointsContext } from "app/contexts/breakpoint/context";
import { createScopedKeydownHandler } from "utils/dom/createScopedKeydownHandler";

// ----------------------------------------------------------------------

export function Item({ id, title, isActive, Icon, component, onKeyDown, ...rest }) {
  const Element = component || "button";
  const { lgAndUp } = useBreakpointsContext();

  return (
    <Element
      data-root-menu-item
      data-nav-id={id}
      aria-label={title}
      aria-current={isActive ? "page" : undefined}
      {...{
        "data-tooltip": lgAndUp ? true : undefined,
        "data-tooltip-content": title,
        "data-tooltip-place": "right",
      }}
      className={clsx(
        "relative flex size-11 shrink-0 cursor-pointer items-center justify-center outline-hidden transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ink",
        isActive ? "bg-ink text-on-ink" : "text-ink-muted hover:bg-line hover:text-ink",
      )}
      onKeyDown={createScopedKeydownHandler({
        siblingSelector: "[data-root-menu-item]",
        parentSelector: "[data-root-menu]",
        activateOnFocus: false,
        loop: true,
        orientation: "vertical",
        onKeyDown,
      })}
      {...rest}
    >
      {Icon && <Icon className="size-6 stroke-[1.25]" />}
    </Element>
  );
}

Item.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  isActive: PropTypes.bool,
  Icon: PropTypes.elementType.isRequired,
  component: PropTypes.elementType,
  onKeyDown: PropTypes.func,
};
