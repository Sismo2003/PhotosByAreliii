import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Static site served at the root of the domain. PUBLIC_SITE_URL is baked at build time (it feeds
// canonical URLs and the sitemap), so changing the domain means rebuilding this image.
const site = process.env.PUBLIC_SITE_URL || "http://localhost:4321";

export default defineConfig({
  site,
  output: "static",
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    // Business data shared with the portal and the API (repo-root shared/), e.g. `@shared/site`.
    resolve: { alias: { "@shared": fileURLToPath(new URL("../shared", import.meta.url)) } },
    server: { fs: { allow: [".", "../shared"] } },
  },
});
