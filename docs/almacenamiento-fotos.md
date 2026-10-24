# Especificación — almacenamiento de fotos, límite de disco y barra del admin

Fecha: 2026-10-02 · Estado: **aprobada por el usuario**. **Implementado el 2026-10-04** en `Backend/services/storage.js` (§3–§5, §7), `Backend/middlewares/upload.middleware.js`, `Backend/services/gallery-cleanup.js` (§9) y las rutas `/api/admin/storage`: contrato en `docs/api-galleries.md`. **Falta** (infraestructura): archivos-disco, Docker y nginx de §2, el correo a Alexis de §8 y HEIC. Dudas en `docs/galleries-pendientes.md`.

Para el agente que implemente la subida de fotos de galería o el despliegue en Docker. **Implementa exactamente esto**; si algo no se puede hacer así, pregunta antes de cambiarlo.

Relacionado: `database/handoff.md` §7 (D9 retención, D15 almacenamiento en el servidor), skill `auth-gallery`.

---

## 1. Contexto y decisiones del usuario

- Las fotos de galería se guardan en el **disco del servidor propio** (Hetzner, región US West recomendada), no en Cloudflare R2. Motivo: no pagar almacenamiento aparte.
- Todo corre en **Docker**. El espacio que pueden llenar las fotos tiene un **máximo fijo**, para que llenar las galerías **nunca llene el disco del servidor** ni lo tumbe.
- El admin muestra una **barra de disco** en el sidebar.
- Con **500 MB libres o menos** no se puede subir nada.
- Si una subida no cabe, se bloquea y se le dice a Areli que borre galerías viejas o contacte a Alexis: **soporte@nimbuscloud.mx** (como enlace `mailto:`).
- Colores de la barra según el **porcentaje libre**: más de 60% verde, de 60% a 30% amarillo, menos de 30% rojo.

---

## 2. Límite de disco: cómo se hace de verdad

### 2.1 Por qué Docker solo no basta

Docker **no limita** el espacio de un volumen ni de un bind mount. `--storage-opt size=` solo limita la capa interna del contenedor, solo con overlay2 sobre XFS con `pquota`, y no aplica a volúmenes. Si las fotos van a un volumen normal, pueden llenar el disco entero del servidor.

### 2.2 Solución: un sistema de archivos propio, de tamaño fijo, para las fotos

En el host se crea un **archivo-disco de tamaño fijo** (loop device) formateado en ext4, se monta en `/srv/pba/photos` y se pasa al contenedor del backend como bind mount. Cuando se llena, se llena **solo ese archivo**; el sistema operativo, Docker y MySQL no se ven afectados.

Se hace lo mismo para MySQL, con su propio archivo-disco. Así las fotos no pueden dejar sin espacio a la base, ni al revés.

```bash
# Una vez, en el host (como root). Tamaños para un disco de 80 GB: ver §2.3.
mkdir -p /srv/pba
fallocate -l 50G /srv/pba/photos.img          # reserva el espacio de verdad (no es sparse)
mkfs.ext4 -m 0 -L pba-photos /srv/pba/photos.img   # -m 0: sin el 5% reservado para root
mkdir -p /srv/pba/photos
echo '/srv/pba/photos.img /srv/pba/photos ext4 loop,noatime,nodev,nosuid,noexec 0 2' >> /etc/fstab

fallocate -l 10G /srv/pba/mysql.img
mkfs.ext4 -m 0 -L pba-mysql /srv/pba/mysql.img
mkdir -p /srv/pba/mysql
echo '/srv/pba/mysql.img /srv/pba/mysql ext4 loop,noatime 0 2' >> /etc/fstab

mount -a && df -h /srv/pba/photos /srv/pba/mysql
chown -R 1000:1000 /srv/pba/photos   # el usuario no-root del contenedor del backend
```

- `-m 0` es importante: sin eso, ext4 esconde un 5% y la barra mentiría.
- `noexec`: nada subido a la carpeta de fotos se puede ejecutar.
- Alternativa equivalente: un **Hetzner Volume** o una partición dedicada en lugar del archivo-disco. Cuesta dinero (Volume) o hay que planearla al instalar el sistema (partición); el archivo-disco es gratis.

### 2.3 Reparto del disco (servidor de 80 GB)

