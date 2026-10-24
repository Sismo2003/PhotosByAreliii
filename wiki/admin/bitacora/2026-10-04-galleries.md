---
tema: admin
fecha: 2026-10-04
---

# Galleries (lista, crear, editor, entrega, almacenamiento)

## Qué se hizo

- **Lista `/galleries`**: misma estructura que Clients ([[2026-10-04-clients]]): buscador siempre visible, filtros
  plegables (State, Sort), tabla del shell compartido con miniatura de portada, tamaño y estado. "Oldest first" y
  "Largest first" sirven para decidir qué borrar cuando falta espacio; el sidebar enlaza a `?sort=oldest`.
- **Crear** `/galleries/new`: cliente (o llegando con `?booking=` / `?client=`), sesión sin galería, nombre y sets.
  Los botones "Create gallery / Open gallery" de la reserva ya apuntan aquí (`bookings/booking/integrations.js`).
- **Editor** `/galleries/:id` con pestañas (en `?tab=`):
  - **Photos**: sets a la izquierda (agregar, renombrar, quitar), zona de arrastre (acepta carpetas), cola con
    progreso, selección múltiple y acciones (Move to set, Set as cover, Hide/show, Delete), orden y tamaño S/M/L.
  - **Cover**: layout Full/Split/Minimal, vista previa y selector.
  - **Settings**: descargas, PIN, privacidad, favoritos, marca de agua, vencimiento, extender 30 días y borrar.
  - **Activity**: números y historial.
  - **Deliver / Send again**: marca la galería como entregada y muestra enlace, contraseña y PIN para mandarlos a mano.
- **Backend** `/api/admin/galleries` y `/api/admin/storage` (contrato: `docs/api-galleries.md`):
  `gallery.model.js`, `services/storage.js`, `middlewares/upload.middleware.js`, `services/gallery-cleanup.js`,
  `utils/crypto.js` (PIN y contraseña cifrados con AES-256-GCM).
- **Almacenamiento** de `docs/almacenamiento-fotos.md`: tres controles contra llenar el disco (pregunta previa, 507 por
  `Content-Length` con reserva de bytes, `ENOSPC`), niveles OK/LOW/CRITICAL/FULL y la barra del sidebar, que ya existía
  pero no tenía API.

## Decisiones

- Una foto por petición, 3 en paralelo; el lote completo se revisa antes de enviar.
- Archivos en `Backend/storage/galleries/<galleryId>/<photoId>/{original,web.jpg,thumb.jpg}` (ids opacos); se sirven solo
  por rutas de admin.
- El borrado automático de galerías vencidas (D9) está **apagado** (`GALLERY_AUTO_DELETE`) hasta que exista el correo de 48 h.
- Sin correo no hay envío: Deliver guarda y muestra los datos. Todo lo pendiente y las dudas D-G1…D-G9:
  `docs/galleries-pendientes.md`.

## Probado

Con curl: crear (y los errores de reserva repetida o de otro cliente), subir JPG, rechazar HEIC y archivos que no son
imagen (sin dejar filas ni temporales), mover, ocultar, portada, ajustes (contraseña obligatoria, favoritos), entregar
(PIN y fechas), extender, set repetido, actividad, revisión de espacio, 401 sin sesión y limpieza de carpetas huérfanas.
`eslint` y `vite build` limpios. **No visto en el navegador.**
