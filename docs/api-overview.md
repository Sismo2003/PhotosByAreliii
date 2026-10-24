# API · Overview (`/api/admin/overview`)

Solo admin (`requireAdmin`). Sobre estándar `{ message, data, error }`. Fechas en ISO UTC; el
día de la agenda (`day`) es el día del estudio (`America/Phoenix`), `YYYY-MM-DD`.
Las tres lecturas son independientes: cada widget del Overview carga la suya.

Las cifras de arriba (Requests to confirm, Sessions this week…) salen de
`GET /api/admin/bookings/summary`, que ya existía.

## `GET /bookings`

```json
{
  "months": [{ "month": "2026-10", "booked": 3, "waiting": 8, "notBooked": 0 }],
  "totals": { "booked": 14, "waiting": 10, "notBooked": 3 },
  "agenda": [
    { "type": "session", "id": "s12", "day": "2026-10-07", "at": "…Z", "title": "Emily Tran",
      "detail": "Graduation · ASU Tempe campus", "status": "CONFIRMED", "href": "/bookings/12" }
  ],
  "agendaDays": 14
}
```

- **Gráfica "Requests"**: solo reservas con `source = WEBSITE` creadas en los últimos 6 meses,
  agrupadas por el mes (del estudio) de `createdAt`.
  - `booked` = CONFIRMED.
  - `waiting` = REQUEST (Areli no ha contestado) o AWAITING_DEPOSIT (dijo que sí, falta el
    depósito).
  - `notBooked` = DECLINED, EXPIRED o CANCELLED.
  - El porcentaje del widget es `booked / (booked + notBooked)`; las que siguen esperando no
    cuentan.
- **Agenda**: de hoy a 13 días después. Tipos:
  - `session`: AWAITING_DEPOSIT o CONFIRMED, por `startsAt`.
  - `request`: REQUEST cuya fecha pedida cae en el rango.
  - `deposit`: `depositDueAt` de AWAITING_DEPOSIT (`amountCents`).
  - `expiry`: galería entregada cuyo `expiresAt` cae en el rango.
  - `rebook`: RebookReminder sin hacer; solo `day`, sin `at`.

## `GET /storage[?fresh=1]`

```json
{
  "totalBytes": 0, "freeBytes": 0, "usedBytes": 0, "freePct": 3.3, "level": "CRITICAL",
  "galleriesBytes": 0, "otherBytes": 0, "hasEstimates": true,
  "galleries": [{ "id": 4, "title": "…", "client": "…", "status": "DELIVERED", "photoCount": 56,
                  "bytes": 331100000, "estimated": true }]
}
```

- `bytes` es lo que **ocupa de verdad en disco** la carpeta `galleries/<id>`: se recorre
  completa (original, web y thumb) y se cuentan los bloques asignados
  (`Backend/services/storage.js` → `galleryDiskUsage`).
- Si una galería tiene fotos en la base pero no tiene carpeta (el dev seed no crea archivos),
  se estima con `Σ sizeBytes × 1.1` y lleva `estimated: true`. Esa estimación no se descuenta
  de `otherBytes`.
- `otherBytes` = espacio usado − galerías medidas, y suma todo lo demás que haya en ese
  sistema de archivos: `tmp/`, carpetas huérfanas y, en desarrollo, el resto de tu disco.
- Caché de 60 s; `?fresh=1` la salta.

## `GET /visits`

Cloudflare Web Analytics, últimos 30 días. Respuestas posibles:

- `{ ready: false }`: faltan las variables de entorno.
- `{ ready: true, error }`: Cloudflare falló. Nunca se devuelve 500.
- `{ ready: true, days, visits, pageViews, previousVisits, daily: [{ date, visits, pageViews }] }`

Detalle y cómo activarlo en `docs/overview-integraciones.md`.
