# Handoff — Admin · Bookings · vista de Request

> **Vigente:** la vista de Request y el drawer fueron reemplazados el 2026-10-04 por una **página única de reserva** (`/bookings/:id`). Para lo actual, empieza por `docs/proximos-pasos-bookings.md`, `docs/bookings-page-integraciones.md` y `wiki/admin/bitacora/2026-10-04-ui-bookings-sesion.md`. Lo de abajo es el historial de la vista de Request.

Fecha: **2026-10-04**. Detalle y razones: `wiki/admin/bitacora/2026-10-04-vista-request.md`.
Reglas generales del proyecto: `CLAUDE.md` y `handoff.md` (raíz).

## Qué cambió

1. **Tabla de Requests** sin las columnas **Source** ni **Match** (y sin el filtro "Source").
   Esa información se muestra ahora en la vista de la request, tarjeta **Client**.
2. **Clic en una request → vista de página completa** en `/bookings/requests/:id`
   (antes se abría el drawer lateral). El drawer sigue igual para las demás pestañas.
3. **Botón ← Back** que regresa a la ruta anterior (o a `/bookings` si no hay historial).
4. Búsqueda, filtros y orden de la tabla se conservan al volver.

## Archivos

| Archivo | Cambio |
|---|---|
| `admin/src/app/pages/bookings/request/index.jsx` | **nuevo** — la vista de request |
| `admin/src/app/router/protected.jsx` | ruta `bookings/requests/:id` |
| `admin/src/app/pages/bookings/columns.js` | sin columnas `source` y `match` |
| `admin/src/app/pages/bookings/rows.jsx` | sin `SourceCell` ni `MatchCell` |
| `admin/src/app/pages/bookings/Toolbar.jsx` | sin filtro Source |
| `admin/src/app/pages/bookings/BookingsTable.jsx` | filas navegan a la vista |
| `admin/src/app/pages/bookings/index.jsx` | calendario: `REQUEST` → vista, resto → drawer |
| `admin/src/app/pages/bookings/BookingDrawer.jsx` | no se abre para un `REQUEST` (sin redirección, ver abajo) |
| `admin/src/app/pages/bookings/helpers.js` | `requestPath(id)` |
| `admin/src/app/pages/bookings/useBookingsTable.js` | estado de la tabla desde el store |
| `admin/src/slices/bookings/store.js` | `requestsTable` + `setRequestsTable` |
| `admin/src/app/pages/bookings/detail/RequestDetail.jsx` | **borrado** (pasó a la vista) |

## Cómo está armada la vista

- **Encabezado:** ← Back · "Request PBA-XXXX · Sent …" · nombre del cliente · tags de estado y pago.
- **Columna principal:** Session · What the client told us · History.
- **Columna lateral** (sticky en desktop):
  - **Your decision:** *Confirm booking* y *Decline request*, cada uno con una línea que dice
    qué pasa al pulsarlo.
  - **Client:** contacto (tel:/mailto:), *Came from* (antes "Source"), *Client record* (antes
    "Match") y, si hace falta, la revisión como pregunta con respuestas explícitas.
- **Teléfono/tablet:** Decline / Confirm en una barra fija abajo.
- Al confirmar o declinar con éxito regresa a la lista.

## Estado

- ✅ `npx eslint` limpio y `npx vite build` OK en `admin/`.
- ❌ **No probado en el navegador.** Checklist:
  - [ ] Clic en fila (desktop y teléfono) abre `/bookings/requests/:id`.
  - [ ] ← Back vuelve a la lista con los mismos filtros; abriendo el link directo va a `/bookings`.
  - [ ] Confirm y Decline funcionan, muestran toast y regresan a la lista.
  - [ ] Revisión PHONE, CONFLICT y "detalles cambiados" (hay casos en el dev seed).
  - [ ] Al volver a `/bookings` no se abre el drawer solo.
  - [ ] Barra inferior en teléfono no tapa contenido.

## Bug arreglado: ← Back no regresaba

El drawer redirigía cualquier `REQUEST` a la vista. Al volver a `/bookings`, el primer render del
drawer todavía veía la request en el store y te mandaba de vuelta a ella. Se quitó la
redirección; el drawer queda cerrado para un `REQUEST` y lee el estado actual del store antes de
cargar. El botón Atrás del navegador ahora funciona igual.

## Pendientes / a confirmar con el usuario

- Interpreté que Source y Match deben **verse en la vista** de la request. Si no se quieren ahí
  tampoco, quitar las filas "Came from" / "Client record" de `ClientCard`.
- "48 h" del depósito está fijo en el texto; el backend usa `depositDueHours` de settings.
