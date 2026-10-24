---
tema: admin
estado: activo
---

# Admin

App del estudio para Areli (`admin/`): React 19 + Vite 6 + Tailwind 4, armada a partir del
template Tailux y re-tematizada con el sistema de diseño de [[diseno-ui]].

## Estado actual

- Ya existen:
  - el login;
  - los dos layouts: Sideblock (el del diseño, por defecto) y Main layout (el del template);
  - Display (Customizer), que se abre con el engrane giratorio;
  - la barra de almacenamiento;
  - **Overview** completo (agenda de 14 días, requests confirmadas vs no, dona del disco por galería, visitas con Cloudflare pendiente de conectar). Ver [[2026-10-05-overview]];
  - Settings con pestañas;
  - **Bookings · Requests** (tabla + drawer + calendario + filtros), con `slices/bookings`
    (Zustand, estilo `~/Developer/rebate/FrontEnd/src/slices/`) y endpoints reales en el backend.
- Clients, Galleries, Services, Mail y las secciones de Settings son **páginas vacías** con
  un `Placeholder` que dice qué pantalla y qué especificación implementar.
- **Bookings completo** (las 6 pestañas, drawer de solicitud y de sesión, acciones, calendario),
  probado con curl pero **sin verlo en el navegador**. Ver [[2026-10-03-bookings-tabs-admin]].
  "New booking" y las acciones que mandan correo esperan al envío de correos.
- **Requests abren su propia vista** (`/bookings/requests/:id`), no el drawer; la tabla ya no
  tiene Source ni Match. Ver [[2026-10-04-vista-request]] y `admin/handoff.md`.
- **Una sola página de reserva** (`/bookings/:id`) para todas las etapas, con progreso animado y tarjeta "Next step"; reemplaza el drawer. Ver [[2026-10-04-vista-reserva-unica]] y `docs/bookings-page-integraciones.md` (lo que depende de Correos/Galleries).
- **Tablas unificadas** en las 6 pestañas (shell compartido, isla de paginación, Skeleton, estado en la URL, orden en el servidor) y regla para tablas futuras en la skill `admin-tables`. Ver [[2026-10-04-tablas-unificadas-skeleton-url]].
- **New booking** (`/bookings/new`) ya existe: un formulario crea cliente + reserva. Ver [[2026-10-04-nuevo-booking-admin]] y `docs/nuevo-booking-admin.md`.
- `npm run dev` usa el login real contra el Backend (el bypass se eliminó el 2026-10-09).
- Guía de uso y API que espera: `admin/README.md`.

## Entradas de bitácora

- [[2026-10-02-admin-desde-template]] — de dónde salió, cómo se adaptó el template, bugs del template, verificación
- [[2026-10-03-bookings-requests]] — primera pestaña de Bookings end-to-end (backend + Zustand slices + tabla/calendario/drawer)
- [[2026-10-03-bookings-backend]] — backend de Requests revisado (Luxon/Phoenix, transacciones, 409 por carreras y duplicados) + `/api/admin/services/active`, probado con curl
- [[2026-10-03-bookings-details-fixes]] — arreglo de 3 bugs (detailChanges del backend, CONFLICT sin "Not the same person", filtro de Service por id) + dev seed (45 bookings)
- [[2026-10-04-ui-bookings-sesion]] — resumen de la sesión de pulido de Bookings (contraste en oscuro, filtros retráctiles, Hairlines/Shadow, pago de más)
- [[2026-10-04-vista-reserva-unica]] — una sola página `/bookings/:id` para todas las etapas
- [[2026-10-04-tablas-unificadas-skeleton-url]] — shell de tabla único, isla de paginación, Skeleton, URL, orden en servidor, transición de pantalla
- [[2026-10-04-nuevo-booking-admin]] — formulario único para crear cliente + reserva a mano (`/bookings/new`)
- [[2026-10-04-regla-sesion-pasada]] — **importante:** cuándo una sesión pasa a Follow-up (regla de negocio de reservas)
- [[2026-10-04-vista-request]] — requests abren una vista de página completa (`/bookings/requests/:id`) con ← Back; tabla sin Source ni Match
- [[2026-10-03-bookings-tabs-admin]] — pestañas Upcoming/Follow-up/Done/Expired/Cancelled, drawer de sesión y acciones; el subagente se detuvo y el agente principal terminó `index.jsx` y lo probó con curl

- [[2026-10-05-subida-fotos-y-efectos]] — la subida de fotos fallaba por un `AbortController` abortado por StrictMode; auditoría de efectos y base de dev vaciada
- [[2026-10-09-bugs-auditoria-datos-y-sesion]] — B1/B2/B4/B5/B7 de la auditoría; sesión revocable y vista de cambio de contraseña solo para clientes, con reglas que se marcan al escribir
- [[2026-10-09-dev-sin-bypass-y-error-de-carga]] — `npm run dev` con login real, recarga ante error de carga de página y **problema abierto**: una reserva manual no sale en `/bookings`
- [[2026-10-05-visor-de-fotos]] — visor a pantalla completa del editor de galerías (Keep/Hide, compare, descargas, rotar/recortar/redimensionar, Info)
- [[2026-10-05-visor-zoom-y-metadatos]] — fix de "Save changes" (faltaba `replaceOriginal`), deslizar + franjas laterales, Zoom con límite de velocidad (también en Compare), metadatos de propiedad en web/miniatura
- [[2026-10-05-foco-de-miniaturas]] — detector de caras (UltraFace + onnxruntime-node) guarda `focusX/Y` por foto; las miniaturas recortadas centran la cara; herramienta Focus manual en el visor

## Decisiones clave

- Carpeta aparte `admin/`, con su propio Docker; nginx la sirve en `/admin` — decisión del usuario.
- Copiar solo lo básico del template y adaptar sus componentes al diseño, creando los que falten — decisión del usuario.
- Por defecto Sideblock; el layout se elige en Display, que se abre con el engrane del template adaptado — decisión del usuario.
- ~~Bypass de login en desarrollo~~ — **eliminado el 2026-10-09 (decisión del usuario):** `npm run dev` usa siempre el login real y el Backend; se borró `dev:auth` y `admin/src/configs/dev.config.js`.
- Fechas con Luxon y teléfonos con libphonenumber-js — regla del usuario, escrita en `CLAUDE.md`.
- Usar el navegador solo después de preguntar al usuario — decisión del usuario.
- **Clients** completo (lista, perfil `/clients/:id`, alta, soft delete): ver [[2026-10-04-clients]] y `docs/api-clients.md`. El login del cliente no existe aún: `docs/clients-page-integraciones.md`.
- **Galleries** completo en el admin y la API (lista, crear, editor con fotos/portada/ajustes/actividad, entrega, almacenamiento): ver [[2026-10-04-galleries]] y `docs/api-galleries.md`. Lo pendiente: `docs/galleries-pendientes.md`. Resumen de la sesión: [[2026-10-04-sesion-clients-galleries]].
- [[2026-10-05-overview]] — Overview: agenda, gráfica de requests, dona de almacenamiento por galería, widget de visitas (Cloudflare, sin conectar)