Los tamaños se definen en `deploy/.env` (`PHOTOS_SIZE`, `MYSQL_SIZE`, `MAIL_SIZE`) y los crea `deploy/setup-storage.sh` (`docs/correos.md` §8).

| Uso | Tamaño | Dónde |
|---|---|---|
| Sistema operativo, imágenes de Docker, logs | ~15 GB | disco raíz |
| MySQL | 10 GB | `/srv/pba/mysql.img` |
| **Fotos de galería** | **48 GB** | `/srv/pba/photos.img` |
| Bandeja de correo | 2 GB | `/srv/pba/mail.img` (ver `docs/correos.md` §8) |
| Margen libre del disco raíz | ~5 GB | — |

48 GB caben unas **20 galerías** de ~2.4 GB (150 fotos × original 15 MB + web + miniatura). Si el servidor es más grande, crece el archivo de fotos; el resto queda igual.

### 2.4 Escalar el espacio (lo que hace Alexis cuando Areli lo contacta)

Para agrandar las fotos de 50 GB a 70 GB sin perder nada:

```bash
# 1. Confirmar que el disco raíz tiene los GB extra libres (o ampliar el servidor/agregar un Volume primero).
df -h /
# 2. Parar solo el backend, agrandar el archivo y el sistema de archivos.
docker compose stop api
fallocate -l 70G /srv/pba/photos.img
losetup -c "$(findmnt -no SOURCE /srv/pba/photos)"   # el loop device ve el tamaño nuevo
resize2fs "$(findmnt -no SOURCE /srv/pba/photos)"    # ext4 crece en caliente
docker compose start api
df -h /srv/pba/photos
```

La barra del admin se actualiza sola: lee el tamaño real del sistema de archivos (§4.1), no un número configurado.

### 2.5 Otras cosas que pueden llenar el disco raíz (cerrarlas también)

- **Logs de Docker:** en cada servicio de `docker-compose.yml`, `logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }`.
- **Archivos temporales de subida:** multer **no** debe escribir en `/tmp` del contenedor (capa interna → disco raíz). Escribe en `/app/storage/tmp`, que está **dentro** del sistema de archivos de fotos. Así una subida enorme llena el archivo de fotos, no el servidor, y el `rename` final es atómico.
- **Imágenes viejas y caché de build:** `docker image prune -f` y `docker builder prune -f` en un cron semanal del host.
- **Contenedores de solo lectura:** `read_only: true` en el backend y en el frontend, con `tmpfs: /tmp:size=64m`. Solo `/app/storage` se puede escribir.
- **Memoria:** límites de RAM para que `sharp` no tumbe el servidor: backend `mem_limit: 1536m`, MySQL `mem_limit: 1g`.
- **Alerta del disco raíz:** si el disco raíz baja del 15% libre, un cron del host le manda un email a soporte@nimbuscloud.mx.

### 2.6 `docker-compose.yml` (lo relevante)

```yaml
services:
  api:
    build: ./Backend
    user: "1000:1000"
    read_only: true
    tmpfs: ["/tmp:size=64m"]
    mem_limit: 1536m
    environment:
      STORAGE_PATH: /app/storage
      STORAGE_RESERVE_BYTES: "524288000"   # 500 MB
      SUPPORT_EMAIL: soporte@nimbuscloud.mx
    volumes:
      - /srv/pba/photos:/app/storage        # el sistema de archivos de tamaño fijo
    logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }

  mysql:
    image: mysql:8.4
    mem_limit: 1g
    volumes:
      - /srv/pba/mysql:/var/lib/mysql
    logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }

  # nginx de entrada, sitio público y admin: ver deploy/docker-compose.yml y deploy/nginx/
```

En nginx: `client_max_body_size 60m` en `/api/` (una foto por petición, ver §5.3). El compose completo está en `deploy/docker-compose.yml`.

---

## 3. Estructura de carpetas dentro de `/app/storage`

```
/app/storage/
  galleries/<galleryId>/<photoId>/original.<ext>
  galleries/<galleryId>/<photoId>/web.jpg
  galleries/<galleryId>/<photoId>/thumb.jpg
  tmp/                     # subidas en curso; mismo sistema de archivos
```

