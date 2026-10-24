// Import Dependencies
import { Outlet, ScrollRestoration } from "react-router";
import { lazy } from "react";

// Local Imports
import { useAuthContext } from "app/contexts/auth/context";
import { SplashScreen } from "components/template/SplashScreen";
import { Progress } from "components/template/Progress";
import { Loadable } from "components/shared/Loadable";

const Toaster = Loadable(lazy(() => import("components/template/Toaster")));
const Tooltip = Loadable(lazy(() => import("components/template/Tooltip")));
// Display settings (theme, layout, sections, notifications), opened by the spinning gear.
const Customizer = Loadable(lazy(() => import("components/template/Customizer")));

// ----------------------------------------------------------------------

function Root() {
  const { isInitialized, isAuthenticated } = useAuthContext();

  if (!isInitialized) {
    return <SplashScreen />;
  }

  return (
    <>
      <Progress />
      <ScrollRestoration />
      <Outlet />
      <Tooltip />
      <Toaster />
      {isAuthenticated && <Customizer />}
    </>
  );
}

export default Root;
