// Import Dependencies
import { createBrowserRouter } from "react-router";

// Local Imports
import Root from "app/layouts/Root";
import RootErrorBoundary from "app/pages/errors/RootErrorBoundary";
import ErrorPage from "app/pages/errors/ErrorPage";
import { SplashScreen } from "components/template/SplashScreen";
import { protectedRoutes } from "./protected";
import { ghostRoutes } from "./ghost";

// ----------------------------------------------------------------------

const router = createBrowserRouter(
  [
    {
      id: "root",
      Component: Root,
      hydrateFallbackElement: <SplashScreen />,
      ErrorBoundary: RootErrorBoundary,
      children: [
        protectedRoutes,
        ghostRoutes,
        { path: "*", element: <ErrorPage status={404} /> },
      ],
    },
  ],
  // Served under /admin (vite `base`); nginx sends admin.photosbyareliii.com here too.
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" },
);

export default router;
