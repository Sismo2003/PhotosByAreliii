# API de Bookings (admin) — contrato

Contrato entre `Backend/` y `admin/` para la página Bookings. Todas las rutas van bajo
`/api/admin/bookings`, con `requireAdmin` (cookie `pba_token`), y usan el sobre del skill
`backend`: `{ message, data, error: false }` o `{ error_message, message, error: true }`.

Fuente de las reglas: `database/handoff.md` §4.4, §4.5 y §5.1–5.2. Diseño:
`AdminBookings*.dc.html` en el lienzo (un mismo prototipo con distinto estado inicial).

- Dinero: siempre **centavos enteros** (`*Cents`).
- Fechas: ISO UTC en la API; "hoy", "esta semana" y "pasada" se calculan en `America/Phoenix`
  con Luxon (`Backend/utils/date.js`).
- Sesión **activa** = `AWAITING_DEPOSIT` o `CONFIRMED`. **Pasada** = `startsAt` ya ocurrió
  (antes del instante actual; cambio 2026-10-04: antes era "antes del inicio de hoy", y una sesión de hace 4 horas seguía en Upcoming sin mostrar el siguiente paso).

## 1. Pestañas

| `tab` | Regla | Orden |
|---|---|---|
| `requests` | `status = REQUEST` | `createdAt` asc |
| `upcoming` | activa y no pasada | `startsAt` asc |
| `followup` | activa, pasada y `archivedAt` nulo | `startsAt` desc |
| `done` | activa, pasada y con `archivedAt` | `startsAt` desc |
| `expired` | `status = EXPIRED` | `startsAt` desc |
| `cancelled` | `status IN (CANCELLED, DECLINED)` | `startsAt` desc |

## 2. Lecturas

### `GET /summary`

```json
{ "requests": 6, "sessionsThisWeek": 3, "paymentsPendingCents": 41250, "followupsDue": 4,
  "counts": { "requests": 6, "upcoming": 5, "followup": 7, "done": 16, "expired": 3, "cancelled": 8 } }
```

- `sessionsThisWeek`: activas con `startsAt` desde hoy hasta hoy + 6 días (Phoenix), inclusive.
- `paymentsPendingCents`: suma, sobre las activas, de `total − pagado` si la sesión ya pasó, o
  `max(0, depósito − pagado)` si es futura.
- `followupsDue`: reservas de `followup` cuyo `nextStep.tone` es `alert` o `pending`.

### `GET /?tab=&q=&serviceId=&page=&pageSize=`

`tab` obligatorio (uno de §1; `requests` también funciona aquí). `q` busca en código, nombre,
email y teléfono (como `/requests`). `pageSize` ≤ 100.

```json
{ "items": [BookingRow], "total": 12, "page": 1, "pageSize": 25 }
```

`BookingRow` = las columnas de `Booking` + `client` (id, displayName, firstName, lastName, email,
phone, phoneE164) + `extras` (nameSnapshot, priceCentsSnapshot) + `gallery` (id, status,
deliveredAt, expiresAt o `null`) + **`derived`**:

```json
{
  "tab": "followup",
  "isPast": true,
  "paidCents": 8000, "balanceCents": 8000, "depositPaid": true,
  "depositOverdue": false,
  "lastPaymentMethod": "ZELLE",
  "payment": { "key": "balance_due", "tone": "alert" },
  "status":  { "key": "collect_balance", "tone": "alert" },
  "nextStep": { "key": "collect_balance", "tone": "alert", "dueOn": null },
  "galleryState": { "key": "none|editing|editing_overdue|delivered|expired", "tone": "pending", "dueOn": "2026-10-16", "daysLeft": null },
  "canArchive": false,
  "sameDayConflict": null
}
```

Claves (las etiquetas en inglés las pone el admin):

- `payment.key`: `none_cancelled` (sin pago) · `deposit_kept` (cancelada/vencida con pago) ·
  `no_deposit_yet` (request) · `paid_in_full` · `deposit_paid` (futura) · `balance_due` (pasada) ·
  `deposit_due` · `deposit_overdue`.
- `status.key`: `cancelled` · `declined` · `expired` · `new_request` · `done` (pasada archivada) ·
  `awaiting_deposit` · `confirmed` · y, si es pasada sin archivar, la misma clave que `nextStep`.
- `nextStep.key` (solo pasadas activas; si no, `null`), en este orden: `collect_balance` ·
  `create_gallery` · `deliver_gallery` / `deliver_gallery_overdue` (vence a los
  `StudioSettings.galleryDeliveryDays` días de la sesión) · `send_thanks` · `ask_review` ·
  `waiting_review` (tono `muted`) · `set_rebook` (si no hay `RebookReminder` sin `doneAt`) ·
  `ready_to_archive` (tono `done`).
- `tone`: `new` · `done` · `pending` · `alert` · `muted` (colores del diseño: done/new `#151515`,
  pending `#6e6e6e`, alert `#9b2335`, muted `#8a8a8a`).
- `galleryState.daysLeft`: días hasta `expiresAt` si está entregada; tono `alert` con ≤ 14.
- `canArchive`: pasada activa, sin archivar, balance 0 y galería `DELIVERED`.
- `sameDayConflict`: solo para `REQUEST`: `{ id, code, clientName, startsAt }` de otra reserva
  activa el mismo día (Phoenix), o `null`.

### `GET /:id` (ya existe; se amplía)

