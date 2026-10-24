#!/usr/bin/env bash
# =============================================================================
#  server-setup.sh — one-time (idempotent) preparation of a server for photosByArelli
# -----------------------------------------------------------------------------
#  Run it ON THE SERVER, as root, from the repo checkout (reached over Tailscale):
#      sudo deploy/server-setup.sh                                     # folders, network, .env files
#      sudo deploy/server-setup.sh --install-trigger --pubkey ci.pub   # + CI bot (trigger, sudoers, key)
#      sudo deploy/server-setup.sh --install-trigger --create-bot-user --pubkey ci.pub   # new server
#
#  It never touches other projects' files, never restarts anything and never opens firewall ports.
#  Moving to another server = run this there, copy the data (docs/deploy.md §4) and update the
#  GitHub secret SSH_HOST.
# =============================================================================
set -euo pipefail

BOT_USER="${BOT_USER:-grid-bot-git}"
TRIGGER_DST="/usr/local/bin/pba-deploy-trigger"
SUDOERS_DST="/etc/sudoers.d/pba-deploy"
# Tailscale's CGNAT range: the CI key is only valid when it connects from inside the tailnet.
TS_RANGE="100.64.0.0/10"

INSTALL_TRIGGER=0
CREATE_BOT=0
PUBKEY=""
while [ $# -gt 0 ]; do
  case "$1" in
    --install-trigger) INSTALL_TRIGGER=1 ;;
    --create-bot-user) CREATE_BOT=1 ;;
    --pubkey) PUBKEY="${2:?--pubkey needs a file}"; shift ;;
    -h|--help) sed -n 2,13p "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

log() { echo "[setup] $*"; }
die() { echo "[setup] ERROR: $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run as root"
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$DEPLOY_DIR")"

# --- 1. Tools --------------------------------------------------------------------------------
for bin in docker envsubst; do
  command -v "$bin" >/dev/null || die "'$bin' is not installed (envsubst: apt install gettext-base)"
done
docker compose version >/dev/null 2>&1 || die "'docker compose' (v2) is not available"

# --- 2. Config files (never overwritten) --------------------------------------------------------
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  cp "$DEPLOY_DIR/.env.template" "$DEPLOY_DIR/.env"
  chmod 600 "$DEPLOY_DIR/.env"
  log "created deploy/.env — FILL IT IN (passwords: openssl rand -hex 24)"
fi
if [ ! -f "$REPO_DIR/Backend/.env" ]; then
  cp "$REPO_DIR/Backend/.env.example" "$REPO_DIR/Backend/.env"
  chmod 600 "$REPO_DIR/Backend/.env"
  log "created Backend/.env — FILL IT IN (JWT_SECRET, GALLERY_ENC_KEY, SMTP…)"
fi
if [ ! -f "$REPO_DIR/shared/site.js" ]; then
  cp "$REPO_DIR/shared/site.example.js" "$REPO_DIR/shared/site.js"
  log "created shared/site.js from the template (CI bakes the real one into the images; this copy is not used)"
fi

DATA_DIR="$(grep -E '^DATA_DIR=' "$DEPLOY_DIR/.env" | tail -n1 | cut -d= -f2- || true)"
DATA_DIR="${DATA_DIR:-/srv/pba}"
[[ "$DATA_DIR" =~ ^/[A-Za-z0-9._/-]+$ ]] || die "DATA_DIR invalid in deploy/.env"

# --- 3. Data folders + shared network -------------------------------------------------------------
mkdir -p "$DATA_DIR/photos" "$DATA_DIR/mysql"
chown 1000:1000 "$DATA_DIR/photos"   # the API container runs as uid 1000
chmod 750 "$DATA_DIR" "$DATA_DIR/photos"
log "data folders ready in $DATA_DIR (photos/ → uid 1000, mysql/ → managed by the mysql image)"

docker network inspect nginx >/dev/null 2>&1 || { docker network create nginx >/dev/null; log "created network: nginx"; }

# --- 4. CI bot (optional) ---------------------------------------------------------------------------
if [ "$INSTALL_TRIGGER" -eq 1 ]; then
  [ -n "$PUBKEY" ] && [ -f "$PUBKEY" ] || die "--install-trigger needs --pubkey <public key file>"
  grep -qE '^(ssh-ed25519|ssh-rsa|ecdsa-sha2-[a-z0-9]+) ' "$PUBKEY" || die "$PUBKEY doesn't look like a public key (never pass the PRIVATE one)"

  if ! id "$BOT_USER" >/dev/null 2>&1; then
    [ "$CREATE_BOT" -eq 1 ] || die "user '$BOT_USER' does not exist (add --create-bot-user on a new server)"
    useradd --create-home --shell /bin/bash "$BOT_USER"
    log "created user $BOT_USER (NOT in the docker group, on purpose)"
  fi
  id -nG "$BOT_USER" | tr ' ' '\n' | grep -qx docker && die "$BOT_USER is in the docker group (root-equivalent): remove it"

  # The trigger reads the rollout path from this repo's real location.
  install -m 755 -o root -g root "$DEPLOY_DIR/deploy-trigger.sh" "$TRIGGER_DST"
  sed -i -E "s|^ROLLOUT=.*|ROLLOUT=\"\${PBA_ROLLOUT:-$DEPLOY_DIR/rollout.sh}\"|" "$TRIGGER_DST"
  log "installed $TRIGGER_DST → $DEPLOY_DIR/rollout.sh"

  SUDOERS_TMP="$(mktemp)"
  echo "$BOT_USER ALL=(root) NOPASSWD: $DEPLOY_DIR/rollout.sh" > "$SUDOERS_TMP"
  visudo -cf "$SUDOERS_TMP" >/dev/null || { rm -f "$SUDOERS_TMP"; die "generated sudoers file is invalid"; }
  install -m 440 -o root -g root "$SUDOERS_TMP" "$SUDOERS_DST"; rm -f "$SUDOERS_TMP"
  log "installed $SUDOERS_DST"

  SSH_DIR="$(getent passwd "$BOT_USER" | cut -d: -f6)/.ssh"
  install -d -m 700 -o "$BOT_USER" -g "$BOT_USER" "$SSH_DIR"
  AUTH="$SSH_DIR/authorized_keys"
  touch "$AUTH"; chown "$BOT_USER:$BOT_USER" "$AUTH"; chmod 600 "$AUTH"
  KEY_BODY="$(awk '{print $1" "$2}' "$PUBKEY")"
  if grep -qF "$KEY_BODY" "$AUTH"; then
    log "key already present in $AUTH"
  else
    # restrict = no shell, no forwarding, no pty; from= = only inside the tailnet; command= = only the trigger.
    echo "command=\"$TRIGGER_DST\",restrict,from=\"$TS_RANGE\" $KEY_BODY pba-ci" >> "$AUTH"
    log "added the CI key to $AUTH (forced command, tailnet-only)"
  fi
  touch /var/log/pba-deploy.log; chown "$BOT_USER" /var/log/pba-deploy.log; chmod 640 /var/log/pba-deploy.log
fi

cat <<NEXT

[setup] done. Next:
  1. Edit deploy/.env and Backend/.env on this server (secrets never go to git).
  2. Put the CI PRIVATE key in the GitHub secret SSH_PRIVATE_KEY, then shred it here.
  3. First deploy: push to main (CI) or run  $DEPLOY_DIR/rollout.sh
  Full runbook: docs/deploy.md
NEXT
