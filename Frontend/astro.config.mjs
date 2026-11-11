import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Static site served at the root of the domain. PUBLIC_SITE_URL is baked at build time (it feeds
// canonical URLs, hreflang and the sitemap), so changing the domain means rebuilding this image.
const site = process.env.PUBLIC_SITE_URL || "http://localhost:4321";

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "always",
  build: { format: "directory" },
  // English at /, Spanish at /es/ (src/i18n). Pages under src/pages/es/ re-use the same components.
  i18n: { defaultLocale: "en", locales: ["en", "es"], routing: { prefixDefaultLocale: false } },
  // No UI framework on purpose: the few interactive bits are small bundled scripts (no React runtime, and
  // no inline hydration scripts, so the strict Content-Security-Policy in nginx.conf holds).
  integrations: [
    sitemap({
      i18n: { defaultLocale: "en", locales: { en: "en-US", es: "es-US" } },
      filter: (page) => !/\/404\/?$/.test(page),
    }),
  ],
  image: { responsiveStyles: false },
  vite: {
    plugins: [tailwindcss()],
    // Business data shared with the portal and the API (repo-root shared/), e.g. `@shared/site`.
    resolve: { alias: { "@shared": fileURLToPath(new URL("../shared", import.meta.url)) } },
    // Processed <script>s always become /_astro/*.js files, never inline (CSP: script-src 'self').
    build: { assetsInlineLimit: 0 },
    server: {
      fs: { allow: [".", "../shared"] },
      // `npm run dev`: the header asks the API who is signed in (same origin in production).
      proxy: { "/api": process.env.API_ORIGIN || "http://localhost:4000" },
    },
  },
});
