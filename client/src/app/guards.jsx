import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";

import { useAuth } from "app/auth";
import { ADMIN_HOME, LOGIN_PATH, REDIRECT_URL_KEY } from "constants/app.constant";
import { SplashScreen } from "app/layout/SplashScreen";

// Another app (the admin) is a full page load, not a router navigation.
export function GoTo({ href }) {
  useEffect(() => window.location.replace(href), [href]);
  return <SplashScreen />;
}

/** Signed-in clients only. Admins go to the admin; guests to the shared sign-in page. */
export function RequireClient({ allowMustChange = false }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") return <SplashScreen />;
  if (!user) {
    const back = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${LOGIN_PATH}?${REDIRECT_URL_KEY}=${back}`} replace />;
  }
  // INTEGRATION(preview-as-client): an admin with ?preview=<clientId> stays here, read only
  // (docs/portal-cliente-plan.md §5). Until then the admin is sent to the admin.
  if (user.role === "ADMIN") return <GoTo href={ADMIN_HOME} />;
  if (user.mustChangePassword && !allowMustChange) return <Navigate to="/client/welcome" replace />;
  if (!user.mustChangePassword && allowMustChange) return <Navigate to="/client" replace />;

  return <Outlet />;
}
