// Import Dependencies
import PropTypes from "prop-types";
import clsx from "clsx";

// Local Imports
import { useSectionSkin } from "./useSectionSkin";

// ----------------------------------------------------------------------

// A page section that follows the Customizer's "Sections" setting (theme.cardSkin):
//   - "bordered" (Hairlines): flat, separated by hairline rules — the design default.
//   - "shadow-sm" (Shadow): a soft raised card, no rules around it.
// Every admin screen must support both skins — wrap its sections in this component, or read
// `useSectionSkin()` when a piece (tabs, stat row…) needs its own variant.

export function Section({ as: Tag = "div", className, children, ...rest }) {
  const { isShadow } = useSectionSkin();
  return (
    <Tag
      className={clsx(
        isShadow &&
          "rounded-xl bg-paper px-4 shadow-soft sm:px-6 dark:shadow-none dark:ring-1 dark:ring-line",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

Section.propTypes = {
  as: PropTypes.elementType,
  className: PropTypes.string,
  children: PropTypes.node,
};
