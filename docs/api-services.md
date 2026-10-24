# API de Services y Add-ons (admin) — contrato

El catálogo de lo que **Areli ofrece**: servicios, paquetes y add-ons. Alimenta "New booking" y
`/book`; **no tiene nada que ver con las páginas de la landing** (su texto y sus fotos viven en el
código del frontend, decisión del 2026-10-05). Rutas bajo `/api/admin/services` y
`/api/admin/extras`, con `requireAdmin`, sobre el estándar `{ message, data, error }` /
`{ error_message, message, error: true, details? }`. Dinero en **centavos**. Código:
`Backend/models/service.model.js`, `Backend/models/extra.model.js`,
`Backend/validators/service.schemas.js`. Pantalla: `admin/src/app/pages/services/`.

## Qué cambió en la BD (migraciones `20261006015552_…` y `20261006020000_…`)

- `Service` pierde `cardLine`, `intro`, `includesLine`, `ctaWord` y `fromPackageId` (eran copy y precio "desde" de la landing).
- `Extra.minutes` (nuevo): minutos que **cada unidad** añade a la sesión. "Extra 30 minutes" = 30; "Extra outfit change" = 0.
- El PDF de precios lo pide así: *"every 30 mins. added is +$50"*, solo en las sesiones de fiesta (Party). Por eso el extra solo está asignado a Birthdays & parties.
- `Service.status`: `LIVE` ahora significa "se puede reservar" (antes "en el sitio").

## Regla de duración

`Booking.durationMinutes = package.durationMinutes + Σ(extra.minutes × quantity)` (se congela al reservar, igual que el precio).
Party 90 min + 2 × "Extra 30 minutes" = 150 min, total $185 + $100. Aplica a `POST /api/admin/bookings`
(`booking-create.model.js`); `GET /bookings/new/catalog` ahora trae `minutes` en cada extra. El endpoint público de `/book`
debe usar la misma suma (ver `docs/formulario-publico-booking.md`).

## Services — `/api/admin/services`

| Ruta | Qué hace |
|---|---|
| `GET /active` | `[{ id, name, slug }]` de los `LIVE` (filtro de Bookings). |
| `GET /options` | `[{ id, name, status }]` de todos (selectores). |
| `GET /summary` | `{ services, live, packages, extras, activeExtras, counts{all,LIVE,HIDDEN,DRAFT} }`. |
| `GET /?q&status&sort&dir&page&pageSize` | Lista. Sin `sort` = orden de Areli (`position`); `sort=name\|price\|bookings` + `dir`. Cada fila: `packageCount`, `hiddenPackageCount`, `fromCents`/`toCents` (paquetes visibles), `extraCount`, `bookingCount`. |
| `POST /` | `{ name, status? }` (por defecto `DRAFT`). El `slug` se genera del nombre y no se edita. |
| `GET /:id` | Servicio + `packages[]` (con `bookingCount`) + `extras[]` (todos los add-ons con `offered`). |
| `PATCH /:id` | `{ name?, status? }`. Responde con el servicio. |
| `DELETE /:id` | 409 si hay reservas (`details.bookingCount`): "N bookings use this service, so it can be hidden but not deleted". Sin reservas borra también sus paquetes. |
| `PUT /order` | `{ ids }` con **todos** los servicios en el nuevo orden. |
| `PUT /:id/extras` | `{ extraIds }`: reemplaza qué add-ons permite el servicio. |

### Paquetes

| Ruta | Qué hace |
|---|---|
| `POST /:id/packages` | `{ name, priceCents, durationMinutes, outfits?, maxPeople?, sessionCount?(1\|2), customDescription?, isFeatured?, hidden? }`. Duración 15–720 en pasos de 5. Nombre único por servicio (409). |
| `PATCH /packages/:packageId` | Lo mismo, solo lo que cambió. `isFeatured: true` quita "Most booked" a los demás del servicio. |
| `DELETE /packages/:packageId` | 409 si hay reservas: solo se puede ocultar (`hidden`). |
| `PUT /:id/packages/order` | `{ ids }` con todos los paquetes del servicio. Responde con el servicio. |

## Add-ons — `/api/admin/extras`

| Ruta | Qué hace |
|---|---|
| `GET /?q&active=yes\|no&serviceId&sort&dir&page&pageSize` | Lista con `serviceIds[]`, `minutes`, `bookingCount`. |
| `POST /` | `{ name, priceCents, minutes?(pasos de 5), active?, serviceIds? }`. Nombre único (409). |
| `GET /:id`, `PATCH /:id` | Lectura y edición parcial. |
| `DELETE /:id` | 409 si alguna reserva lo usó: solo se apaga (`active: false`). |
| `PUT /:id/services` | `{ serviceIds }`: reemplaza dónde se ofrece (tabla puente `ExtraService`). |
| `PUT /order` | `{ ids }` con todos los add-ons. |

## Qué NO cambia al editar el catálogo

Las reservas guardan `serviceNameSnapshot`, `packageNameSnapshot`, `packagePriceCents`, `durationMinutes` y por extra
`nameSnapshot`/`priceCentsSnapshot`/`quantity`. Cambiar un precio o un nombre solo afecta reservas nuevas.

## Pendiente para el siguiente agente

- El endpoint público de `/book` (aún no existe) debe leer este catálogo: `LIVE`, paquetes con `hidden: false`, extras `active` asignados al servicio, y sumar `minutes` a la duración.
- `Extra "30 min"` todavía **no bloquea** el horario siguiente: ver la duda 1 de `docs/nuevo-booking-admin.md`. Ahora al menos la duración guardada es correcta.
- Nada de esto probado en el navegador todavía (solo curl y build/lint).
