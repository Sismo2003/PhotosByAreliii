---
tema: admin
fecha: 2026-10-04
tags: [reservas, regla-de-negocio, importante-para-documentacion-del-sitio]
---

# Regla: cuándo una sesión pasa a ser "pasada"

> **Importante para la documentación del sitio.** Esta regla decide en qué pestaña está una reserva,
> qué paso sigue y qué acciones se permiten. Quien documente las reservas para Areli o para
> desarrolladores debe incluirla. Ver también [[2026-10-04-vista-reserva-unica]].

## La regla

Una reserva **activa** (`AWAITING_DEPOSIT` o `CONFIRMED`) es **pasada** en cuanto su hora de inicio
(`startsAt`) ya ocurrió, comparada con el instante actual en `America/Phoenix`.

- Antes (hasta 2026-10-04): "pasada" era `startsAt` **antes del inicio de hoy**. Una sesión de hoy a las
  10:00 AM seguía en Upcoming hasta la medianoche, sin paso siguiente.
- Ahora: la sesión de las 10:00 AM pasa a **Follow-up** a las 10:00 AM en punto.

## Qué cambia cuando una reserva es pasada

| Cosa | Antes de empezar la sesión | Después de empezar |
|---|---|---|
| Pestaña | Upcoming | Follow-up (o Done si ya está archivada) |
| `derived.nextStep` | `null` | `collect_balance` → `create_gallery` → `deliver_gallery` → `send_thanks` → `ask_review` → `set_rebook` → `ready_to_archive` |
| Barra de progreso | Confirmed | Session (si falta cobrar) o Follow-up |
| Reagendar | Permitido (si no superó el máximo) | **Bloqueado** (409 "This session already happened") |
| "Payments pending" | Solo el depósito que falta | Todo el saldo |
| Archivar / desarchivar / reseña recibida | No aplican | Aplican |

## Dónde está en el código

- `Backend/services/booking-derive.js`: `deriveContext()` añade `pastCutoff` (el instante actual);
  `isPastSession()` y `tabWhere()` lo usan. `startOfToday` se conserva para lo que sí es "por día"
  (galería vencida, `daysLeft`, "sessions this week").
- `Backend/models/booking.model.js`: listado, resumen, `archive`, `unarchive` y `markReviewReceived` usan `pastCutoff`.
- `docs/api-bookings.md` (cabecera): definición actualizada.
- Frontend: no tiene lógica propia; usa `derived.isPast` y `derived.nextStep`.

## Decisión abierta para el usuario

Hoy cuenta **la hora de inicio**, no el fin. Una sesión de 90 minutos ya es "pasada" a los 5 minutos de
empezar. Alternativa: considerar pasada cuando termina (`startsAt + durationMinutes`). Cambia solo
`isPastSession()` y `tabWhere()` (Prisma no suma columnas en un `where`; habría que calcular el fin o
guardar un campo `endsAt`). No se hizo para no ampliar el cambio sin preguntar.

## Verificado y no verificado

| Qué | Cómo |
|---|---|
| Sesión de hace 4 h, pagada → pestaña `followup`, `isPast` true, `nextStep` `create_gallery` | Script de Node contra `deriveBooking()` |
| Sesión dentro de 4 h → `upcoming`, `isPast` false | Mismo script |
| Los dos archivos del backend sin errores de sintaxis | `node --check` |

**No verificado:** el servidor corriendo, consultas reales contra MySQL (`tabWhere` con Prisma), el
resumen/contadores, y la página en el navegador. Hay que **reiniciar el backend** para que tome el cambio.
