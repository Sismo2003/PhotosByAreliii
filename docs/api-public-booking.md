# API pública de `/book` — `/api/public/*`

Fecha: 2026-11-10. Sin sesión: la usa el formulario de la landing (`Frontend/src/views/BookView.astro` +
`Frontend/src/views/book/`). Reglas de negocio: `docs/formulario-publico-booking.md` y `database/handoff.md`
§4.4 (cliente que vuelve), §4.11 (disponibilidad), D5 (qué estados ocupan el horario).

Código: `Backend/routes/public.routes.js` → `controllers/public-booking.controller.js` →
`models/public-booking.model.js`, con `services/booking-pricing.js` (precio, compartido con el "New booking"
del admin) y `services/availability.js` (horarios libres, funciones puras). Validación:
`validators/public-booking.schemas.js` (yup) y la misma en el navegador (`Frontend/src/views/book/schema.ts`).

Respuestas con el sobre de siempre (`{ message, data, error }` / `{ error_message, message, error, details? }`).
Cuando el formulario tiene que reaccionar a un error concreto, `details.code` lo dice (tabla al final).

## `GET /api/public/catalog`

Servicios `LIVE` con al menos un paquete visible, sus paquetes (`hidden = false`), los extras activos de esos
servicios y los números de la vista previa. `Cache-Control: public, max-age=60`.

```json
{
  "services": [{ "id": 5, "slug": "birthdays-parties", "name": "Birthdays & parties",
    "packages": [{ "id": 7, "name": "Party", "priceCents": 18500, "durationMinutes": 90, "customDescription": "…", "isFeatured": false }] }],
  "extras": [{ "id": 2, "name": "Extra 30 minutes (party sessions)", "priceCents": 5000, "minutes": 30, "serviceIds": [5] }],
  "settings": { "depositPercent": 50, "replyWithinHours": 24, "policyVersion": 1 }
}
```

La landing traduce nombres por `slug` (servicio), por nombre de paquete (`"Couples"` empieza con la clave
`couples` de `shared/services.js`) y por extra (`outfit` / 30 minutos). Un servicio que la landing no
conoce sale con el nombre de la base y sin foto.

## `GET /api/public/availability?month=YYYY-MM&minutes=120`

Días del mes con horarios configurados (`AvailabilitySlot` del día de la semana), quitando `BlockedDate` y lo
que queda fuera de la ventana. `minutes` (15–720, por defecto 120) es la duración de la sesión elegida
(paquete + extras con minutos) y solo sirve para marcar los horarios en los que no cabe. `Cache-Control: no-store`.

```json
{ "month": "2026-11", "minMonth": "2026-11", "maxMonth": "2027-11",
  "days": [{ "date": "2026-11-17", "slots": [{ "time": "08:00", "label": "soft morning", "open": false }, { "time": "10:00", "label": null, "open": true }] }] }
```

- **Ventana**: desde *ahora + `StudioSettings.replyWithinHours`* (24 h: Areli tiene que poder responder antes)
  hasta 12 meses. Fuera de ella no se devuelve el día.
- **Ocupado** (`open: false`): se cruza con una reserva en `REQUEST`, `AWAITING_DEPOSIT` o `CONFIRMED`
  (`[inicio, inicio + duración)`, la de la reserva y la de la sesión que se pide). Un día sin ningún horario
  libre sale tachado en el calendario.

## `POST /api/public/bookings`

Crea la solicitud: `Booking` con `source = WEBSITE`, `status = REQUEST`. Cuerpo (campos desconocidos → 400):

