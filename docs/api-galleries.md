# API de Galleries (admin) — contrato

Rutas bajo `/api/admin/galleries` y `/api/admin/storage`, con `requireAdmin`, sobre estándar
`{ message, data, error }` / `{ error_message, message, error: true, details? }`. Tamaños en **bytes**;
fechas ISO UTC (el día de vencimiento se envía como `YYYY-MM-DD`, en `America/Phoenix`).
Reglas: `database/handoff.md` §4.7–§4.8 y `docs/almacenamiento-fotos.md`. Código:
`Backend/models/gallery.model.js`, `Backend/services/storage.js`, `Backend/middlewares/upload.middleware.js`.

## Estados

`state.key` se calcula, no se guarda: **draft** (`status = DRAFT`), **delivered** (entregada y sin vencer, con
`daysLeft`) y **expired** (`DELIVERED` con `expiresAt` pasado).

## Galerías

| Ruta | Qué hace |
|---|---|
| `GET /summary` | `{ counts{all,draft,delivered,expired}, photoCount, photosBytes, galleryCount }` |
| `GET /?tab&q&sort&page&pageSize` | Lista. `tab`: `all\|draft\|delivered\|expired`. `sort`: `newest\|oldest\|size\|title` (`size` ordena en memoria, igual que Clients). `q` busca nombre, slug, cliente, email y código de reserva. Cada fila trae `photoCount`, `sizeBytes`, `coverPhotoId`, `client`, `booking`. |
| `GET /:id` | Todo lo del editor: ajustes, **`downloadPin` y `accessPassword` en claro** (solo admin), `sets` (con `photoCount`), `photos`, `totals`, `stats` (views, downloads, favorites, lastVisitAt). |
| `GET /:id/activity` | Últimos 100 eventos de la galería. |
| `POST /` | `{ clientId, bookingId?, title?, sets? }`. La reserva debe ser del cliente, activa y sin galería (409 con `details.galleryId` si ya tiene). Nombre por defecto: `"<cliente> — <servicio>"`. Sets por defecto: Highlights, Portraits, With family, Details, Getting ready. `slug` único con sufijo `-2`, `-3`… |
| `PATCH /:id` | Solo lo enviado: `title, coverLayout, downloadMode, pinRequired, newPin, privacy, accessPassword, favoritesEnabled, favoritesLimit (null = sin límite), watermark, socialSharing, expiresOn`. `privacy=PASSWORD` exige contraseña. Con privacidad distinta de `CLIENT_LOGIN`, `favoritesEnabled` pasa a `false` (D4). `expiresOn` solo en entregadas y a futuro. |
| `DELETE /:id` | Borra filas y **toda** la carpeta `galleries/<id>/`. Sin papelera. |
| `POST /:id/deliver` | `{ to?, subject?, message?, newPin? }`. Exige ≥ 1 foto visible. Marca `DELIVERED`, fija `deliveredAt` y `expiresAt` (+90 días, solo la primera vez), genera el PIN (4 dígitos, cifrado) si `pinRequired`. Reenviar conserva fechas y PIN. **No manda el correo** (ver `docs/galleries-pendientes.md`). |
| `POST /:id/extend` | `{ days = 30 }`. Solo antes de vencer (después las fotos ya se borran, D9). |

## Sets y fotos

| Ruta | Qué hace |
|---|---|
| `POST /:id/sets` · `PATCH /:id/sets/:setId` · `DELETE /:id/sets/:setId` | Nombre único por galería (409 si se repite). Borrar un set deja sus fotos sin set. |
| `POST /:id/photos` | Multipart: campo de texto `setId` **primero**, luego `photos` (hasta 20). JPG, PNG o WebP de hasta 50 MB. Crea `original`, `web.jpg` (2048 px) y `thumb.jpg` (480 px). La UI sube **una por petición, de 3 en 3**. → `{ photos, failed }`. |
| `POST /:id/photos/bulk` | `{ action: move\|hide\|show\|delete, photoIds[], setId? }` (`move` exige `setId`, `null` = sin set). |
| `PUT /:id/cover` | `{ photoId \| null }` |
| `POST /:id/photos/bulk` — acciones `pick` / `unpick` | Es el **mismo** `Favorite` que ve el cliente (fila en `favorites` con el `clientId` de la galería; `Photo.keep` ya no se usa). `pick` también quita `hidden`; `hide` borra el favorito. La foto sale como `favorite: true/false`. No genera `ActivityEvent`. |
| `GET /:id/photos/:photoId/info` | `{ filename, mimeType, sizeBytes, width, height, uploadedAt, editedAt, exif }`. `exif` = `{ make, model, lens, focalLength, aperture, shutter (s), iso, takenAt (UTC), gps {lat,lon} }` o `{}`. Se lee del original (exifr) la primera vez y se guarda en `Photo.exif`; no hace falta rellenar fotos antiguas. `takenAt` se interpreta en `America/Phoenix`. |
| `POST /:id/photos/:photoId/edit` | **Reemplaza el original.** `{ rotate (0/90/180/270), straighten (−15…15), flipH, flipV, crop {x,y,width,height} (0–1, sobre la imagen ya girada) \| null, resize {width,height} \| null }`. Orden: orientar → voltear → girar → enderezar (recorta al mayor marco recto) → recortar → redimensionar (nunca agranda, 400). Escribe en `tmp/` y renombra al final; rehace `web.jpg` y `thumb.jpg`, actualiza `width/height/sizeBytes`, `editedAt` y un `ActivityEvent`. El archivo editado **no conserva EXIF**: queda en `Photo.exif`. Recalcula el foco (abajo); un foco `MANUAL` solo sobrevive a un `resize`. Escribe los metadatos de propiedad (`services/photo-rights.js`). |
| `POST /:id/photos/:photoId/focus` | Punto que las miniaturas recortadas mantienen a la vista. `{ x, y }` (0–1, sobre la foto ya orientada) → `focusSource: MANUAL`; `{ reset: true }` → lo vuelve a calcular. Devuelve la foto. |
| `GET /:id/photos/:photoId/(thumb\|web\|original)?download=1` | `?download=1` fuerza la descarga de cualquier variante. El visor añade `?v=<editedAt>` para saltar la caché. |
| `GET /:id/photos/:photoId/(thumb\|web\|original)` | Archivo, solo admin, `Cache-Control: private`. Nunca estático. `?download=1` en `original` fuerza la descarga. |

