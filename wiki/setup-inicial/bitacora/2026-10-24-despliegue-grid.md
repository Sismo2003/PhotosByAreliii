---
tipo: bitacora
tema: setup-inicial
fecha: 2026-10-24
---

# Despliegue en el servidor `grid` (CI/CD por Tailscale)

Parte de [[setup-inicial]] · continúa [[2026-10-24-repo-publico-y-git-workflow]] · infraestructura en [[infraestructura]].

## Qué se hizo
- **Imágenes**: Dockerfile del API (`Backend/`, Node 24 slim porque el cliente de Prisma 7 es TypeScript), del sitio
  (`Frontend/`) y contexto raíz para `shared/`. Probadas: build, arranque, `migrate deploy` (9 migraciones) y healthchecks.
- **Sitio público mínimo** en `Frontend/` (Astro estático, datos de `shared/site.js`, `noindex` mientras el dominio sea temporal).
- **`deploy/`** reescrito para `grid`: compose sin proxy propio (se une a la red `nginx` del `nginx-proxy` compartido),
  plantilla de vhost con `envsubst`, `rollout.sh`, `deploy-trigger.sh`, `server-setup.sh` y `proxy/` opcional.
  Se eliminó el nginx de borde de Hetzner (`photosbyareliii.conf`).
- **`.github/workflows/ci-cd.yml`**: checks → 4 imágenes a ghcr.io → rollout por Tailscale con *forced command*.
- Primera versión en `areli.grid.nimbuscloud.mx` (un nivel bajo el comodín: sin DNS ni certificado nuevos).
  Dominio, servidor y certificado son variables (`APP_DOMAIN`, `TLS_CERT_DIR`, `SSH_HOST`): `docs/deploy.md` §5–6.
- `client/public/login.jpg` pasó a ser **pública** con metadatos limpiados y copyright incrustado
  (`docs/derechos-imagenes.md`).
- Skill del proyecto `deploy` y skill **global** `grid-deploy` (patrón común de tus proyectos TAEV, planner, cdidthat).

## Cómo se probó (en local, sin tocar el servidor)
Build de las 4 imágenes; `docker compose config`; vhost renderizado + `nginx -t`; stack completo detrás de un nginx con
certificado temporal: `/`, `/login`, `/client/`, `/admin/`, `/api/health` responden 200 por un solo origen, `/admin/login` 302,
login inválido 401 y el límite del borde da 429 tras 5 intentos; el volumen de fotos es escribible y el resto es solo lectura.

## Decisiones
- Panel como ruta `/admin/` (no `admin.areli.grid…`): un segundo nivel no lo cubre el comodín.
- `shared/site.js` real → secret `SITE_JS_B64` del CI; sin él las imágenes llevan datos de ejemplo (aviso en el workflow).
- Imágenes de ghcr.io privadas; el login de root en el servidor las baja.

## Pendiente (lo hace el dueño)
- Crear en el servidor `deploy/.env` y `Backend/.env`, la llave de CI y los secrets/variables de GitHub (`docs/deploy.md` §3–4).
- **No probado contra el servidor real**: `server-setup.sh`, `rollout.sh` y la conexión por Tailscale solo se validaron por
  sintaxis y por ensayo local equivalente. El primer rollout real es la prueba.
- Rotar la contraseña temporal de `pass-temp.txt`.
