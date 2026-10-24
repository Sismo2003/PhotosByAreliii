import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import jsconfigPaths from "vite-jsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

// The client portal is served at photosbyareliii.com/client/. The API lives on the same origin
// under /api, so the httpOnly session cookie travels without CORS.
// Dev only: /login (the shared sign-in page) is outside the `base`, so serve the app's index.html
// for it. In production the edge nginx does the same (deploy/nginx/photosbyareliii.conf).
const loginOutsideBase = {
  name: "login-outside-base",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === "/login" || req.url.startsWith("/login?") || req.url === "/") req.url = "/client/";
      next();
    });
  },
};

export default defineConfig({
  base: "/client/",
  plugins: [loginOutsideBase, react(), jsconfigPaths(), tailwindcss()],
  // Code shared with the landing and the admin (repo-root shared/), e.g. `@shared/site`.
  resolve: { alias: { "@shared": fileURLToPath(new URL("../shared", import.meta.url)) } },
  server: {
    port: 5175,
    fs: { allow: [".", "../shared"] },
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY || "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  preview: { port: 5175 },
});
