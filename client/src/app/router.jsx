import { createBrowserRouter, Navigate } from "react-router";

import { RequireClient } from "app/guards";
import AppShell from "app/layout/AppShell";
import { SplashScreen } from "app/layout/SplashScreen";
import NotFound from "app/pages/NotFound";

const page = (load) => async () => ({ Component: (await load()).default });

// No basename: this app owns two places on the site.
//   /login     — the ONE sign-in page for admins and clients (nginx sends /admin/login and
//                /client/login here). After signing in, the role decides: /admin/ or /client/.
//   /client/*  — the client portal.
// Assets are served from /client/assets (vite `base`).
const router = createBrowserRouter([
  {
    hydrateFallbackElement: <SplashScreen />,
    children: [
      { path: "/login", lazy: page(() => import("app/pages/auth/SignIn")) },
      { path: "/client/login", element: <Navigate to="/login" replace /> },
      {
        path: "/client/welcome",
        element: <RequireClient allowMustChange />,
        children: [{ index: true, lazy: page(() => import("app/pages/auth/ChoosePassword")) }],
      },
      {
        path: "/client",
        element: <RequireClient />,
        children: [
          {
            Component: AppShell,
            children: [
              { index: true, lazy: page(() => import("app/pages/galleries")) },
              { path: "galleries/:slug", lazy: page(() => import("app/pages/gallery")) },
              { path: "bookings", lazy: page(() => import("app/pages/bookings")) },
              { path: "payments", lazy: page(() => import("app/pages/payments")) },
              { path: "profile", lazy: page(() => import("app/pages/profile")) },
              { path: "*", element: <NotFound /> },
            ],
          },
        ],
      },
      { path: "/", element: <Navigate to="/client" replace /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;
