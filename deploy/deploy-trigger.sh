#!/usr/bin/env bash
# =============================================================================
#  deploy-trigger.sh — the ONLY thing the CI bot can run on the server
# -----------------------------------------------------------------------------
#  INSTALLED AT:  /usr/local/bin/pba-deploy-trigger   (root:root, 755) by deploy/server-setup.sh.
#  This copy is the source of truth; after changing it, re-run `deploy/server-setup.sh --install-trigger`.
#  It cannot run from the repo: the checkout lives under /root, which the bot must not enter.
#
#  TRUST CHAIN
#    sshd (Tailscale only) → forced command in authorized_keys (runs as the bot user)
#      → this script: validates the tag, discards everything else
#      → sudo -n  (the bot's single entitlement, /etc/sudoers.d/pba-deploy)
#      → deploy/rollout.sh (as root)
#
#  The bot is NOT in the docker group on purpose: that group is root-equivalent (mount / in a container).
#  Here it cannot run docker at all — only ask for this one rollout.
# =============================================================================
set -euo pipefail

# Edit these two lines when the project moves to another path on the server.
ROLLOUT="${PBA_ROLLOUT:-/root/photosByArelli/deploy/rollout.sh}"
LOG="/var/log/pba-deploy.log"

exec > >(tee -a "$LOG") 2>&1
echo "── $(date -Is) — deploy requested from ${SSH_CLIENT%% *}"

req="${SSH_ORIGINAL_COMMAND:-}"

# No command = an attempt at an interactive shell. Always refused.
if [ -z "$req" ]; then
  echo "REFUSED: this key does not open a shell. It only triggers the rollout."
  exit 1
fi

# What the client sent is NEVER evaluated: a strict pattern pulls out something that looks like a tag
# and everything else is dropped.
tag="$(grep -oE '(^| )(sha-[0-9a-f]{7,40}|latest)( |$)' <<<"$req" | tr -d ' ' | head -n1 || true)"

if [ -z "$tag" ]; then
  echo "REFUSED: no valid tag found (sha-<hex> or latest)."
  echo "  received: $req"
  exit 1
fi

echo "── tag: $tag — running the rollout as root via sudo"
exec sudo -n "$ROLLOUT" "$tag"
