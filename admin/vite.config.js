import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import jsconfigPaths from "vite-jsconfig-paths";
import svgr from "vite-plugin-svgr";
import tailwindcss from "@tailwindcss/vite";

// The admin is served at photosbyareliii.com/admin/ (nginx also redirects
// admin.photosbyareliii.com there). The API lives on the same origin under /api.
export default defineConfig({
  base: "/admin/",
  plugins: [react(), jsconfigPaths(), svgr(), tailwindcss()],
  server: {
    port: 5174,
    // The logo lives in the repo-root shared/ (shared/brand.js), common to every app.
    fs: { allow: [".", "../shared"] },
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY || "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  preview: { port: 5174 },
});
