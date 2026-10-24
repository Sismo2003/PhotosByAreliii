# API de Clients (admin) — contrato

Rutas bajo `/api/admin/clients`, con `requireAdmin`, sobre estándar `{ message, data, error }` /
`{ error_message, message, error: true, details? }`. Dinero en **centavos**; fechas ISO UTC
(`reminder.dueOn` es un día). Reglas: `database/handoff.md` §4.1, §4.2, §5.2, §5.3. Código:
`Backend/models/client.model.js`, `Backend/services/client-derive.js`.

## Segmentos (pestañas)

Una sesión **activa** es `AWAITING_DEPOSIT` o `CONFIRMED`; **pasada** es la que ya empezó (igual que Bookings).

| `tab` | Regla |
|---|---|
| `all` | todos los no borrados |
| `upcoming` | tiene una sesión activa futura |
| `followup` | si no, tiene una sesión activa pasada sin archivar |
| `past` | si no, tiene alguna sesión activa pasada (todas archivadas) |
| `leads` | ninguna sesión activa (solo solicitudes, canceladas o vencidas) |

## Rutas

| Ruta | Qué hace |
|---|---|
| `GET /summary` | `{ total, returning, year, receivedYearCents, reachOutSoon, counts{all,upcoming,followup,past,leads} }`. `receivedYearCents` suma pagos por `receivedAt` del año en Phoenix (REFUND resta). `reachOutSoon`: recordatorio abierto a ≤ 60 días y sin sesión próxima. |
| `GET /?tab&q&heardFrom&login&sort&dir&page&pageSize` | Lista. `tab` es el filtro "Group" (no hay pestañas en la UI). `heardFrom` = enum de cómo nos conoció; `login` = `none\|invited\|active`. `q` busca nombre, email, teléfono (cualquier formato) e Instagram. Sin `sort` = actividad reciente; `sort=name\|received` + `dir`. `pageSize` máx. 100. |
| `GET /:id` | `{ client, sessions[], history[] }` (historial: últimos 50 eventos del cliente). 404 si está borrado. |
| `POST /` | Crea. `firstName` y `email` obligatorios; `phone` se valida (libphonenumber, US) y se guarda como se escribió + `phoneE164`. |
| `PATCH /:id` | Edita solo lo enviado. Si cambia el email, también cambia `User.email` (el email es el login). |
| `PUT /:id/rebook-reminder` | `{ kind \| null, dueOn?, label? }` (mismo cuerpo que el de Bookings). Un solo recordatorio abierto por cliente: poner uno reemplaza los abiertos; `null` los cierra. |
| `DELETE /:id` | **Soft delete**: `deletedAt`. |
| `POST /:id/restore` | Deshace el borrado. No hay botón en la UI todavía. |

Cada fila trae lo calculado (nunca guardado): `segment`, `returning` (≥ 2 sesiones activas), `sessionCount`,
`sessionTypes`, `lastSessionAt`, `nextSessionAt`, `receivedCents`, `balanceCents` (total − pagado de las
activas), `status{key,tone,amountCents}`, `login{state: none|invited|active}`, `reminder`.

## Errores

- 409 por email o teléfono repetido: `details: { field, clientId, name, deleted }` para ofrecer "Open that client" o "Restore".
- 400 con el primer error de yup; campos desconocidos se rechazan.

## Borrado (soft delete)

Decisión del usuario (2026-10-04): borrar **solo oculta** al cliente. No se toca ninguna reserva, pago ni galería.
Desaparece de Clients, del buscador de "New booking" y de los números de Clients, y **no puede iniciar sesión**
(`login` y `me` responden como si no existiera). Su email y teléfono siguen ocupados.
