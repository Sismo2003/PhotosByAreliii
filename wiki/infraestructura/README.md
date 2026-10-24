---
tema: infraestructura
estado: activo
---

# Infraestructura

Dónde y cómo corre el producto: servidor propio en Hetzner con Docker, nginx de entrada,
almacenamiento de fotos en disco con límite fijo.

## Estado actual

- Especificación aprobada del almacenamiento, la barra de disco y el bloqueo de subidas:
  `docs/almacenamiento-fotos.md`.
- Hay `deploy/docker-compose.yml` y `deploy/nginx/photosbyareliii.conf` (escritos, **sin probar**).
- Falta: `deploy/setup-storage.sh` (descrito en la especificación, no escrito), los Dockerfiles de
  `Frontend/` y `Backend/`, los certificados TLS y el servidor real.

## Entradas de bitácora

- [[2026-10-02-stack-hetzner-y-almacenamiento]] — stack, Hetzner en lugar de R2, disco con tamaño fijo, nginx y rutas

## Decisiones clave

- Se mantiene el stack que ya estaba: Astro + React, Express 5, Prisma 7 + MySQL. Ver [[2026-10-02-stack-hetzner-y-almacenamiento]].
- Las fotos van al disco del servidor (Hetzner), no a Cloudflare R2 — decisión del usuario, para no pagar almacenamiento aparte.
- Hay un límite real por sistema de archivos de tamaño fijo, porque Docker no limita volúmenes.
- Con 500 MB libres o menos se bloquea toda subida. Colores de la barra: verde con más de 60% libre, ámbar de 60% a 30%, rojo por debajo. El contacto es soporte@nimbuscloud.mx. Todo esto lo decidió el usuario.
- Dominio principal `photosbyareliii.com/admin`; `admin.photosbyareliii.com` hace 301 ahí (agente).
