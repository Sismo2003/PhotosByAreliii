// Import Dependencies
import { useEffect } from "react";
import { useLocation, useOutlet } from "react-router";

// Local Imports
import { useAuthContext } from "app/contexts/auth/context";
import { SplashScreen } from "components/template/SplashScreen";
import { LOGIN_URL, REDIRECT_URL_KEY } from "constants/app.constant";

// ----------------------------------------------------------------------

// No session → the shared sign-in page (/login, served by the client/ app), which comes back here
// to the same page after signing in.
export default function AuthGuard() {
  const outlet = useOutlet();
  const { isAuthenticated, sessionEnded } = useAuthContext();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) return;
    const back = encodeURIComponent(`/admin${location.pathname}${location.search}`);
    window.location.replace(`${LOGIN_URL}?${REDIRECT_URL_KEY}=${back}${sessionEnded ? "&expired=1" : ""}`);
  }, [isAuthenticated, sessionEnded, location.pathname, location.search]);

  if (!isAuthenticated) return <SplashScreen />;

  return <>{outlet}</>;
}
