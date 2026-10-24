---
tema: admin
fecha: 2026-10-05
---

# Services: catálogo operativo (sin landing)

Se construyó el módulo Services de punta a punta. Decisión del usuario: Services es **lo que Areli
ofrece** y alimenta New booking y `/book`; **no** controla las páginas de la landing.

## Decisiones

- Se **borraron** de `Service` las columnas de landing: `cardLine`, `intro`, `includesLine`, `ctaWord`, `fromPackageId`.
- Add-ons por servicio: se mantiene la tabla puente `ExtraService` (un servicio puede tener varios add-ons y un add-on varios servicios).
- Minutos extra de pago: nuevo `Extra.minutes` (por unidad). Se apoya en el PDF `Photos By Areliii LLC/Photos By Areliii LLC.pdf`:
  *"every 30 mins. added is +$50"*, solo en Party. Duración de la reserva = paquete + Σ(minutos × cantidad).

## Qué se hizo

- Migraciones `catalog_operational_extra_minutes` (esquema) y `extra_minutes_data` (pone 30 al extra existente). Seed y `catalog.js` sin copy de landing.
- Backend: `service.model.js`, `extra.model.js`, `validators/service.schemas.js`, rutas `/api/admin/services` y `/api/admin/extras` (CRUD, paquetes, orden, asignación de add-ons, 409 si hay reservas). Contrato en `docs/api-services.md`.
- `booking-create.model.js` suma los minutos de los extras a `durationMinutes`; el catálogo de New booking trae `minutes`.
- Admin (`admin/src/app/pages/services/`): lista con dos vistas (Services / Add-ons) con el shell de tablas, filtros, orden en servidor y estado en la URL; página de servicio (`/services/:id`) con paquetes, detalles y add-ons permitidos; `/services/new`; diálogos de paquete, add-on y reordenar. Slice `slices/services`, API en `services/catalog.js`.
- New booking muestra "adds 30 min" en el extra y "Session length" en el resumen.

## Probado

curl contra el backend (altas, validaciones, 409 de servicio/paquete/add-on con reservas, reserva Party con 2 × 30 min = 150 min y $300), `eslint` y `vite build` limpios.
**Sin verlo en el navegador.**

## Ojo

- En la BD de desarrollo borré por error (al probar) servicios/paquetes del seed y los restauré con el seed: los ids cambiaron (Birthdays & parties ahora es 9, "Extra 30 minutes" es 5).
- El extra de 30 min todavía no bloquea el horario siguiente (duda abierta en `docs/nuevo-booking-admin.md`).
- Relacionado: [[2026-10-03-bookings-backend]].
