// Import Dependencies
import { Navigate } from "react-router";

// Local Imports
import { DynamicLayout } from "app/layouts/DynamicLayout";
import AuthGuard from "middleware/AuthGuard";

import { BookingRedirect } from "./BookingRedirect";

// ----------------------------------------------------------------------

const page = (load) => async () => ({ Component: (await load()).default });

const protectedRoutes = {
  id: "protected",
  Component: AuthGuard,
  children: [
    {
      Component: DynamicLayout,
      children: [
        { index: true, lazy: page(() => import("app/pages/overview")) },
        { path: "bookings", lazy: page(() => import("app/pages/bookings")) },
        { path: "bookings/new", lazy: page(() => import("app/pages/bookings/new")) },
        { path: "bookings/:id", lazy: page(() => import("app/pages/bookings/booking")) },
        { path: "bookings/requests/:id", element: <BookingRedirect /> },
        { path: "bookings/upcoming/:id", element: <BookingRedirect /> },
        { path: "clients", lazy: page(() => import("app/pages/clients")) },
        { path: "clients/new", lazy: page(() => import("app/pages/clients/new")) },
        { path: "clients/:id", lazy: page(() => import("app/pages/clients/client")) },
        { path: "galleries", lazy: page(() => import("app/pages/galleries")) },
        { path: "galleries/new", lazy: page(() => import("app/pages/galleries/new")) },
        { path: "galleries/:id", lazy: page(() => import("app/pages/galleries/gallery")) },
        { path: "services", lazy: page(() => import("app/pages/services")) },
        { path: "services/new", lazy: page(() => import("app/pages/services/new")) },
        { path: "services/:id", lazy: page(() => import("app/pages/services/service")) },
        { path: "mail", lazy: page(() => import("app/pages/mail")) },
        {
          path: "settings",
          lazy: page(() => import("app/pages/settings/Layout")),
          children: [
            { index: true, element: <Navigate to="/settings/studio" replace /> },
            { path: "studio", lazy: page(() => import("app/pages/settings/Studio")) },
            { path: "email", lazy: page(() => import("app/pages/settings/Email")) },
            {
              path: "email-templates",
              lazy: page(() => import("app/pages/settings/EmailTemplates")),
            },
          ],
        },
      ],
    },
  ],
};

export { protectedRoutes };
