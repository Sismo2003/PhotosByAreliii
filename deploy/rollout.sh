#!/usr/bin/env bash
# =============================================================================
#  rollout.sh — deploys photosByArelli on the server (grid, or any Docker host)
# -----------------------------------------------------------------------------
#  CI calls it through deploy-trigger.sh:  rollout.sh sha-abc123def456
#  By hand:                                ./rollout.sh              (uses 'latest')
#  Rollback:                               ./rollout.sh sha-<previous commit>
#
#  Runs as root (via sudo, see server-setup.sh). Idempotent and fails early: if something
#  goes wrong it stops before touching more, and the previous stack keeps running.
#  Everything that depends on the server/domain comes from deploy/.env.
# =============================================================================
set -euo pipefail

TAG="${1:-latest}"

# Re-validated here even though the trigger already filtered it: this script runs as root and the
# value is interpolated into a `sed` and into image references below.
if ! [[ "$TAG" =~ ^(latest|sha-[0-9a-f]{7,40})$ ]]; then
  echo "ERROR: invalid tag: '$TAG' (expected 'latest' or 'sha-<hex>')" >&2
  exit 1
fi

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$DEPLOY_DIR/.env"
BACKEND_ENV="$DEPLOY_DIR/../Backend/.env"
VHOST_TEMPLATE="$DEPLOY_DIR/nginx/pba.conf.template"

log() { echo "[rollout $(date +%H:%M:%S)] $*"; }
die() { log "ERROR: $*"; exit 1; }

cd "$DEPLOY_DIR"

# --- Preconditions -------------------------------------------------------------
[ -f "$ENV_FILE" ]    || die "missing $ENV_FILE (copy deploy/.env.template)"
[ -f "$BACKEND_ENV" ] || die "missing $BACKEND_ENV (copy Backend/.env.example)"

# Read one KEY from deploy/.env without sourcing the file (no code execution, values may contain anything).
envval() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true; }

APP_DOMAIN="$(envval APP_DOMAIN)"
TLS_CERT_DIR="$(envval TLS_CERT_DIR)"
NGINX_CONF_DIR="$(envval NGINX_CONF_DIR)"
NGINX_CONTAINER="$(envval NGINX_CONTAINER)"
DATA_DIR="$(envval DATA_DIR)"
NGINX_CONF_DIR="${NGINX_CONF_DIR:-/root/nginx/conf.d}"
NGINX_CONTAINER="${NGINX_CONTAINER:-nginx-proxy}"
DATA_DIR="${DATA_DIR:-/srv/pba}"

# Both land inside an nginx config: only plausible hostnames / paths get through.
[[ "$APP_DOMAIN" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]] || die "APP_DOMAIN invalid or empty in deploy/.env"
[[ "$TLS_CERT_DIR" =~ ^/[A-Za-z0-9._/-]+$ ]]            || die "TLS_CERT_DIR invalid or empty in deploy/.env"
[ -f "$TLS_CERT_DIR/fullchain.pem" ] && [ -f "$TLS_CERT_DIR/privkey.pem" ] \
  || die "no fullchain.pem/privkey.pem in $TLS_CERT_DIR (certificate for $APP_DOMAIN)"
docker inspect "$NGINX_CONTAINER" >/dev/null 2>&1 || die "container $NGINX_CONTAINER not found (see docs/deploy.md §6)"
[ -d "$NGINX_CONF_DIR" ] || die "$NGINX_CONF_DIR does not exist"
[ -d "$DATA_DIR/photos" ] && [ -d "$DATA_DIR/mysql" ] || die "missing $DATA_DIR/{photos,mysql} (run deploy/server-setup.sh)"

docker network inspect nginx >/dev/null 2>&1 || {
  log "creating missing network: nginx"
  docker network create nginx
}

# --- ghcr.io login (optional) -----------------------------------------------------
GHCR_USER="$(envval GHCR_USER)"
GHCR_TOKEN="$(envval GHCR_TOKEN)"
if [ -n "$GHCR_USER" ] && [ -n "$GHCR_TOKEN" ]; then
  log "docker login ghcr.io as $GHCR_USER"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