Lo de ahora (`booking` con `detailChanges`, `conflictWith`) más, en `booking`: `derived`,
`gallery`, `payments`, `events` y `rebookReminders` (sin `doneAt`).

### `GET /calendar?month=YYYY-MM`

Como `/requests/calendar`, pero con `REQUEST`, `AWAITING_DEPOSIT` y `CONFIRMED`; cada item lleva
`status`. Las solicitudes van punteadas en el calendario.

## 2b. Crear una reserva a mano (`POST /`)

Detalle de reglas, campos y dudas en `docs/nuevo-booking-admin.md`. Cuerpo (yup,
`createBookingBody`): datos del cliente (`clientId` si se eligió uno, o `email`/`phone`/nombre),
`serviceId`, `packageId`, `extras: [{ extraId, quantity }]`, `startsAt` (ISO), lugar, traslado,
detalles, `minorConsent`, `policyAccepted: true`, `adjustmentCents`, `privateNotes` y
`payment: { mode: NONE|DEPOSIT|FULL, method? }`. Los precios se recalculan en el servidor.
Responde **201** con la reserva (`detailBooking`). Auxiliares: `GET /new/catalog`,
`GET /new/clients?q=`, `GET /new/client-lookup?email=&phone=`.

`GET /?tab=` acepta además `sort` (`date|client|service|total`) y `dir` (`asc|desc`).

## 3. Acciones (`POST /:id/...`)

Todas validan el cuerpo con yup, corren en una transacción con su `ActivityEvent` (`actorType
ADMIN`, `actorId` = id del usuario) y cambian el estado solo si sigue siendo el esperado
(`updateMany` con la condición; si no, **409**). Devuelven la reserva con `derived`.

| Ruta | Cuerpo | Reglas | Evento |
|---|---|---|---|
| `payments` | `{ kind: DEPOSIT\|BALANCE, method: ZELLE\|CASH_APP\|CASH, amountCents, note?, allowOverpay? }` | Solo activas. `amountCents` entero > 0 y `pagado + amount ≤ total` (si no, 400) **salvo con `allowOverpay: true`**: el admin confirmó a mano que recibió de más (propina, persona extra…). El exceso queda en el evento (`overCents`); el balance se queda en 0. Si estaba en `AWAITING_DEPOSIT` y `pagado ≥ depósito` → `CONFIRMED`. | `payment.recorded` |
| `reschedule` | `{ startsAt }` (ISO) | Solo activas y futuras. Nueva fecha futura. Sin límite de veces (2026-10-05); `rescheduleCount` suma 1 solo como conteo. La fecha anterior va al `metadata`. | `booking.rescheduled` |
| `cancel` | `{ reason: CancelReason, deposit: keep\|refund }` | Solo activas. `refund` con pagado > 0 crea un `Payment` `REFUND` por lo pagado y pone `depositRefunded`. | `booking.cancelled` |
| `expire` | — | Solo `AWAITING_DEPOSIT` con depósito sin cubrir. | `booking.expired` |
| `reopen` | — | Solo `EXPIRED` con sesión futura. Vuelve a `AWAITING_DEPOSIT`, `expiredAt` nulo, nuevo `depositDueAt` = ahora + `depositDueHours`. | `booking.reopened` |
| `archive` | — | Solo si `canArchive`. Pone `archivedAt`. | `booking.archived` |
| `unarchive` | — | Solo `done`. Quita `archivedAt`. | `booking.unarchived` |
| `review-received` | — | Pasada activa con `reviewStatus ≠ RECEIVED`. `RECEIVED` + `reviewReceivedAt`. | `followup.review_received` |
| `rebook-reminder` | `{ kind: RebookKind \| null, dueOn?: "YYYY-MM-DD", label? }` | `null` cierra (`doneAt`) los abiertos de la reserva. Si no, crea uno; `dueOn` por defecto: 6 meses / 1 año después de la sesión, 1 de marzo siguiente (graduación); `NEWBORN` y `CUSTOM` exigen `dueOn`. | `followup.rebook_set` |

## 4. Pendiente: acciones que mandan correo

No existen todavía (decisión del usuario, 2026-10-03: se hacen cuando exista el envío de
`docs/correos.md`). En el admin no aparecen. Cuando se construyan, cada una debe crear la fila
en `EmailOutbox` en la misma transacción que su evento:

| Acción del diseño | Campo / evento | Correo (`docs/correos.md`) |
|---|---|---|
| Send thank-you | `thanksSentAt`, `followup.thanks_sent` | agradecimiento |
| Ask for review / Remind | `reviewStatus REQUESTED`, `reviewRequestedAt`, `followup.review_requested` | pedir reseña |
| Send prep reminder | `booking.prep_reminder_sent` | guía de preparación |
| Resend payment instructions | `booking.payment_instructions_resent` | instrucciones de pago (Zelle / Cash App) |
| Confirm, decline, cancel, reschedule, expire, reopen | ya existen | hoy **no** avisan al cliente; el diseño dice "client notified" |
| New booking (manual) | `booking.created_manual` (**la reserva ya se crea**; falta el correo) | confirmación (la reserva nace en `AWAITING_DEPOSIT`, o `CONFIRMED` si se registró el pago) |

Mientras tanto, `nextStep` puede quedarse en `send_thanks` o `ask_review`; eso no impide
archivar (archivar solo exige balance 0 y galería entregada).

## 5. Galería

Solo lectura en Bookings (decisión del usuario, 2026-10-03). Crear, entregar y extender se
hará en Galleries; Bookings enlaza a `/admin/galleries`.
