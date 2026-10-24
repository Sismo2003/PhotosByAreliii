# Studio admin (React + Vite) — built once, served as static files by nginx.
# The edge nginx (deploy/nginx) proxies photosbyareliii.com/admin/ to this container.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_SITE_URL=https://photosbyareliii.com
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html/admin
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/admin/ >/dev/null || exit 1
