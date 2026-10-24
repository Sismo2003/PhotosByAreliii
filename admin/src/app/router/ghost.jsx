// Import Dependencies
import { useEffect } from "react";

// Local Imports
import { SplashScreen } from "components/template/SplashScreen";
import { LOGIN_URL } from "constants/app.constant";

// ----------------------------------------------------------------------

// /admin/login is now the shared /login page (client/ app). nginx already redirects it in
// production; this covers development and old bookmarks, keeping ?redirect=….
function ToSharedLogin() {
  useEffect(() => {
    window.location.replace(`${LOGIN_URL}${window.location.search}`);
  }, []);
  return <SplashScreen />;
}

const ghostRoutes = { path: "login", element: <ToSharedLogin /> };

export { ghostRoutes };
