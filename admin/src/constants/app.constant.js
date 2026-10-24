export const APP_NAME = "Photos by Areliii";
export const APP_KEY = "pba-admin";

// Redirect Paths (relative to the router basename, /admin)
export const REDIRECT_URL_KEY = "redirect";
export const HOME_PATH = "/";

// The ONE sign-in page for admins and clients: photosbyareliii.com/login, served by the client/
// app (docs/portal-cliente-plan.md §2). In development it runs on its own port (.env.development).
export const LOGIN_URL = `${import.meta.env.VITE_LOGIN_ORIGIN || ""}/login`;

// Public site, for "Back to site"
export const SITE_URL = import.meta.env.VITE_SITE_URL || "/";

// Support contact (docs/almacenamiento-fotos.md §6)
export const SUPPORT_EMAIL = "soporte@nimbuscloud.mx";

// Navigation Types
export const NAV_TYPE_ROOT = "root";
export const NAV_TYPE_GROUP = "group";
export const NAV_TYPE_COLLAPSE = "collapse";
export const NAV_TYPE_ITEM = "item";
export const NAV_TYPE_DIVIDER = "divider";

export const COLORS = ["neutral", "primary", "secondary", "info", "success", "warning", "error"];
