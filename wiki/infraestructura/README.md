---
tema: infraestructura
estado: activo
---

# Infraestructura

Dónde y cómo corre el producto: servidor propio `grid` (Tailscale) con Docker y el `nginx-proxy` compartido,
CI/CD desde GitHub Actions, almacenamiento de fotos en disco.

## Estado actual

- Especificación aprobada del almacenamiento, la barra de disco y el bloqueo de subidas:
  `docs/almacenamiento-fotos.md`.
- **2026-10-24:** despliegue a `grid` preparado y probado en local: Dockerfiles, compose, vhost, rollout, CI/CD y
  runbook en `docs/deploy.md`. Ver [[2026-10-24-despliegue-grid]]. **Pendiente: el primer rollout real.**
- El nginx de borde de Hetzner (`photosbyareliii.conf`) se eliminó; el plan de Hetzner quedó como histórico.
- Sigue sin implementar: `deploy/setup-storage.sh` (disco de tamaño fijo, `docs/almacenamiento-fotos.md` §2).

## Entradas de bitácora

- [[2026-10-24-despliegue-grid]] — CI/CD por Tailscale, dominio y servidor como variables, ensayo local

- [[2026-10-02-stack-hetzner-y-almacenamiento]] — stack, Hetzner en lugar de R2, disco con tamaño fijo, nginx y rutas

## Decisiones clave

- Se mantiene el stack que ya estaba: Astro + React, Express 5, Prisma 7 + MySQL. Ver [[2026-10-02-stack-hetzner-y-almacenamiento]].
- Las fotos van al disco del servidor (Hetzner), no a Cloudflare R2 — decisión del usuario, para no pagar almacenamiento aparte.
- Hay un límite real por sistema de archivos de tamaño fijo, porque Docker no limita volúmenes.
- Con 500 MB libres o menos se bloquea toda subida. Colores de la barra: verde con más de 60% libre, ámbar de 60% a 30%, rojo por debajo. El contacto es soporte@nimbuscloud.mx. Todo esto lo decidió el usuario.
- Dominio principal `photosbyareliii.com/admin`; `admin.photosbyareliii.com` hace 301 ahí (agente).
