# `/book` de la landing — estado

Fecha: 2026-11-10 (antes, 2026-10-26: versión simple por SMS/correo/Instagram). Bitácora:
`wiki/landing/bitacora/2026-11-10-book-flujo-real.md`. API: `docs/api-public-booking.md`.

## Hecho

El flujo de 5 pasos del lienzo (`Booking`, `BookingDate`, `BookingLocation`, `BookingDetails`,
`BookingReview`, `BookingConfirmed`) en `/book/` y `/es/book/`. Crea una `Booking` con `source = WEBSITE`,
`status = REQUEST`; Areli la ve en Bookings → Requests y la confirma a mano.

- `Frontend/src/views/BookView.astro`: marcado estático (fotos incluidas) de los 5 pasos, el resumen lateral
  y la pantalla "Request sent". Los textos están en `book.*` de `src/i18n/{en,es}.json`.
- `Frontend/src/views/book/`: `book.ts` (controlador, sin framework: la CSP sigue en `script-src 'self'`),
  `api.ts`, `schema.ts` (yup + libphonenumber-js, mismas reglas que el backend), `sun.ts` (hora del atardecer
  calculada, "Sunset is at about…").
- Catálogo, precios y horarios vienen de la API; el resumen del navegador es solo vista previa.
- Extras con contador − / + (0–10), duración con los minutos de los extras.
- `?service=<slug>&package=<key>` sigue preseleccionando (todos los botones "Book" del sitio).
- Borrador en `sessionStorage` (sobrevive a recargar la pestaña; nunca la casilla de la política).
- Si la API no responde: la página ofrece SMS / correo / Instagram como antes.
- Si el horario se ocupa mientras la persona llena el formulario: vuelve al paso 2 con el aviso.

## Decisiones tomadas en esta sesión (cambiar con Alexis/Areli si no van)

- **Aviso mínimo** = `StudioSettings.replyWithinHours` (24 h): no se ofrecen horarios antes de que Areli
  pueda responder.
- **Horizonte** = 12 meses.
- **"Extra 30 minutes" sí alarga la sesión** y bloquea los horarios que pisa (duda 1 de
  `docs/formulario-publico-booking.md` §5, resuelta así porque el servidor ya calculaba la duración).
- **Traslado = $0** en la solicitud: el lienzo final dice "si un lugar cobra, se suma — te aviso antes de
  confirmar"; Areli lo ajusta en el admin. No se calcula por distancia (haría falta geocodificar).
- **Lugares**: Lost Dutchman (`PRESET`) y Studio llevan nombre fijo del servidor; Campus pide "¿Qué campus?";
  "Somewhere else" pide lugar o dirección.
- "¿Algo que no quieras que publique?" solo aparece con "Sí, pero no todas" o "No".

## Dudas abiertas

- ¿Se muestran en la confirmación los usuarios de Zelle/Cash App? (`PAYMENTS` en `shared/site.js` sigue vacío;
  hoy el texto dice que el correo explica cómo pagar.)
- Horarios reales de Areli (los 12 del seed son provisionales) y pantalla del admin para editarlos y para
  los días bloqueados (no existe; hoy solo por base de datos).
- `docs/formulario-publico-booking.md` §5, dudas 2 y 3.
