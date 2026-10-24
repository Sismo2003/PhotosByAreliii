# Galleries — qué falta y dudas abiertas

Fecha: 2026-10-04 · Para el agente que construya **Correos**, la **galería del cliente** o el **login del cliente**.
Contrato de la API: `docs/api-galleries.md`. Puntos de integración en el código: `grep -rn "INTEGRATION(" admin/src Backend`.

## 1. Estado

Hecho y probado con curl: lista, crear desde reserva o cliente, editor (fotos, sets, portada, ajustes, actividad),
entrega, extender, borrar, subida con revisión de espacio y barra del sidebar (`/api/admin/storage`).
**No visto en el navegador.** Las galerías de ejemplo del dev seed tienen filas de fotos sin archivos: sus miniaturas
salen como cuadro vacío (es normal).

## 2. Lo que depende de otros módulos

| Qué | Dónde se enchufa | Qué cambia al estar listo |
|---|---|---|
| **Correo de entrega** ("Your gallery is ready") | `Backend/models/gallery.model.js` `deliver()` (`INTEGRATION(correos)`) y `admin/.../galleries/integrations.js` `deliveryEmail` | Encolar el correo con enlace, contraseña y PIN usando `to/subject/message` que `deliver` ya guarda; poner `ready: true` y quitar el aviso de `DeliverDialog`. |
| **Correo de aviso 48 h antes de vencer** | tarea de `gallery-cleanup.js` | Mandarlo, llenar `expiryReminderSentAt`, y recién entonces activar `GALLERY_AUTO_DELETE=1`. |
| **Galería del cliente** (`/g/<slug>`, `ClientGallery*.dc.html`) | `integrations.js` `previewAsClient`; `publicGalleryUrl()` en `helpers.js` | Habilitar "Preview as client"; las vistas, descargas y favoritos llenan los números de la pestaña Activity (`gallery.viewed`, `gallery.downloaded`, `Favorite`). Hoy están en 0. |
| **Login del cliente** | privacidad `CLIENT_LOGIN` | Hasta que exista, "Client login" es solo un valor guardado. |
| **HEIC** | `Backend/services/storage.js` (`ALLOWED_TYPES`) | El `sharp` precompilado no lee HEIC. Se rechaza con un mensaje. Opciones: convertir en el navegador, o compilar `sharp` con libheif. |

## 3. Dudas abiertas (declaradas, para quien integre)

- **D-G1 · HEIC.** El diseño promete "JPG, PNG or HEIC up to 50 MB". Hoy solo JPG, PNG y WebP. ¿Convertir en el navegador o instalar libheif?
- **D-G2 · Favoritos y privacidad.** Al pasar a "Password" o "Anyone with link" los favoritos se apagan (D4); al volver a "Client login" **no** se reactivan solos. ¿Recordar el valor anterior?
- **D-G3 · Dominio del enlace.** El diseño dice `photosbyareli.com/g/…`; el sitio real es `photosbyareliii.com`. `publicGalleryUrl()` usa el segundo. Confirmar.
- **D-G4 · Aviso de vencimiento.** El diseño decía "7 días antes"; la decisión D9 es **48 h**. La UI ya dice 48 h.
- **D-G5 · Borrar una galería entregada** devuelve la reserva al paso "Create the gallery" y no avisa al cliente. ¿Hace falta confirmar con más fuerza o notificar?
- **D-G6 · Orden manual de fotos.** Solo hay "Upload order" y "File name" (como el diseño); no hay arrastrar para reordenar.
- **D-G7 · Descarga del original desde el admin.** La ruta existe (`/photos/:id/original?download=1`), pero no hay botón. ¿Se quiere?
- **D-G8 · Galería sin reserva.** Se permite (`bookingId` opcional). Entonces Bookings no la ve. ¿Se quiere exigir una reserva?
- **D-G9 · Dos sesiones, una galería.** Sigue abierta la duda D6 de `database/handoff.md` (paquete de dos sesiones): hoy es una galería por reserva.
- **D-G10 · Metadatos de propiedad en el original.** La copia web, la miniatura y el original editado ya llevan autor/copyright/licenciatario (`Backend/services/photo-rights.js`: "Photos By Areliii LLC", "Licensed to: Gallery #<id> – <título>", EXIF + XMP/IPTC, sin GPS). El **original subido no se toca**: sharp lo recomprimiría. Pendiente: cuando exista la descarga del cliente, escribirlos sin pérdida con `exiftool` al servir el original (Docker: `apk add exiftool`), y quitar ahí el GPS. Las fotos subidas antes de este cambio no tienen metadatos en su copia web (haría falta un script que las regenere). Si se cambia el título de la galería, los archivos ya hechos conservan el anterior. Falta decidir el texto de términos de uso (`xmpRights:UsageTerms`).
