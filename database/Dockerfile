# Dev-only image for the Prisma CLI (migrate, generate, Studio). See docker-compose.yml.
FROM node:24-bookworm-slim

# openssl: Prisma's schema engine. socat: Studio only listens on 127.0.0.1, so it gets
# forwarded to 0.0.0.0 for the published port.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl socat \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["studio"]
