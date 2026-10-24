---
tema: admin
fecha: 2026-10-03
---

# Bookings — arreglo de tres bugs del drawer y filtros

Tres arreglos para que el Bookings Requests use bien el backend nuevo y deje de mostrar el
panel "Details changed" en cada reserva.

## Qué se hizo

### 1. `BookingDrawer.jsx` usa `booking.detailChanges` del backend

Antes `isDetailsChanged(booking)` hacía en el cliente `booking.contactPhone.replace(/[^0-9+]/g, "")`
y comparaba contra `c.phoneE164`. Eso fallaba en cuanto había cualquier carácter no numérico
distinto (espacios, paréntesis con formato distinto al que se guardó), y disparaba "Details
changed" en casi todos los bookings. Reemplazado por `booking.detailChanges`, que es el array
que computa `BookingModel.detailChanges(booking)` y que ya devuelve el endpoint
`GET /api/admin/bookings/:id` ([`booking.model.js:57`](../../Backend/models/booking.model.js)).

Forma: array de `{ field: 'email' | 'name' | 'phone', from, to }`. Si el array está vacío, no se
muestra el panel.

Eliminé `isDetailsChanged` y `describeChanges` y agregué `describeDetailChanges(changes)` que
pinta `email X → Y`, `name X → Y`, `phone (480) 555-0100 → +1 480 555 0100`.

### 2. Ocultar "Not the same person" cuando la coincidencia es CONFLICT

Cuando el match es CONFLICT, Areli ya ve el perfil del otro cliente (`conflictWith`) más el
panel "Details changed" — tiene la info que necesita para decidir. "Not the same person"
(crear un Client nuevo) era confuso y nunca se usa en ese flujo. Solo se muestra para PHONE.
[BookingDrawer.jsx:163-188](../../admin/src/app/pages/bookings/BookingDrawer.jsx)

### 3. Filtro de Service compara `row.original.serviceId`

El toolbar pasa al `FacedtedFilter` opciones con `value: String(s.id)`, pero el column accessor
devolvía `${row.serviceNameSnapshot}${row.packageNameSnapshot ? ' — ' + ... : ''}`. La
comparación `value.includes(String(cellValue))` buscaba el id (`"3"`) dentro de un string con
el nombre (`"Graduation — Classic"`) → nunca encontraba match, el filtro parecía no hacer
nada.

Cambiado el accessor a `(row) => row.serviceId`. La celda sigue mostrando el nombre (via
`ServiceCell`); el sort lo cambié a `sortingFn` que compara por `serviceNameSnapshot` para
mantener el orden alfabético.
[columns.js:55-72](../../admin/src/app/pages/bookings/columns.js)

### 4. dev seed

`database/seeds/dev-seed.js` (nuevo, destructivo: wipea y reseedea las tablas dev, conserva
admin/servicios/settings/availability). 45 bookings, **40 pasados + 5 futuros**, distribución:

| status | n |
|---|---|
| REQUEST | 6 (NEW, EMAIL, PHONE, CONFLICT, BOTH+Details changed, MANUAL) |
| AWAITING_DEPOSIT | 5 (3 pasados + 2 futuros) |
| CONFIRMED | 23 (20 pasados + 3 futuros) |
| DECLINED | 3 |
| CANCELLED | 5 |
| EXPIRED | 3 |

Cubre todas las tablas: 16 clients, 8 galleries, 16 sets, 288 photos, 27 favorites, 39 payments,
4 rebook reminders, 105 activity events, 2 blocked dates, 2 password reset tokens, 2 email
templates + 2 versions, 1 outbox, 1 inbound, 13 booking extras.

Ejecutar: `cd database && npm run prisma:dev-seed`.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| El panel "Details changed" lo decide el backend, no el cliente | usuario | La regex del cliente comparaba teléfonos mal formateados y disparaba siempre |
| Ocultar "Not the same person" cuando match=CONFLICT | usuario | El flujo CONFLICT ya muestra ambos perfiles + acción de "Update/Keep" |
| El filtro de Service compara por id (no por nombre) | agente | Los options del toolbar son {value: id, label: name}; tiene que matchear id contra id |
| Dev seed destructivo sobre tablas dev | agente | Reproducible; permite reset rápido durante desarrollo |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Lint | `npm run lint` → 0 errores, 2 warnings preexistentes |
| Build | `npm run build` → OK |
| Backend `GET /api/admin/bookings/:id` | curl contra los 4 casos de match (NEW, PHONE, CONFLICT, BOTH). `detailChanges` populated y `conflictWith` devuelve María para CONFLICT |
| Visualmente el drawer | No probado — preferencia de no usar navegador |

**Lo que NO está verificado:**

- El flujo "Not the same person" → crea nuevo Client → linkea el booking (no probado
  end-to-end porque la pantalla no se ha abierto en el navegador; el endpoint `resolveMatch`
  sí está implementado en el backend).

## Trampas descubiertas

- Luxon `DateTime.plus({ days: N })` suma, `minus` resta. La primera versión del dev seed
  metió los `daysAgo` (positivos) con `plus`, así que las fechas quedaron todas en 2027.
- `Schema.Client.phoneE164 @unique` impide tener dos Clients con el mismo phoneE164 — los
  escenarios PHONE y CONFLICT no se crean con dos Clients previos, sino con un booking
  cuyo `contactPhone` (campo libre, no unique) matchea con el del otro. La detección
  server-side compara contactPhone normalizado contra `Client.phoneE164`.
- El filterFn `arrIncludesSome` del template nunca estuvo definido como string; en su lugar
  se pasa por referencia en `columns.js`. El `FacedtedFilter` guarda un array de `valueField`s
  y el `filterFn` tiene que convertir el cell value a string antes de `includes`.
- `BookingDrawer.isDetailsChanged` usaba `replace(/[^0-9+]/g, "")` para normalizar — pero el
  `Client.phoneE164` viene de libphonenumber-js (`+14805550100`), no de esa regex. El
  backend ya normaliza con `toE164()` y devuelve el resultado del diff en `detailChanges`.

## Siguiente paso

1. Confirmar visualmente con el usuario cuando abra el navegador (no lo abrimos por
   preferencia del usuario).
2. El siguiente `wireMock`-style check: que los 4 escenarios de match se vean correctos
   en el drawer cuando Areli abra `/bookings` con datos reales.
3. Construir las otras pestañas (Upcoming / Follow-up / Done / Expired).

---

Relacionado: [[admin]] · [[base-de-datos]] · [[2026-10-03-bookings-requests]]