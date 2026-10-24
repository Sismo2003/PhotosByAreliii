// Import Dependencies
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

// Local Imports
import { NAV_TYPE_ITEM } from "constants/app.constant";
import { ScrollShadow } from "components/ui";
import { useSidebarContext } from "app/contexts/sidebar/context";
import { Item } from "./Item";

// ----------------------------------------------------------------------

export function Menu({ nav, setActiveSegment, activeSegment }) {
  const { t } = useTranslation();
  const { isExpanded, open } = useSidebarContext();

  const handleSegmentSelect = (path) => {
    setActiveSegment(path);
    if (!isExpanded) open();
  };

  return (
    <ScrollShadow
      data-root-menu
      className="hide-scrollbar flex w-full grow flex-col items-center space-y-2 overflow-y-auto pt-6"
    >
      {nav.map(({ id, Icon, path, type, transKey }) => {
        const isLink = type === NAV_TYPE_ITEM;
        return (
          <Item
            key={path}
            id={id}
            Icon={Icon}
            title={t(transKey)}
            isActive={path === activeSegment}
            component={isLink ? Link : "button"}
            {...(isLink ? { to: path } : { onClick: () => handleSegmentSelect(path) })}
          />
        );
      })}
    </ScrollShadow>
  );
}

Menu.propTypes = {
  nav: PropTypes.array,
  activeSegment: PropTypes.string,
  setActiveSegment: PropTypes.func,
};
