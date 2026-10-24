---
tema: admin
fecha: 2026-10-04
---

# Sesión 2026-10-04 — Clients y Galleries (resumen completo)

Lo que se hizo de principio a fin, en orden. Detalle técnico en [[2026-10-04-clients]] y [[2026-10-04-galleries]].

## 1. Plan y decisiones de Clients

Se revisó el diseño `AdminClients.dc.html`, `database/handoff.md` y las skills. Alexis decidió:

1. El detalle del cliente es **una página** (`/clients/:id`), no un panel lateral.
2. **Soft delete**: solo oculta al cliente en la vista y lo desactiva por completo; no se toman en cuenta reservas ni nada más.
3. **Sin login de cliente todavía**: el módulo solo muestra el estado del login.

## 2. Clients construido

- Base de datos: `Client.deletedAt` (migración `add_client_deleted_at`, aplicada en el Docker de desarrollo).
- Backend `/api/admin/clients`: resumen, lista (pestañas calculadas, búsqueda, orden), detalle con sesiones e historial,
  crear, editar (sincroniza `User.email`), recordatorio de recompra (uno abierto por cliente), borrar y restaurar.
  409 con `details` (quién tiene ese email o teléfono).
- Login y `me` responden como si no existiera un cliente borrado.
- Admin: lista, perfil, alta (`/clients/new`) y todo con skeletons, URL como estado, Hairlines/Shadow y modo oscuro.
- "New booking" desde el perfil llega con el cliente cargado (`bookings/new/clientDraft.js`).

## 3. Correcciones pedidas por Alexis, en orden

1. **Botón Cancelar** al editar un cliente (antes decía "Back").
2. **Quitar las pestañas** de `/clients`: pasaron a un filtro **Group** (All por defecto) dentro de "Filters", junto con
   *Found me via*, *Gallery login* y *Sort*; el buscador quedó siempre visible. Se agregaron `heardFrom` y `login` a la API.
   Se siente como un lugar para localizar clientes anteriores.
3. **Delimitar las áreas** de la columna lateral del perfil (bordes más marcados, 32 px entre cajas, grupos Name / Contact /
   Found me via con líneas entre sí, y los botones separados). Se quitó el `sticky` que cortaba la parte baja.
4. **Altura máxima con scroll** en *Sessions* y *History* del perfil.

## 4. Galleries construido

Lista, crear, editor con cuatro pestañas, entrega, extender, borrar, subida con revisión de espacio, API de almacenamiento
para la barra del sidebar y limpieza de disco. Detalle y pendientes: [[2026-10-04-galleries]] y `docs/galleries-pendientes.md`.

## 5. Archivos que cambiaron fuera de los módulos nuevos

`Backend/utils/http.js` (`HttpError` con `details`), `Backend/controllers/auth.controller.js` (bloqueo de clientes borrados),
`Backend/models/booking.model.js` (exporta `REBOOK_LABEL` y `defaultRebookDay`), `Backend/models/booking-create.model.js`
(el buscador oculta borrados), `Backend/server.js` y `app.js`, `admin/src/utils/axios.js` (lee `details`),
`bookings/ToolsBar.jsx` (`storageKey` e `id`), `bookings/booking/layout.jsx` (`Block` con `boxed`),
`bookings/booking/integrations.js`, `stage.js` y `detail/FollowUpChecklist.jsx` (galerías ya conectadas),
`bookings/new/ClientSection.jsx` e `index.jsx`, `router/protected.jsx`, `.gitignore`, `Backend/.env.example`.

## 6. Documentos nuevos o actualizados

`docs/api-clients.md`, `docs/clients-page-integraciones.md`, `docs/api-galleries.md`, `docs/galleries-pendientes.md`,
`docs/almacenamiento-fotos.md` (estado), `database/handoff.md` (§4.1 `deletedAt`), `handoff.md`, `wiki/admin/README.md`.

## 7. Estado y lo que sigue

- `eslint` y `vite build` limpios; Clients y Galleries probados con curl. **Nada de esto se ha visto en el navegador.**
- Revisar en claro y oscuro, Hairlines y Shadow, y en móvil: lista de clientes con filtros, perfil (edición, scrolls),
  lista de galerías, crear galería, subir fotos de verdad, portada, ajustes y entrega.
- Pendientes de otros módulos: login del cliente, Correos (entrega, aviso de 48 h), galería del cliente, HEIC.
  Dudas D1–D4 de Clients y D-G1…D-G9 de Galleries.
- Infraestructura aún sin hacer: archivos-disco, Docker y nginx de `docs/almacenamiento-fotos.md` §2.