- **Nunca** se sirve con `express.static`. Todo pasa por rutas que revisan login, dueño de la galería y PIN (skill `auth-gallery`).
- Nombres opacos (ids). Nunca el nombre del cliente en la ruta.
- Todo acceso a disco va en **un solo módulo**, `Backend/services/storage.js` (`save`, `remove`, `removeGallery`, `stat`, `openRead`), para poder pasar a R2 en el futuro cambiando solo ese archivo.

---

## 4. Cálculo del espacio

### 4.1 La fuente de verdad es el sistema de archivos

```js
// Backend/services/storage.js
import { statfs } from 'node:fs/promises';

export async function diskStatus() {
  const s = await statfs(STORAGE_PATH);
  const totalBytes = s.blocks * s.bsize;
  const freeBytes = s.bavail * s.bsize;          // bavail, no bfree
  const usableBytes = Math.max(0, freeBytes - inFlightBytes - RESERVE_BYTES);
  const freePct = totalBytes ? (freeBytes / totalBytes) * 100 : 0;
  return { totalBytes, freeBytes, usableBytes, freePct, level: levelFor(freeBytes, freePct) };
}
```

- `statfs` dentro del contenedor, sobre el bind mount, devuelve el tamaño del archivo-disco de fotos (50 GB), no el del servidor. Por eso la barra muestra exactamente el límite real.
- `inFlightBytes`: suma de lo que las subidas en curso todavía van a escribir (§5.2). Vive en memoria; hay **una sola** instancia del backend.
- Para el desglose "en fotos de galería" se usa la suma de `Photo.sizeBytes` (más web y miniatura) de la base. Solo es informativo; para decidir si se puede subir se usa el `statfs`.

### 4.2 Niveles y colores

Por **porcentaje libre** del sistema de archivos de fotos, y por encima de todo, el bloqueo de 500 MB:

| Nivel | Condición (se evalúa en este orden) | Color de la barra | ¿Puede subir? |
|---|---|---|---|
| `FULL` | libre ≤ **500 MB** | rojo | **No, nada** |
| `CRITICAL` | libre < **30%** | rojo | Sí, si la subida cabe (§5) |
| `LOW` | libre de **30% a 60%** (ambos incluidos) | amarillo | Sí, si la subida cabe |
| `OK` | libre > **60%** | verde | Sí, si la subida cabe |

```js
function levelFor(freeBytes, freePct) {
  if (freeBytes <= RESERVE_BYTES) return 'FULL';
  if (freePct < 30) return 'CRITICAL';
  if (freePct <= 60) return 'LOW';
  return 'OK';
}
```

Los colores deben pasar contraste con el fondo blanco del admin y **no depender solo del color** (accesibilidad): la barra va siempre con texto.

| Nivel | Relleno de la barra | Texto |
|---|---|---|
| OK | verde `#2f7d4a` | gris normal del sidebar |
| LOW | amarillo/ámbar `#b7791f` | gris normal |
| CRITICAL / FULL | rojo `#b42318` | rojo `#b42318` |

El resto del admin es blanco y negro (EB Garamond); estos tres colores son la **única** excepción, solo en esta barra y en los mensajes de espacio.

---

## 5. Bloqueo de subidas

### 5.1 Regla

Una subida se permite **solo si** después de guardarla quedan **más de 500 MB libres**:

```
espacio necesario ≈ suma de tamaños de los originales × 1.10   (web + miniatura ≈ +10%)
se permite si: freeBytes − inFlightBytes − espacio necesario > 500 MB
```

- Si el lote **no cabe completo, se rechaza completo**. No se suben fotos a medias.
- Con nivel `FULL` se rechaza **cualquier** subida, sin importar el tamaño.
- Las acciones que **liberan** espacio (borrar fotos o galerías) siempre están permitidas.
- Crear una galería vacía o editar ajustes está permitido: solo se bloquea escribir archivos.

### 5.2 Tres controles (los tres son obligatorios)

1. **Antes de enviar (frontend).** La pantalla de subida conoce el tamaño de cada `File`. Llama a `POST /api/admin/storage/check` con `{ bytes, count }`. Si no cabe, **no envía nada** y muestra el mensaje (§6). Sirve para no hacer esperar a Areli subiendo 3 GB que se van a rechazar.
2. **Al recibir la petición (backend).** Antes de aceptar el cuerpo, revisa `Content-Length` contra la regla. Si no cabe, responde **`507 Insufficient Storage`** de inmediato, sin leer el cuerpo. Si cabe, **reserva** esos bytes en `inFlightBytes`, para que dos subidas a la vez no se aprueben con el mismo espacio libre.
3. **Mientras se escribe (backend).** Si a pesar de todo el disco se llena (`ENOSPC`), se aborta la subida, se borran los temporales de esa petición, se libera la reserva y se responde `507`. **Nunca** queda una fila `Photo` sin sus tres archivos ni archivos sin fila.

