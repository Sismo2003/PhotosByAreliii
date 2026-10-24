export const APP_NAME = "Photos by Areliii";

// One sign-in page for everybody (docs/portal-cliente-plan.md §2): photosbyareliii.com/login.
// After signing in, the role the API returns decides where they go: ADMIN → /admin/, CLIENT → /client/.
// In development the admin runs on another port, so its origin comes from .env.development.
export const LOGIN_PATH = "/login";
export const CLIENT_HOME = "/client";
export const ADMIN_ORIGIN = import.meta.env.VITE_ADMIN_ORIGIN || "";
export const ADMIN_HOME = `${ADMIN_ORIGIN}/admin/`;
export const REDIRECT_URL_KEY = "redirect";

export const SITE_URL = import.meta.env.VITE_SITE_URL || "/";

// Needed by the Button component (same list as the admin).
export const COLORS = ["neutral", "primary", "secondary", "info", "success", "warning", "error"];

export const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "es", label: "Español", short: "ES" },
];
