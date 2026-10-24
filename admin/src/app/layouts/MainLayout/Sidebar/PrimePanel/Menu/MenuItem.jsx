// Import Dependencies
import PropTypes from "prop-types";
import { NavLink } from "react-router";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

// Local Imports
import { useBreakpointsContext } from "app/contexts/breakpoint/context";
import { useSidebarContext } from "app/contexts/sidebar/context";

// ----------------------------------------------------------------------

export function MenuItem({ data }) {
  const { t } = useTranslation();
  const { lgAndDown } = useBreakpointsContext();
  const { close } = useSidebarContext();

  return (
    <NavLink
      to={data.path}
      onClick={() => lgAndDown && close()}
      className={({ isActive }) =>
        clsx(
          "caps flex min-h-11 items-center outline-hidden focus-visible:outline-2 focus-visible:outline-ink",
          isActive ? "text-ink" : "text-ink-muted hover:text-ink",
        )
      }
    >
      {t(data.transKey)}
    </NavLink>
  );
}

MenuItem.propTypes = {
  data: PropTypes.object,
};