La reserva se libera siempre al terminar (éxito, error o cancelación del cliente), en un `finally`.

### 5.3 Forma de la subida

- Una foto por petición (la UI sube en paralelo de 3 en 3) o lotes pequeños. Así el `Content-Length` de cada petición es pequeño, el bloqueo del punto 2 es preciso y un fallo no tira todo el lote. El chequeo del lote completo lo hace el punto 1.
- Límite por foto: **50 MB** (texto del diseño: "JPG, PNG or HEIC up to 50 MB each"), en multer (`limits.fileSize`) y en nginx.

### 5.4 Respuesta de error (formato del backend)

```json
{
  "ok": false,
  "error": {
    "code": "STORAGE_FULL",
    "message": "Not enough space to upload these photos.",
    "details": {
      "neededBytes": 3221225472,
      "usableBytes": 1073741824,
      "freeBytes": 1598029824,
      "level": "CRITICAL",
      "supportEmail": "soporte@nimbuscloud.mx"
    }
  }
}
```

Usar el sobre de respuesta del skill `backend`; `code` siempre `STORAGE_FULL`, con HTTP `507`.

---

## 6. Textos (UI)

El admin está en inglés con el botón ES/EN sin traducir todavía; usar el idioma actual del admin. Las dos versiones:

**Subida rechazada porque no cabe** (modal o aviso en la pantalla de subida, con la zona de arrastre desactivada):

> **Not enough space for these photos**
> These photos need about **3.0 GB** and there's **1.0 GB** available.
> Delete old galleries to free up space, or contact Alexis at [soporte@nimbuscloud.mx](mailto:soporte@nimbuscloud.mx?subject=More%20storage%20for%20Photos%20By%20Areliii) to add more storage.

> **No hay espacio para estas fotos**
> Estas fotos necesitan unos **3.0 GB** y hay **1.0 GB** disponible.
> Elimina galerías viejas para liberar espacio o contacta a Alexis en [soporte@nimbuscloud.mx](mailto:soporte@nimbuscloud.mx?subject=M%C3%A1s%20espacio%20para%20Photos%20By%20Areliii) para ampliar el espacio.

**Nivel `FULL`** (la zona de subida aparece desactivada desde que se abre la pantalla):

> **Storage is full** — uploads are paused until there's more than 500 MB free.
> Delete old galleries, or contact Alexis at soporte@nimbuscloud.mx to add more storage.

> **El almacenamiento está lleno**: no se puede subir nada hasta que haya más de 500 MB libres.
> Elimina galerías viejas o contacta a Alexis en soporte@nimbuscloud.mx para ampliar el espacio.

- El correo **siempre** es un enlace `mailto:` con asunto prellenado.
- "Delete old galleries" / "Elimina galerías viejas" es un enlace a la lista de galerías ordenada por **más antiguas primero**, mostrando el tamaño de cada una, para que Areli vea cuál libera más.
- Tamaños con una decimal y unidades binarias mostradas como GB/MB (1 GB = 1024³ bytes).

---

## 7. Barra en el sidebar del admin

Debajo de la navegación del sidebar (Overview, Bookings, Clients, Galleries, Services, Settings), fija abajo:

```
STORAGE
[██████████████░░░░░░]      ← relleno = % USADO, color según el % LIBRE
18.4 GB free of 50 GB
```

