// Admin navigation — same order and labels as the sidebar in the Claude Design canvas
// (AdminBookings.dc.html), plus Mail (docs/correos.md §9).
//
// Used by both layouts:
//   - Sideblock (the design): top level only, text links.
//   - MainLayout (template, dev preview): icon rail + panel; items with `childs` open the panel.
// `badge` names a key in the sidebar counters returned by GET /api/admin/summary.

import {
  CalendarDaysIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  HomeIcon,
  PhotoIcon,
  TagIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

import { NAV_TYPE_ITEM, NAV_TYPE_ROOT } from "constants/app.constant";

export const navigation = [
  { id: "overview", type: NAV_TYPE_ITEM, path: "/", transKey: "nav.overview", Icon: HomeIcon, end: true },
  { id: "bookings", type: NAV_TYPE_ITEM, path: "/bookings", transKey: "nav.bookings", Icon: CalendarDaysIcon, badge: "requests" },
  { id: "clients", type: NAV_TYPE_ITEM, path: "/clients", transKey: "nav.clients", Icon: UsersIcon },
  { id: "galleries", type: NAV_TYPE_ITEM, path: "/galleries", transKey: "nav.galleries", Icon: PhotoIcon },
  { id: "services", type: NAV_TYPE_ITEM, path: "/services", transKey: "nav.services", Icon: TagIcon },
  { id: "mail", type: NAV_TYPE_ITEM, path: "/mail", transKey: "nav.mail", Icon: EnvelopeIcon, badge: "unreadMail" },
  {
    id: "settings",
    type: NAV_TYPE_ROOT,
    path: "/settings",
    transKey: "nav.settings",
    Icon: Cog6ToothIcon,
    childs: [
      { id: "settings-studio", type: NAV_TYPE_ITEM, path: "/settings/studio", transKey: "nav.settingsStudio" },
      { id: "settings-email", type: NAV_TYPE_ITEM, path: "/settings/email", transKey: "nav.settingsEmail" },
      { id: "settings-templates", type: NAV_TYPE_ITEM, path: "/settings/email-templates", transKey: "nav.settingsTemplates" },
    ],
  },
];
