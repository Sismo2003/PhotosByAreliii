// Import Dependencies
import { useMemo, useState } from "react";
import { useLocation } from "react-router";

// Local Imports
import { useBreakpointsContext } from "app/contexts/breakpoint/context";
import { useSidebarContext } from "app/contexts/sidebar/context";
import { navigation } from "app/navigation";
import { useDidUpdate } from "hooks";
import { isNavItemActive } from "utils/isRouteActive";
import { MainPanel } from "./MainPanel";
import { PrimePanel } from "./PrimePanel";

// ----------------------------------------------------------------------

const findSegment = (pathname) =>
  navigation.find((item) => isNavItemActive(item, pathname));

export function Sidebar() {
  const { pathname } = useLocation();
  const { name, lgAndDown } = useBreakpointsContext();
  const { isExpanded, close } = useSidebarContext();

  const [activeSegmentPath, setActiveSegmentPath] = useState(
    () => findSegment(pathname)?.path,
  );

  const currentSegment = useMemo(
    () => navigation.find((item) => item.path === activeSegmentPath),
    [activeSegmentPath],
  );

  useDidUpdate(() => {
    setActiveSegmentPath(findSegment(pathname)?.path);
  }, [pathname]);

  useDidUpdate(() => {
    if (lgAndDown && isExpanded) close();
  }, [name]);

  return (
    <>
      <MainPanel
        nav={navigation}
        activeSegment={activeSegmentPath}
        setActiveSegment={setActiveSegmentPath}
      />
      <PrimePanel close={close} currentSegment={currentSegment} />
    </>
  );
}
