#!/bin/sh
set -e

if [ "$1" = "studio" ]; then
  npx prisma generate
  npx prisma migrate deploy
  socat TCP-LISTEN:5555,fork,reuseaddr TCP:127.0.0.1:5556 &
  echo "Prisma Studio → http://localhost:${STUDIO_PORT:-5555} (the 5556 below is internal)"
  exec npx prisma studio --port 5556 --browser none
fi

exec "$@"
