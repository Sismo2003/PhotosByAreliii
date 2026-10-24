# Public site (Astro, static) — built once, served by nginx.
# Build context is the REPO ROOT (deploy/docker-compose.yml, CI) so ../shared is available;
# Frontend/Dockerfile.dockerignore limits what is sent.

FROM node:22-alpine AS build
WORKDIR /repo
# Install from the root lockfile (workspaces) so the build is reproducible.
COPY package.json package-lock.json ./
COPY Frontend/package.json Frontend/
COPY Backend/package.json Backend/
COPY database/package.json database/
RUN npm ci --no-audit --no-fund --workspace=Frontend
COPY shared shared
COPY Frontend Frontend
WORKDIR /repo/Frontend
# Baked at build time: canonical URLs, sitemap, robots. Changing the domain = rebuild this image.
ARG PUBLIC_SITE_URL=https://areli.grid.nimbuscloud.mx
ARG PUBLIC_INDEXABLE=false
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL PUBLIC_INDEXABLE=$PUBLIC_INDEXABLE
RUN npm run build

FROM nginx:1.27-alpine
COPY Frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/Frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
