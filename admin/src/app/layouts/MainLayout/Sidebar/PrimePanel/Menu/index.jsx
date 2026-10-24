// Import Dependencies
import PropTypes from "prop-types";

// Local Imports
import { MenuItem } from "./MenuItem";

// ----------------------------------------------------------------------

export function Menu({ nav }) {
  return (
    <nav className="flex grow flex-col overflow-y-auto px-5 pt-3">
      {nav.map((item) => (
        <MenuItem key={item.path} data={item} />
      ))}
    </nav>
  );
}

Menu.propTypes = {
  nav: PropTypes.array,
};
