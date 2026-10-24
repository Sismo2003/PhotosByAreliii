# Nueva reserva desde el admin (`/bookings/new`)

Fecha: 2026-10-04 · Decisiones del usuario (Alexis). Para quien toque este formulario, el
formulario público `/book` o la ficha del cliente. Relacionado: `docs/api-bookings.md`,
`docs/formulario-publico-booking.md`, `database/handoff.md` §4.4.

## 1. Qué es

Un solo formulario, en una sola página con 5 secciones numeradas y un resumen fijo, que **da de
alta al cliente (o reutiliza el que ya existe) y crea su reserva**. Código en
`admin/src/app/pages/bookings/new/`. Se llega con el botón **New booking** de Bookings; la
flecha `←` vuelve a la pantalla anterior.

| # | Sección | Campos (columna de BD) |
|---|---|---|
| 1 | Client | buscador de clientes · `firstName`, `lastName`, `displayName`, `email`, `phone` (+`phoneE164`), `instagram`, `heardFrom`, `Client.privateNotes` |
| 2 | Session | `serviceId`, `packageId`, extras con cantidad (`BookingExtra.quantity`), `partySize`, `schoolAndColors` (solo Graduation) |
| 3 | When and where | fecha + hora (`startsAt`, zona America/Phoenix), `locationKind`, `locationName`, `locationAddress`, `travelFeeCents` |
| 4 | Details | `clientNotes`, `inspo`, `photosNeededBy`, `sharePermission`, `doNotPostNotes`, `minorConsentAt`, `policyAcceptedAt` |
| 5 | Price and payment | `adjustmentCents`, `Booking.privateNotes`, pago recibido ahora (ninguno / depósito / completo + método) |

## 2. Borrador en el navegador (30 minutos)

- Todo lo que se escribe se guarda en `localStorage` (clave `pba:new-booking-draft:v1`) y se
  restaura al recargar o volver. **Caduca 30 minutos después del último cambio.**
- El botón **Clear form** borra el borrador y deja el formulario vacío.
- Al crear la reserva con éxito el borrador se elimina.
- `localStorage` puede fallar (ventana privada): el formulario sigue funcionando sin guardar.
- Código: `useBookingDraft.js`.

## 3. Reglas del servidor (`POST /api/admin/bookings`)

Todo en una transacción (`models/booking-create.model.js`). **Los precios nunca se leen del
cuerpo**: el servidor toma paquete, extras y `StudioSettings` del catálogo y recalcula.

- `total = packagePriceCents + Σ(extra.priceCents × quantity) + travelFeeCents + adjustmentCents`
  (nunca negativo). `deposit = round(total × depositPercent / 100)`.
- `source = MANUAL`. Estado inicial `AWAITING_DEPOSIT` (con `confirmedAt` y
  `depositDueAt = ahora + depositDueHours`); si se registró un pago que cubre el depósito →
  `CONFIRMED`.
- Pago al crear (**solo admin**): `NONE` · `DEPOSIT` (crea el `Payment` DEPOSIT por el depósito) ·
  `FULL` (DEPOSIT por el depósito + BALANCE por el resto, mismo método).
- `code = PBA-<id con 4 dígitos>`; `startsAt` debe ser futuro; el extra debe estar activo y
  asignado al servicio (`ExtraService`); cantidad 1–10 por extra.
- `policyAcceptedAt = ahora` (casilla obligatoria); la versión de la política va en el
  `metadata` del evento `booking.created_manual` (no hay columna para ella).
- Eventos: `booking.created_manual` y, según el caso, `client.created` / `client.updated`.
- Endpoints de apoyo (antes de `/:id`): `GET /new/catalog`, `GET /new/clients?q=`,
  `GET /new/client-lookup?email=&phone=`.

## 4. Cliente que ya existe (decisión del usuario, 2026-10-04)

> Si el correo **o** el teléfono ya existen, la reserva es de **ese cliente**.

