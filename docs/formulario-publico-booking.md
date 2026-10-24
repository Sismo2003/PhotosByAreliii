# Formulario público `/book` — instrucciones para el agente

Fecha: 2026-10-04 · Para el agente que construya (o ajuste) el formulario público de reservas
del sitio. Lee primero `database/handoff.md` §4.4 (Booking, "Cliente que vuelve") y §4.11
(disponibilidad), y `docs/nuevo-booking-admin.md` (el equivalente del panel).

## 1. Cambio nuevo: **varios cambios de ropa** (y cualquier extra con cantidad)

El cliente puede pedir **más de un** "Extra outfit change" (+$15 cada uno). La BD ya lo soporta:

- `BookingExtra.quantity Int @default(1)` (migración `add_booking_extra_quantity`).
- `BookingExtra.priceCentsSnapshot` es el precio de **una** unidad; la línea vale
  `priceCentsSnapshot × quantity`.
- `Booking.totalCents` incluye `Σ(priceCentsSnapshot × quantity)`.

Qué hacer en `/book` paso 1 ("Extras — optional"):

1. En lugar de una casilla "Extra outfit change", usa un **contador − / + (0 a 10)** por extra, como
   el del admin (`admin/src/app/pages/bookings/new/SessionSection.jsx`, componente `Stepper`).
   Muestra el subtotal de la línea ("Extra outfit change × 3 · $45").
2. "Extra 30 minutes" (+$50, solo Birthdays & parties) usa el mismo contador (cada media hora
   adicional suma $50).
3. Envía `extras: [{ extraId, quantity }]` (cantidades enteras 1–10; no mandes las de 0).
4. El servidor **ignora cualquier precio** que mande el navegador: recalcula con el catálogo
   (`StudioSettings`, `Package`, `Extra`). El resumen del formulario es solo vista previa.
5. En el resumen, el paso de revisión y los correos muestra la cantidad (`× 3`). Las pantallas
   del admin que listan extras ya deben mostrar `quantity` cuando sea mayor que 1.
6. El tope (10) vive en `MAX_EXTRA_QUANTITY` (`Backend/validators/booking.schemas.js`); si se
   cambia, cambiarlo también en el contador.

## 2. Campos del formulario público (orden de los pasos)

| Paso | Campos → columna |
|---|---|
| 1 Sesión | servicio → `serviceId`; paquete → `packageId`; extras con cantidad → `BookingExtra` |
| 2 Fecha | día + hora → `startsAt` (America/Phoenix, Luxon); solo horas disponibles (§4.11) |
| 3 Lugar | `locationKind`, `locationName`, `locationAddress`; "farther adds $1 per mile" → `travelFeeCents` |
| 4 Tus datos | `contactFirstName`, `contactLastName`, `contactEmail`, `contactPhone` (libphonenumber-js, US por defecto); "How many people?" → `partySize`; `schoolAndColors` (solo Graduation); `clientNotes`; `inspo`; `photosNeededBy`; `sharePermission` + `doNotPostNotes`; consentimiento de menores → `minorConsentAt`; "How did you find me?" → `Client.heardFrom` |
| 5 Revisión | política aceptada → `policyAcceptedAt` (guardar también `bookingPolicyVersion`) |

Estado inicial de lo que llega del sitio: `source = WEBSITE`, `status = REQUEST` (Areli confirma a
mano). El formulario público **nunca sobrescribe `Client`** (§4.4): si los datos difieren, el
admin ve "Details changed".

## 3. Lo que **NO** va en el formulario público

Es solo del panel de admin (`/bookings/new`):

- registrar un **pago recibido** (depósito o pago completo) y su método;
- el **ajuste** manual de precio y las **notas privadas** (`Booking.privateNotes`,
  `Client.privateNotes`);
- elegir un cliente existente, editar sus datos, o crear la reserva ya en `AWAITING_DEPOSIT` /
  `CONFIRMED`;
- el cargo por traslado escrito a mano (en público se calcula a partir de la distancia).

## 4. Reutilizar lo que ya existe

- Validación: yup en el navegador **y** otra vez en el servidor (`Backend/validators/`).
- Cálculo de precios: `Backend/models/booking-create.model.js` (`create`) — extrae a un servicio
  compartido (`services/booking-pricing.js`) cuando exista el endpoint público para no duplicar la
  fórmula.
- Fechas con Luxon, teléfonos con libphonenumber-js (reglas del `CLAUDE.md`).
- Cliente que vuelve: buscar por email y por `phoneE164`; si ambos apuntan a clientes distintos →
  `clientMatchedBy = CONFLICT` (se enlaza por email y Areli revisa).

## 5. Dudas abiertas

1. ¿"Extra 30 minutes" debe alargar la hora de fin que se muestra y bloquear el horario siguiente?
2. ¿Máximo de cambios de ropa por servicio (hoy 10 para todos)?
3. ¿El correo de solicitud recibida muestra el desglose de extras con cantidad? (`docs/correos.md`)

## Duración con add-ons de minutos (2026-10-05)

"Extra 30 minutes" ahora tiene `Extra.minutes = 30`. La duración de la reserva es
`package.durationMinutes + Σ(extra.minutes × quantity)`; el servidor la calcula (como el precio) y el
formulario solo la muestra de vista previa. Ver `docs/api-services.md`.