## Almacenamiento (`/api/admin/storage`)

| Ruta | Qué hace |
|---|---|
| `GET /` | `{ totalBytes, freeBytes, usableBytes, freePct, level OK\|LOW\|CRITICAL\|FULL, uploadsBlocked, reserveBytes, photosBytes, galleryCount, supportEmail }`. Caché de 30 s; `?fresh=1` la salta. Alimenta la barra del sidebar. |
| `POST /check` | `{ bytes, count }` → 200 si cabe; **507** `details.code = STORAGE_FULL` con `neededBytes`, `usableBytes`, `level`. La UI lo llama antes de subir un lote. |

Los tres controles del §5.2 están: la UI pregunta antes; el servidor rechaza por `Content-Length` con 507 y
**reserva** los bytes mientras sube; y un `ENOSPC` aborta, limpia y responde 507.

## Limpieza (`services/gallery-cleanup.js`, al arrancar y cada hora)

Borra `tmp/` con más de 24 h y carpetas sin fila en la base. El borrado automático de galerías vencidas (D9)
existe pero está **apagado**: se activa con `GALLERY_AUTO_DELETE=1`, junto con el correo de aviso de 48 h.

## Variables de entorno (`Backend/.env.example`)

`STORAGE_PATH` (por defecto `Backend/storage`), `STORAGE_RESERVE_BYTES`, `SUPPORT_EMAIL`, `GALLERY_ENC_KEY`
(cifra PIN y contraseña; en desarrollo se deriva de `JWT_SECRET`; en producción ponerla y no cambiarla),
`GALLERY_AUTO_DELETE`.

## Foco de las miniaturas (`Photo.focusX`, `focusY`, `focusSource`)

- Se calcula al subir y al editar (`Backend/services/photo-focus.js`), una sola vez por foto, y viaja en cada foto del `GET /:id`.
- **Cara:** UltraFace RFB-320 (`Backend/ml/ultraface-rfb-320.onnx`, 1.2 MB, MIT) con `onnxruntime-node`, en CPU. Primero corre sobre la miniatura de 480 px (~5 ms). Si no encuentra cara, revisa la copia web por mosaicos de 640×480, para caras pequeñas (~130 ms).
- **Sin cara:** se guarda `null` y la miniatura se muestra **centrada** (decisión del usuario, 2026-10-05). `SALIENCY` sigue en el enum, sin uso.
- **Varias caras:** el centro de la caja que las encierra a todas. Se descartan las menores al 20 % de la más grande (pósters, pantallas).
- Solo se guarda un punto: ninguna caja de cara ni ningún dato que identifique a la persona.
- **Admin:** `object-position` calculado en `admin/src/app/pages/galleries/focus.js` (`PhotoThumb` con `photo`). Sin foco: centrada.
- **Fotos anteriores:** `node scripts/compute-focus.js` (desde `Backend/`; `--all` recalcula todo salvo `MANUAL`, y borra el punto de las fotos sin cara).
- `GET /:id` no devuelve las fotos que todavía se están guardando (`webPath` vacío), y `PhotoThumb` reintenta dos veces (a 1 s y a 2 s) antes de mostrar el ícono de "no se pudo cargar".
- **Qué es `onnxruntime-node` (no es Python):**
  - Es un paquete de npm para Node.js. Se instala con `npm install` y se usa desde JavaScript, igual que `sharp`.
  - **ONNX** es un formato estándar de archivo para modelos de IA ya entrenados (el "JPG" de los modelos): alguien lo entrena, a veces con Python, y lo exporta a `.onnx`. Aquí es `Backend/ml/ultraface-rfb-320.onnx`.
  - **ONNX Runtime** (Microsoft, código abierto, C++) es el motor que *ejecuta* ese archivo. `onnxruntime-node` lo trae ya compilado y le pone una interfaz en JavaScript, igual que `sharp` con libvips.
  - **No necesita** Python, GPU, internet ni entrenar nada. Corre en el CPU del servidor, y las fotos nunca salen de él.
  - El motor viene compilado solo para sistemas con **glibc** (la mayoría de los Linux, y macOS). Por eso la imagen de Docker no puede ser Alpine, que usa musl.
- **Docker:** `onnxruntime-node` trae binarios para **glibc** (linux x64/arm64, macOS). La imagen del backend tiene que ser `node:<v>-slim` o `node:<v>`, **no `-alpine`** (musl). Agrega unos 50–60 MB.

