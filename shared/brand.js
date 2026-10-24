// The logo — ONE place to change it for the landing, the client portal (and /login) and the admin.
// Paths are relative to this folder (shared/). To swap the logo: drop the new files in shared/brand/
// and edit the two paths below; every page picks them up on the next build. Transparent PNGs,
// about 3:1 wide, sized by height in each app.
// Tracked in git on purpose (unlike shared/site.js): it holds no private data, and CI builds work
// without the SITE_JS_B64 secret being re-encoded.

export const LOGO = {
  // Dark ink, for light backgrounds (the default theme and the landing).
  onLight: "brand/logo-on-light.png",
  // Light ink, for the dark theme of the portals.
  onDark: "brand/logo-on-dark.png",
};
