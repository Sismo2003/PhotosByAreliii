---
tema: admin
fecha: 2026-10-03
---

# Bookings — backend de Requests revisado y probado

Se rehízo el backend de la pestaña Requests de Bookings. La primera versión rompía la regla de
Luxon y agrupaba el calendario en UTC. También se agregó el endpoint de servicios que el
filtro del admin ya llamaba.

## Qué se hizo

| Archivo | Cambio |
|---|---|
| `Backend/models/booking.model.js` | Reescrito. Luxon en todo; "hoy" y los días del calendario en `America/Phoenix`. Confirm y decline en transacción, junto con su `ActivityEvent`, y solo si la reserva sigue en `REQUEST` (`updateMany` con `status: 'REQUEST'`; si no, 409). Plazo del depósito desde `StudioSettings.depositDueHours`. `getDetail` devuelve `booking.detailChanges` = `[{ field, from, to }]`. |
| `Backend/controllers/booking.controller.js` | Valida id, `serviceId`, `dateFrom`/`dateTo` (día de Phoenix o instante ISO), `month` y el motivo de rechazo (obligatorio, ≤ 500). |
| `Backend/utils/http.js` (nuevo) | `HttpError`, `sendError` (un 500 no devuelve el mensaje interno) y `parseId`. |
| `Backend/utils/date.js` | `nowInStudio`, `toStudio`, `studioDayKey`, `studioMonthRange`, `parseDayBound`. |
| `Backend/{models,controllers,routes}/service.*.js` (nuevos) | `GET /api/admin/services/active`: servicios `LIVE` `{ id, name, slug }` por `position`. Montado en `Backend/app.js`. |

## Decisiones (del agente; el usuario puede cambiarlas)

| Decisión | Por qué |
|---|---|
| "Awaiting first reply" = REQUEST sin ningún `EmailOutbox` y sin eventos `ADMIN` | Antes contaba "más de 24 h y `matchReviewedAt` nulo", que no mide si se le contestó. |
| `not_same` solo para coincidencia PHONE (CONFLICT → 409) | En CONFLICT la reserva está ligada por email, que es único y es el login: no se puede crear otro cliente con ese email. |
| El cliente creado por `not_same` guarda `phone` pero **no** `phoneE164` | `phoneE164` es único y pertenece al cliente con el que coincidió. |
| Sin email en la solicitud, `not_same` → 400 | La versión anterior inventaba `unknown+<id>@pending.local`. |
| `update_client` → 409 "This phone/email belongs to X" si choca con otro cliente | Regla de `database/handoff.md` §4.4. |
| "Keep" queda como evento `booking.details_kept`; "Update client" como `client.updated` | No hay columna para eso; con cualquiera de los dos eventos, `detailChanges` sale vacío y el aviso desaparece. |
| Eventos nuevos: `booking.match_reviewed`, `booking.details_kept` | Faltan en la lista de `database/handoff.md` §5. |

## Verificado vs. no verificado

Con `curl` contra `node server.js` y una cookie JWT firmada con el `JWT_SECRET` local (sin
tocar la contraseña del admin):

| Prueba | Resultado |
|---|---|
| Sin cookie | 401 en las dos rutas |
| `services/active` | 6 servicios |
| `requests` (+ `q`, `serviceId`, fechas) | 6 requests; resumen `{ total 6, today 0, awaitingReply 6, returning 5 }` |
| Entradas malas (`dateFrom=nope`, `month=2026-13`, id `abc`, id inexistente) | 400, 400, 400, 404 |
| Calendario 2026-10 | Las sesiones de 5:15 PM del 2 oct (00:15Z del 3) caen en el **2**, como debe ser |
| Detalle PHONE / CONFLICT / EMAIL | `detailChanges` correcto; CONFLICT trae `conflictWith` (María González) |
| `update_client` en CONFLICT | 409 "This phone belongs to María González" |
| `not_same` en CONFLICT / en PHONE | 409 / crea un cliente nuevo y mueve la reserva |
| `looks_right` en NEW, acción inválida | 409, 400 |
| `keep`, confirm, confirm otra vez, decline sin motivo, decline | OK, OK (vence "Mon Oct 5 at 12:01 AM" Phoenix), 409, 400, OK |

Los datos de desarrollo se restauraron después con `node seeds/dev-seed.js` (los ids cambian).

**No verificado:** el admin en el navegador contra este backend, y el login real desde la
pantalla.

## Trampas

- El cliente que crea `not_same` no tiene `phoneE164`. Hay que comparar contra
  `c.phoneE164 ?? toE164(c.phone)`; si no, `detailChanges` marca "phone" con el mismo número
  (se encontró y se arregló en las pruebas).
- MySQL compara sin distinguir mayúsculas (collation), así que `contains` no lleva `mode`.

---

Relacionado: [[admin]] · [[base-de-datos]] · [[2026-10-03-bookings-requests]] · [[2026-10-03-bookings-details-fixes]]