- **Desde el formulario se pueden actualizar** los datos del cliente existente: nombre, apellido,
  nombre para mostrar, Instagram, "cómo nos encontró" y notas privadas. Si cambia algo se guarda
  un evento `client.updated` con el antes y el después.
- **El correo y el teléfono NO se editan aquí** (aparecen de solo lectura). Si hay que
  cambiarlos, se hace **directamente desde el resumen del cliente** (pantalla Clients).
- En la interfaz: al escribir un correo/teléfono ya registrado, el cliente se carga solo y se
  avisa ("Found by email…") con el botón *Not them · start over*. También se puede buscar por
  nombre, correo o teléfono arriba de la sección.
- Si el correo es de un cliente y el teléfono de otro → 409, hay que elegir el correcto.
- **Cliente nuevo: correo y teléfono son obligatorios** (2026-10-09). Si el teléfono ya está
  registrado con **otro** correo → 409 "This phone number is already registered with another email
  (a***@…). Please try again with that email. If you'd like to change it, contact the business…";
  no se carga ni se toca al otro cliente. Sin `clientId`, un cliente encontrado por coincidencia no se
  modifica con lo que se escribió aquí.
- Una reserva manual de un cliente existente guarda `clientMatchedBy` (`EMAIL`/`PHONE`/`BOTH`) y
  `matchReviewedAt = ahora` (el admin lo eligió, no hay nada que revisar).

### Pendiente para el agente de **Clients** (resumen del cliente)

Al construir la pantalla Clients:
1. Debe existir la acción **editar correo y teléfono** del cliente (aquí vive el cambio de
   identificadores; `Client.email` es también el login — ver `database/handoff.md` §4.4 y D14).
2. Validar unicidad (`email`, `phoneE164`) con 409 indicando quién lo tiene — mismo patrón que
   `assertFreeForClient` en `models/booking.model.js`.
3. Teléfono con `libphonenumber-js` (`phone` como se escribió, `phoneE164` normalizado).
4. Registrar un `ActivityEvent` `client.updated` con el antes y el después.
5. Decidir qué pasa con el login si cambia el correo (¿aviso al cliente?) — **duda abierta**.

## 5. Integraciones pendientes

- **Correo de confirmación al cliente** — `INTEGRATION(newBookingEmail)` en
  `booking/integrations.js` y en `new/Summary.jsx` (interruptor deshabilitado). El docs
  `correos.md` lista "New booking (manual) → `booking.created_manual`". Cuando exista el envío:
  crear la fila en `EmailOutbox` **en la misma transacción** que la reserva y activar el
  interruptor (`ready: true`).

## 6. Dudas abiertas (las resuelve el agente que las toque)

1. **Duración del extra "30 min más" (+$50, Birthdays & parties).** `Extra` no tiene
   `durationMinutes`, así que `Booking.durationMinutes` es solo la del paquete. Decidir si el
   extra alarga la sesión (y si el aviso de "mismo día" debe considerarla).
2. **Varios cambios de ropa en reservas viejas.** `quantity` nace con valor 1; las reservas
   anteriores quedan como 1 cambio, que es lo que eran.
3. **Lugares frecuentes.** No hay tabla de lugares (solo `locationKind` + texto libre). Si se
   quieren atajos ("Lost Dutchman"), hace falta decidir dónde se guardan.
4. **Disponibilidad.** El formulario solo avisa si ya hay otra sesión ese día; no bloquea ni
   valida contra `AvailabilitySlot`/`BlockedDate` (aún no existen).
5. **Cargo por traslado.** Se escribe a mano; `freeTravelMiles`/`travelFeePerMileCents` ya vienen
   en el catálogo para calcularlo cuando haya una distancia.
6. **Sesión en el pasado.** Hoy se rechaza ("tiene que ser futura"); si Areli quiere registrar
   sesiones que ya ocurrieron, habría que permitirlo y decidir el estado inicial.
