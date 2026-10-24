# Express API. Build context is the REPO ROOT (deploy/docker-compose.yml, CI): the API imports the
# generated Prisma client (database/generated) and ../shared/site.js. Backend/Dockerfile.dockerignore
# limits what is sent.
#
# node:24 on purpose: the Prisma 7 client is generated as TypeScript and Node 24 runs it by
# stripping the types. -slim (glibc), not -alpine: onnxruntime-node (face focus), sharp and argon2
# ship glibc binaries.

FROM node:24-bookworm-slim AS build
WORKDIR /repo
# openssl: Prisma's engines. perl: exiftool-vendored (photo copyright metadata).
RUN apt-get update && apt-get install -y --no-install-recommends openssl perl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY Backend/package.json Backend/
COPY database/package.json database/
COPY Frontend/package.json Frontend/
RUN npm ci --no-audit --no-fund --workspace=Backend --workspace=database
COPY database database
COPY shared shared
COPY Backend Backend
# `generate` needs no database, but prisma.config.ts reads DATABASE_URL, so give it a dummy one.
RUN cd database && DATABASE_URL="mysql://build:build@localhost:3306/build" npx prisma generate

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl perl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /repo /repo
USER node
WORKDIR /repo/Backend
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD wget -qO- http://127.0.0.1:4000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
