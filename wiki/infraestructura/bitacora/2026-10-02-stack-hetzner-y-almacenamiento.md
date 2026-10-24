---
tema: infraestructura
fecha: 2026-10-02
---

# Stack, Hetzner y almacenamiento de fotos

## Qué se hizo

- Recomendación de stack: **mantener** el que ya estaba en los `package.json` (Astro 7 + React 19,
  Express 5, Prisma 7 + MySQL), más email, procesamiento de fotos (`sharp`), ZIP con `archiver` y
  `libphonenumber-js`.
- Comparación entre Cloudflare R2 y el disco del servidor, con el volumen estimado (~6 sesiones al
  mes, ~2.4 GB por galería). El usuario eligió el disco de **Hetzner**.
- Especificación `docs/almacenamiento-fotos.md`:
  - un sistema de archivos de tamaño fijo para fotos, otro para MySQL y otro para correo;
  - la barra del sidebar;
  - el bloqueo con 500 MB libres;
  - tres controles (navegador, `Content-Length` con reserva, `ENOSPC` al escribir);
  - el borrado real de archivos y las pruebas.
- `deploy/docker-compose.yml`: nginx, admin, web, api y mysql, con límites de logs y de RAM y
  contenedores de solo lectura.
- `deploy/nginx/photosbyareliii.conf`:
  - `/` → web, `/admin/` → admin, `/api/` → api;
  - `admin.` y `www.` redirigen al dominio principal;
  - `client_max_body_size 60m` en la API.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Servidor propio en Hetzner + Docker | usuario | Un solo servidor, costo fijo |
| Fotos en disco, no en R2 | usuario | No quiere pagar almacenamiento aparte |
| Cuándo convendría R2 | agente (informativo) | Cuando las fotos ya no quepan en el disco incluido en el plan; R2 sale más barato por GB que agrandar el disco en Hetzner |
| Archivo-disco (loop, ext4 `-m 0`) por cada parte | agente | Docker no limita volúmenes ni bind mounts |
| Respaldar solo MySQL, no la carpeta de fotos | usuario + agente | Que borrar fotos sea un borrado real |
| `/admin` como dominio principal en lugar del subdominio | agente | Mismo origen para la cookie de sesión, sin CORS |
| nginx en vez de Caddy | usuario | El usuario pidió nginx; la especificación se corrigió |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Hetzner bloquea los puertos 25 y 465 de salida | Búsqueda web (fuentes citadas en la conversación) |
| Límites de Hostinger (1 000 correos al día por buzón en Business Starter) | Página de soporte de Hostinger |

**Lo que NO está verificado:** `docker compose` no se ha levantado (el daemon de Docker no corría
en la Mac); `nginx -t` no se ha corrido; los comandos de loop device de la especificación no se
han probado en un servidor; los precios de Hetzner son aproximados.

## Trampas descubiertas

- **Hetzner bloquea los puertos 465 y 25 de salida.** El SMTP de Hostinger debe ir por el **587
  (STARTTLS)**. Ver [[correos]].
- `ext4` reserva un 5% para root si no se formatea con `-m 0`; sin eso la barra del admin miente.
- Los temporales de multer deben ir **dentro** del sistema de archivos de fotos
  (`/app/storage/tmp`), no a `/tmp` del contenedor, o una subida grande llena el disco raíz.
- Con 80 GB y 48 GB para fotos caben unas 20 galerías; el estimado de fotos vivas era de ~58 GB.
  Conviene un plan de 160 GB.

## Siguiente paso

Escribir `deploy/setup-storage.sh` y los Dockerfiles de `Backend/` y `Frontend/`; probar el compose
en local con Docker encendido.

---
Relacionado: [[infraestructura]] · [[admin]] · [[correos]] · [[base-de-datos]]
