---
fecha: 2026-11-10
tema: landing
tipo: implementacion
---

# `/book` real: 5 pasos que crean la solicitud

Parte de [[landing]]. Pedido de Alexis: "crear todo el flujo" de `/book` siguiendo el procedimiento y la
base de datos, sin dejar bugs; quitar las dependencias sin uso de la landing; dejar `faltantes.txt` con lo
que falta del proyecto (sale de la auditoría del mismo día). Reemplaza la versión simple de
[[2026-10-26-landing-completa]].

## Qué se hizo

| Pieza | Dónde |
|---|---|
| API pública sin sesión: catálogo, horarios libres, crear solicitud | `Backend/routes/public.routes.js`, `controllers/public-booking.controller.js`, `models/public-booking.model.js`, `validators/public-booking.schemas.js` — contrato en `docs/api-public-booking.md` |
| Precio compartido admin ↔ público | `Backend/services/booking-pricing.js` (sale de `booking-create.model.js`, que ahora lo usa) |
| Horarios libres (funciones puras, Luxon) | `Backend/services/availability.js` |
| Correos `booking.request_received` y `admin.new_request` conectados (`wired: true`) | `Backend/emails/catalog.js`; `services/email/context.js` saluda con el nombre escrito en la solicitud |
| Límite en el borde | `deploy/nginx/pba.conf.template` (`pba_book`, 3/min) |
| Formulario | `Frontend/src/views/BookView.astro` + `Frontend/src/views/book/{book,api,schema,sun}.ts`; textos `book.*` en `src/i18n/{en,es}.json` (mismas claves); `.field-label`, `.field-input`, colores `off` y `danger` en `src/styles.css` |
| Dependencias | fuera React, axios, zustand, react-hook-form, @hookform/resolvers, @astrojs/react; `tsconfig.json` sin JSX |
| Docs | `docs/api-public-booking.md` (nuevo), `docs/landing-book-integracion.md` (reescrito), notas en `docs/formulario-publico-booking.md`, `handoff.md`, `Frontend/handoff.md` |

## Decisiones (y por qué)

- **Cliente que vuelve sin sobrescribir** (§4.4 de `database/handoff.md`): a diferencia del admin, que da 409
  en conflicto, el público **une y marca** (`EMAIL`/`BOTH`/`PHONE`/`CONFLICT`) para que Areli revise; nunca
  actualiza el `Client` (cualquiera puede escribir el email de otra persona).
- **El correo "Request received" va a la dirección escrita y con el nombre escrito**, no a los del cliente
  encontrado: en una coincidencia por teléfono puede ser otra persona.
- **Bloqueo `FOR UPDATE` sobre `studio_settings`** para serializar solicitudes y que dos personas no tomen el
  mismo horario. Precedente: `client-portal.model.js` (favoritos). Si la fila no existe, se crea.
- **Duración real** (paquete + minutos de extras) para decidir si un horario cabe; "Extra 30 minutes" sí
  alarga la sesión (resuelve la duda 1 de `docs/formulario-publico-booking.md`).
- **Aviso mínimo = `replyWithinHours`** (24 h) y horizonte de 12 meses. Decisión del agente; preguntar a Areli.
- **Traslado $0** en la solicitud (el lienzo final dice "te aviso antes de confirmar"); Areli lo suma.
- **Sin framework en el navegador** (como el resto de la landing): CSP `script-src 'self'` intacta.
  `yup` + `libphonenumber-js` + Luxon solo en `/book` (~250 KB sin comprimir).
- **La versión de la política** va en `ActivityEvent.metadata.policyVersion` (no hay columna en `Booking`),
  igual que el "New booking" del admin.
- **Nombres en el idioma de la página** por mapeo: servicio por `slug`, paquete por nombre (`"Couples"` ↔
  clave `couples`), extra por "outfit"/30 min. Lo que la landing no conoce sale con el nombre de la base.

## Verificado

| Qué | Cómo | Resultado |
|---|---|---|
| Sintaxis / import de la app | `node --check` de cada archivo; `import('./app.js')` como en CI | OK |
| Horarios | script con fechas fijas: solapamiento, día bloqueado, lunes, ventana de 24 h, 8:00+120 min junto a 10:00 | OK |
| POST, 19 casos | `curl` contra la API dev (MySQL Docker): nuevo, mismo horario (409), solapamiento (409), EMAIL, PHONE, CONFLICT, honeypot, hora no ofrecida, lunes, pasado, campo de precio (400), extra de otro servicio, paquete de otro servicio, cantidad 11, teléfono malo, política sin aceptar, lugar faltante, lugar con espacios | todos con la respuesta esperada |
| Base | `SELECT` de bookings, clients, booking_extras, activity_events, email_outbox | clientes existentes intactos; `contact*` como se escribió; extras con cantidad; eventos con `policyVersion` |
| Correos | Mailpit (dev) | EN y ES, saludo con el nombre escrito ("Otra" en una coincidencia por teléfono) |
| Admin | `BookingModel.listRequests` / `getDetail` | las 6 solicitudes aparecen; "Details changed" y `conflictWith` correctos |
| Refactor del precio del admin | `BookingCreateModel.create` con extras, traslado y ajuste | mismo total, duración y depósito |
| Formulario completo | jsdom + bundle de `book.ts` contra la API real, EN (fiesta + extras + otro lugar) y ES (graduación + campus) | 5 pasos, errores por campo, resumen, envío, pantalla final, borrador limpio |
| Carrera | otra solicitud toma el horario justo antes de enviar | vuelve al paso 2, aviso, horario limpio y marcado "Taken" |
| API caída | fetch a un puerto cerrado | muestra SMS / correo / Instagram |
| Tipos | `tsc --strict` sobre `views/book/*.ts` | 0 errores |
| Build | `astro build` | 25 páginas; solo `/_astro/*.js` y bloques JSON (CSP) |

## Sin verificar

- **Navegador real** (Alexis dijo que lo revisa él): diseño en 390 / 834 / 1280, modo táctil, foco y lector
  de pantalla, `has-[:checked]` en Safari viejo. Lighthouse y Rich Results Test tampoco.
- Docker de producción y nginx real (el `limit_req` nuevo no se probó en nginx).
- El bloqueo `FOR UPDATE` bajo carga real (solo se probó la secuencia, no dos peticiones simultáneas).

## Trampas

- En dev la tabla `availability_slots` estaba **vacía** (y no había fila `studio_settings`): sin horarios
  `/book` no ofrece nada. Se insertaron los 12 horarios provisionales del seed (autorizado por Alexis).
- Datos de prueba que quedaron en la BD dev (Alexis pidió no borrarlos): solicitudes `PBA-0003`…`PBA-0011`,
  la manual `PBA-0012`, clientes `*@example.com`, y sus correos en Mailpit.
- Para probar varios POST seguidos en dev hay que variar `X-Forwarded-For` (límite de 8/h por IP); en
  producción nginx lo sobrescribe, así que no se puede saltar desde fuera.
- jsdom: su `AbortSignal` no sirve con el `fetch` de Node; en la prueba se quitó el `signal`.
