# Studio admin (React + Vite) — built once, served as static files by nginx.
# The edge nginx (deploy/nginx) proxies photosbyareliii.com/admin/ to this container.
# Build context is the repo root (CI) so ../shared (the logo) is available;
# admin/Dockerfile.dockerignore keeps everything else out.

FROM node:22-alpine AS build
WORKDIR /repo/admin
COPY admin/package.json admin/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY shared /repo/shared
COPY admin/ .
ARG VITE_SITE_URL=https://photosbyareliii.com
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/admin/dist /usr/share/nginx/html/admin
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/admin/ >/dev/null || exit 1