- El relleno representa el espacio **usado** (crece de izquierda a derecha); el color sale del nivel (§4.2).
- `CRITICAL`: debajo, en rojo, "Running low — delete old galleries" (enlace).
- `FULL`: "Storage full — uploads paused" (rojo) y el enlace `mailto:` a soporte@nimbuscloud.mx.
- Accesible: `<div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="63" aria-label="Storage used">` más el texto visible.
- Tablet: igual. Móvil (sidebar en menú): la misma barra dentro del menú, y en `CRITICAL`/`FULL` un aviso en la parte de arriba de la pantalla de galerías.
- Datos: `GET /api/admin/storage` (solo ADMIN) →

  ```json
  { "ok": true, "data": {
      "totalBytes": 53687091200, "freeBytes": 19756849152, "usableBytes": 19232561152,
      "freePct": 36.8, "level": "LOW", "uploadsBlocked": false,
      "reserveBytes": 524288000, "photosBytes": 33285996544, "galleryCount": 14,
      "supportEmail": "soporte@nimbuscloud.mx" } }
  ```

  El backend lo cachea 30 segundos. El frontend lo vuelve a pedir al cargar el admin, al cambiar de pantalla y **justo después** de subir o borrar fotos (sin caché en esos dos casos), para que la barra refleje el cambio enseguida.

---

## 8. Avisos por email a Alexis (recomendado)

Areli puede no mirar la barra. Un cron diario del backend (y también después de cada subida) revisa el nivel y, **cuando cambia a peor**, manda un email a `SUPPORT_EMAIL`:

- Al entrar en `CRITICAL`: "Photos By Areliii: storage below 30% (18.4 GB free of 50 GB)".
- Al entrar en `FULL`: "Photos By Areliii: storage FULL, uploads are blocked".

No repite el mismo aviso mientras el nivel no mejore. Se guarda en `StudioSettings.storageAlertLevel` y `storageAlertSentAt` (ya en `database/schema.draft.prisma`). Requiere el servicio de email (Resend), que todavía no existe; si se implementa antes, dejar el aviso como `ActivityEvent` y el email para después.

---

## 9. Borrado y limpieza (para que el espacio se libere de verdad)

- **Borrar una foto:** dentro de una transacción se borra la fila; después se borran los tres archivos. Si falla el borrado de archivos, se registra para el limpiador.
- **Borrar una galería:** se borran sus filas (cascada) y luego **toda** la carpeta `galleries/<id>/` (`rm -rf` equivalente con `fs.rm(..., { recursive: true, force: true })`).
- **Borrado automático (D9):** cuando vence la galería (`expiresAt`), una tarea cada hora borra la carpeta `galleries/<id>/` y las filas `Photo`, llena `Gallery.photosDeletedAt` y registra un `ActivityEvent` "Gallery photos deleted automatically". La fila de la galería se conserva para el historial. El cliente ya recibió el aviso 48 h antes (`docs/correos.md` #20). Si el aviso no se pudo enviar (FAILED o rebote), el borrado **sigue igual**, pero Areli ve la alerta en el admin.
- **Limpiador diario:**
  - borra `tmp/` con más de 24 h;
  - borra carpetas `galleries/<id>/` o `<photoId>/` que ya no tienen fila en la base (huérfanas de un fallo);
  - registra cuánto liberó.
- No hay papelera: borrar es definitivo (decisión del usuario). La carpeta de fotos **no** entra en los respaldos (§D15); solo se respalda MySQL.
- Linux solo libera el espacio cuando se cierran los archivos abiertos: una descarga en curso de una foto borrada retiene su espacio hasta que termina. Es normal; la barra se corrige en la siguiente lectura.

---

## 10. Pruebas que debe pasar la implementación

Con un archivo-disco **pequeño** de prueba (`fallocate -l 2G`), no con el real:

1. Barra en verde, amarillo y rojo en los límites exactos: 60.0% libre = amarillo, 60.1% = verde, 30.0% = amarillo, 29.9% = rojo.
2. Con 600 MB libres, una foto de 150 MB (×1.10 = 165 MB) se rechaza porque dejaría menos de 500 MB.
3. Con 500 MB libres o menos, cualquier subida da `507 STORAGE_FULL` y la zona de subida aparece desactivada.
4. Dos subidas simultáneas que caben por separado pero no juntas: una pasa y la otra da `507`.
5. Llenar el disco a mitad de una subida (`ENOSPC`): no quedan filas `Photo` sin archivos, ni archivos en `tmp/`, y la reserva vuelve a 0.
6. Borrar una galería sube el espacio libre de la barra en la siguiente lectura.
7. Con el archivo-disco de fotos al 100%, el sitio público, el login y MySQL siguen funcionando.
8. El enlace a soporte@nimbuscloud.mx abre el cliente de correo con el asunto prellenado.