| Campo | Notas |
|---|---|
| `lang` | `en` \| `es`: idioma del correo "Request received" y `Client.locale` si el cliente es nuevo |
| `website` | honeypot, tiene que ir vacío |
| `serviceId`, `packageId`, `extras: [{ extraId, quantity 1–10 }]` | el precio y la duración se calculan en el servidor |
| `startsAt` | `"2026-11-17T10:00"` en hora de Phoenix (sin offset) o ISO con offset; tiene que ser un horario ofrecido |
| `locationKind` | `PRESET` (Lost Dutchman), `STUDIO`, `CAMPUS` u `OTHER` |
| `locationName` | obligatorio para `CAMPUS` y `OTHER`; para `PRESET`/`STUDIO` el nombre lo pone el servidor (`PUBLIC_LOCATIONS`) |
| `firstName`, `lastName`, `email`, `phone` | obligatorios; teléfono válido con libphonenumber-js (US por defecto) |
| `partySize`, `heardFrom`, `schoolAndColors`, `photosNeededBy`, `inspo`, `sharePermission`, `doNotPostNotes`, `clientNotes`, `minorConsent` | opcionales; `schoolAndColors` solo se guarda en Graduation |
| `policyAccepted` | tiene que ser `true` |

Qué hace, en **una transacción**:

1. Bloquea la fila `studio_settings` (`SELECT … FOR UPDATE`): dos solicitudes no pueden tomar el mismo
   horario a la vez. Si la fila no existe (base recién creada) la crea con los valores por defecto.
2. Precio con `priceBooking(…, { bookableOnly: true })`: servicio `LIVE`, paquete visible, extras activos del
   servicio. `travelFeeCents = 0` (Areli suma traslados o cuotas antes de confirmar, como dice la pantalla).
3. Vuelve a comprobar el horario con la duración real → `409 SLOT_TAKEN` o `400 SLOT_NOT_OFFERED`.
4. Cliente que vuelve (§4.4), **sin modificar nunca el `Client` encontrado**:
   email → `EMAIL` (o `BOTH` si el teléfono es del mismo); solo teléfono → `PHONE`; email de uno y teléfono de
   otro → se une al del email, `CONFLICT`; nada → `Client` nuevo (`NEW`, con `heardFrom` y `locale`).
   Lo escrito queda en `contact*` de la reserva, y el admin muestra "Details changed" / el aviso del match.
5. `Booking` + `BookingExtra` (nombre y precio de una unidad congelados + cantidad), código `PBA-<id>`.
6. `ActivityEvent booking.requested` (`SYSTEM`) con `metadata.policyVersion` (la versión aceptada; no hay
   columna en `Booking`), `matchedBy`, `lang`, `heardFrom` y `clientHidden` (si se unió a un cliente oculto).
7. Correos en la misma transacción: `booking.request_received` **a la dirección escrita** y con el nombre
   escrito (una coincidencia por teléfono puede apuntar a otra persona) y `admin.new_request`.

Respuesta `201`: `{ code, firstName, email, startsAt (UTC), durationMinutes, serviceName, packageName,
locationKind, locationName, extras, totalCents, depositCents, replyWithinHours }`.

Si dos solicitudes nuevas con el mismo email/teléfono llegan a la vez, la segunda choca con el `unique`
(`P2002`) y se reintenta una vez: la segunda vuelta encuentra al cliente y se une a él.

## Límites

| Dónde | Regla |
|---|---|
| nginx (`deploy/nginx/pba.conf.template`) | `POST /api/public/bookings`: 3/min por IP, ráfaga 3, cuerpo ≤ 64 KB |
| Express (`routes/public.routes.js`) | envío: 8 por hora por IP (cuentan también los rechazados); lectura: 300 cada 5 min |

En memoria: se reinician al reiniciar la API. La IP es la real porque nginx sobrescribe `X-Forwarded-For`
y Express confía en un salto (`trust proxy 1`).

## Códigos de error (`details.code`)

| Código | HTTP | El formulario… |
|---|---|---|
| `SLOT_TAKEN` | 409 | vuelve al paso 2, recarga el mes y lo dice |
| `SLOT_NOT_OFFERED` | 400 | igual |
| `SERVICE_UNAVAILABLE`, `PACKAGE_UNAVAILABLE`, `EXTRA_UNAVAILABLE` | 400 | recarga el catálogo y vuelve al paso 1 |
| `PHONE_INVALID` | 400 | paso 4, error en el teléfono |
| `LOCATION_REQUIRED` | 400 | paso 3, error en el lugar |
| `RATE_LIMITED` | 429 | mensaje "demasiadas solicitudes" (también si el 429 viene de nginx, sin JSON) |
| — | 400 | validación de yup: mensaje genérico en el idioma de la página |
