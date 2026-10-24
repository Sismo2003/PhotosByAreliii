---
tema: admin
fecha: 2026-10-04
---

# Vista única de reserva (`/bookings/:id`)

## Qué se hizo

- **Una sola ruta para todas las etapas** — `admin/src/app/pages/bookings/booking/`. Reemplaza el drawer y
  las vistas `/bookings/requests/:id` y `/bookings/upcoming/:id` (esas rutas ahora redirigen:
  `admin/src/app/router/BookingRedirect.jsx`). Se borraron `BookingDrawer.jsx`, `detail/SessionDetail.jsx`,
  `request/` y `upcoming/`.
- **Estructura fija, contenido por etapa:** barra superior (volver a la pestaña de origen, anterior/siguiente,
  menú ⋯ con lo destructivo) → identidad → **barra de progreso animada de 6 pasos** → tarjeta **Next step** (un
  solo botón principal; los formularios se abren dentro) → cifras → bloques → cliente.
- **La tarjeta sale de `derived.nextStep`** (`booking/stage.js`): sin lógica nueva por etapa.
- **Volver** regresa a la pestaña de origen (`location.state.from`, o la de la reserva si se abrió directo).
- **Respeta Hairlines / Shadow** (`booking/layout.jsx`) y el contraste en oscuro.
- `confirmBookingThunk` ya no cierra la reserva: la página se queda y el progreso avanza a Deposit.

## Qué falta (otros módulos)

Agradecimiento y reseña por correo (Correos) y enlace directo a Galleries están como interruptores en
`booking/integrations.js`. Guía, contratos propuestos y dudas: `docs/bookings-page-integraciones.md`.

## Cambios posteriores

- **Pago de más con confirmación** y **regla de sesión pasada**: ver [[2026-10-04-ui-bookings-sesion]] y [[2026-10-04-regla-sesion-pasada]].

## Sin verificar

Compila y pasa lint, **pero no se vio en el navegador**.
