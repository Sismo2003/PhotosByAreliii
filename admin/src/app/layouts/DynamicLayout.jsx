// Import Dependencies
import { lazy, useMemo } from "react";

// Local Imports
import { useThemeContext } from "app/contexts/theme/context";
import { Loadable } from "components/shared/Loadable";
import { SplashScreen } from "components/template/SplashScreen";

// ----------------------------------------------------------------------

const themeLayouts = {
  sideblock: lazy(() => import("./Sideblock")), // the approved design (default)
  "main-layout": lazy(() => import("./MainLayout")), // template icon rail + panel
};

export function DynamicLayout() {
  const { themeLayout } = useThemeContext();

  const CurrentLayout = useMemo(
    () => Loadable(themeLayouts[themeLayout] ?? themeLayouts.sideblock, SplashScreen),
    [themeLayout],
  );

  return <CurrentLayout />;
}
