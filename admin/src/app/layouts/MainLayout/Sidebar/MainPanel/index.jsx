// Import Dependencies
import PropTypes from "prop-types";
import { Link } from "react-router";
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";

// Local Imports
import { useAuthContext } from "app/contexts/auth/context";
import { Menu } from "./Menu";
import { Item } from "./Menu/Item";

// ----------------------------------------------------------------------

export function MainPanel({ nav, setActiveSegment, activeSegment }) {
  const { logout } = useAuthContext();

  return (
    <div className="main-panel">
      <div className="flex h-full w-full flex-col items-center border-r border-line bg-paper-alt">
        <div className="flex pt-5">
          <Link
            to="/"
            aria-label="Photos by Areliii — overview"
            className="flex size-11 items-center justify-center border border-ink text-[0.8125rem] font-medium tracking-[0.12em] text-ink"
          >
            PA
          </Link>
        </div>

        <Menu nav={nav} activeSegment={activeSegment} setActiveSegment={setActiveSegment} />

        <div className="flex flex-col items-center space-y-2 py-3">
          <Item id="logout" title="Log out" onClick={logout} Icon={ArrowRightStartOnRectangleIcon} />
        </div>
      </div>
    </div>
  );
}

MainPanel.propTypes = {
  nav: PropTypes.array,
  setActiveSegment: PropTypes.func,
  activeSegment: PropTypes.string,
};
