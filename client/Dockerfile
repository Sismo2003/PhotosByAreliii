# Client portal + shared sign-in page (React + Vite) — built once, served as static files by nginx.
# The edge nginx (deploy/nginx) proxies photosbyareliii.com/client/ and /login to this container.
# Build context is the repo root (deploy/docker-compose.yml) so ../shared is available;
# client/Dockerfile.dockerignore keeps everything else out.

FROM node:22-alpine AS build
WORKDIR /repo/client
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY shared /repo/shared
COPY client/ .
ARG VITE_SITE_URL=https://photosbyareliii.com
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/client/dist /usr/share/nginx/html/client
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/client/ >/dev/null || exit 1