else
  log "no GHCR_USER/GHCR_TOKEN in deploy/.env — using the existing docker login"
fi

# --- Tag to deploy -----------------------------------------------------------------
# Travels as an environment variable (beats deploy/.env). The file is rewritten ONLY at the end, when
# the deploy succeeded: if the pull failed, a reboot must not point at an image that doesn't exist.
export PBA_TAG="$TAG"
log "deploying tag: $TAG on $APP_DOMAIN"

log "pulling images"
docker compose pull api web admin client

# --- Database + migrations -----------------------------------------------------------
log "starting MySQL"
docker compose up -d mysql
for i in $(seq 1 40); do
  status=$(docker inspect pba-mysql --format '{{.State.Health.Status}}' 2>/dev/null || echo unknown)
  [ "$status" = "healthy" ] && { log "MySQL OK"; break; }
  [ "$i" -eq 40 ] && { docker logs pba-mysql --tail 40; die "MySQL never became healthy (state: $status)"; }
  sleep 3
done

# Migrations BEFORE swapping the app: the new code assumes the new schema. `migrate deploy` only
# applies pending ones; it never generates or resets. HOME=/tmp because the root fs is read-only.
log "migrations"
docker compose run --rm --no-deps -e HOME=/tmp -w /repo/database api npx --no-install prisma migrate deploy

# --- New version ----------------------------------------------------------------------
log "starting services"
docker compose up -d --no-deps api web admin client

log "waiting for healthchecks"
for svc in pba-api pba-web pba-admin pba-client; do
  for i in $(seq 1 30); do
    status=$(docker inspect "$svc" --format '{{.State.Health.Status}}' 2>/dev/null || echo unknown)
    [ "$status" = "healthy" ] && { log "$svc OK"; break; }
    [ "$i" -eq 30 ] && { docker logs "$svc" --tail 40; die "$svc never became healthy (state: $status)"; }
    sleep 3
  done
done

# --- Vhost + proxy reload ---------------------------------------------------------------
# The template in the repo is the source of truth. If the rendered file changed it is installed; if
# `nginx -t` fails the previous one is restored, so the proxy that serves EVERY project on this
# server is never left unable to reload.
VHOST_DST="$NGINX_CONF_DIR/pba.conf"
RENDERED="$(mktemp)"
trap 'rm -f "$RENDERED"' EXIT
APP_DOMAIN="$APP_DOMAIN" TLS_CERT_DIR="$TLS_CERT_DIR" envsubst '${APP_DOMAIN} ${TLS_CERT_DIR}' < "$VHOST_TEMPLATE" > "$RENDERED"

if ! cmp -s "$RENDERED" "$VHOST_DST" 2>/dev/null; then
  log "installing updated vhost → $VHOST_DST"
  [ -f "$VHOST_DST" ] && cp "$VHOST_DST" "$VHOST_DST.prev"
  cp "$RENDERED" "$VHOST_DST"
  if ! docker exec "$NGINX_CONTAINER" nginx -t; then
    log "nginx -t failed with the new vhost — restoring the previous one"
    if [ -f "$VHOST_DST.prev" ]; then mv "$VHOST_DST.prev" "$VHOST_DST"; else rm -f "$VHOST_DST"; fi
    exit 1
  fi
  rm -f "$VHOST_DST.prev"
fi

log "validating and reloading $NGINX_CONTAINER"
docker exec "$NGINX_CONTAINER" nginx -t
docker exec "$NGINX_CONTAINER" nginx -s reload

# --- Record the deployed version ------------------------------------------------------------
log "pinning $TAG in $ENV_FILE"
if grep -qE '^PBA_TAG=' "$ENV_FILE"; then
  sed -i -E "s|^PBA_TAG=.*|PBA_TAG=$TAG|" "$ENV_FILE"
else
  echo "PBA_TAG=$TAG" >> "$ENV_FILE"
fi

# Without this every deploy leaves the previous image behind and fills the disk.
log "pruning dangling images"
docker image prune -f >/dev/null

log "rollout complete — tag $TAG — https://$APP_DOMAIN"
