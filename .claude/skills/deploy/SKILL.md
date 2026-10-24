---
name: deploy
description: How photosByArelli is built, shipped and run in production (GitHub Actions → ghcr.io → rollout on the grid server over Tailscale), and how to change the domain or the server. Use for anything under deploy/, .github/, a Dockerfile, the nginx vhost, deploy/.env, CI secrets, a rollback, or when moving to the official domain or to another server.
---

# Deploy — photosByArelli

Full runbook: [`docs/deploy.md`](../../../docs/deploy.md). Generic server knowledge (network, firewall, bot trust
chain, other projects' conventions): the **global** skill `grid-deploy`. Git rules: **git-workflow**.

## Hard rules

1. **Deploy only through CI/CD** (push to `main` → `.github/workflows/ci-cd.yml`). Images are built in GitHub
   Actions, **never on the server**; the server only pulls. No live edits on the server.
2. **Always through Tailscale.** SSH is never exposed to the internet; `SSH_HOST` is a Tailscale address.
3. **Never touch** `deploy/.env` or `Backend/.env` on the server from the repo, and never put secrets, real
   contact data or photos in git (`shared/site.js` is real data → git-ignored; template: `shared/site.example.js`).
4. **A `git push` is the owner's decision** (skill `git-workflow`): prepare, verify, ask. Never push to deploy.
5. **Do not start a second reverse proxy on `grid`**: the shared `nginx-proxy` already owns 80/443.

## Map

| Path | What |
|---|---|
| `.github/workflows/ci-cd.yml` | checks → build 4 images → ghcr.io → rollout over Tailscale |
| `Backend/Dockerfile`, `Frontend/Dockerfile`, `admin/Dockerfile`, `client/Dockerfile` | one image each (api needs Node 24 + glibc; the others are static nginx) |
| `deploy/docker-compose.yml` | stack `pba` (no proxy): api, web, admin, client, mysql |
| `deploy/nginx/pba.conf.template` | the vhost; `rollout.sh` renders it with `envsubst` (`APP_DOMAIN`, `TLS_CERT_DIR`) |
| `deploy/rollout.sh` | pull → migrate → up → healthchecks → install vhost (nginx -t + restore) → reload |
| `deploy/deploy-trigger.sh` | the only command the CI key can run (forced command; validates the tag) |
| `deploy/server-setup.sh` | one-time, idempotent server preparation + CI bot install |
| `deploy/proxy/` | optional nginx-proxy for a server that has none (NOT for grid) |
| `deploy/.env.template` | everything that changes per server/domain |

## Changing things

- **Domain** → `APP_DOMAIN`/`TLS_CERT_DIR` in the server's `deploy/.env` + GitHub variable `APP_DOMAIN` (and
  `PUBLIC_INDEXABLE`), then re-run the workflow: the URLs are baked at build time. (`docs/deploy.md` §5)
- **Server** → `server-setup.sh` there, copy `photos/` + a MySQL dump, change secret `SSH_HOST`. (§6)
- **New env var for the API** → add it to `Backend/.env.example`; the real value goes in the server's `Backend/.env`.
- **New route/service** → vhost template + compose + a healthcheck; keep one origin (cookie `sameSite: lax`).
- **Schema change** → skill `db-migrations`; `rollout.sh` runs `prisma migrate deploy` before swapping the app.

## Before declaring a deploy change done

- `docker build` each touched Dockerfile from the repo root (`docker build -f Backend/Dockerfile .`).
- `docker compose --env-file <test.env> -f deploy/docker-compose.yml config -q`.
- Render the vhost and run `nginx -t` (`docs/deploy.md`; the nginx image has `envsubst`).
- `bash -n deploy/*.sh` and `.claude/skills/git-workflow/check-secrets.sh --all`.
- Record it per **bitacora**.
