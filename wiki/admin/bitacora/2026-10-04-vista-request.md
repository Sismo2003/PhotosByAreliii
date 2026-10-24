---
tema: admin
fecha: 2026-10-04
---

# Vista de request (página completa) en lugar del drawer

> **Reemplazada** por la página única de reserva: [[2026-10-04-vista-reserva-unica]]. La ruta `/bookings/requests/:id` ahora redirige a `/bookings/:id`.

## Qué se hizo

- **Tabla de Requests sin columnas Source ni Match** — `admin/src/app/pages/bookings/columns.js`.
  También se quitaron `SourceCell`/`MatchCell` de `rows.jsx`, el filtro "Source" de `Toolbar.jsx`
  y la línea de match de las tarjetas de teléfono en `BookingsTable.jsx`. Esa información ahora
  vive en la vista de la request (tarjeta Client: "Came from" y "Client record").
- **Nueva ruta `/bookings/requests/:id`** — `admin/src/app/router/protected.jsx` →
  `admin/src/app/pages/bookings/request/index.jsx`. Al hacer clic en una fila (tabla o tarjeta
  en teléfono) se navega ahí; ya no se abre el drawer. El calendario también: un booking en
  `REQUEST` abre la vista, el resto sigue abriendo el drawer (`index.jsx`).
- **Botón ← Back** arriba a la izquierda: `navigate(-1)` si hay historial dentro de la app;
  si la vista se abrió directo (link pegado, pestaña nueva, `location.key === "default"`) va a
  `/bookings`.
- **Layout de la vista**: encabezado (código · enviada hace X, nombre del cliente, tags de
  estado y pago); columna principal con Session, "What the client told us" (`NotesList`) e
  History; columna lateral (sticky en desktop) con **Your decision** y **Client**.
  - Cada acción dice qué hace debajo del botón: "Confirm booking — pasa a Upcoming y el cliente
    tiene 48 h para el depósito"; "Decline request — razón opcional, no se puede deshacer".
  - En teléfono/tablet la decisión está en una barra fija abajo (Decline / Confirm).
  - Revisión de match reescrita como pregunta + respuestas explícitas: PHONE → "Yes, same
    person" / "No, create a new client"; CONFLICT → muestra a quién pertenece el teléfono y
    "OK, keep <cliente>"; detalles cambiados → lista campo por campo + "Use the new details" /
    "Keep what's on file". Mismos `action` del backend (`looks_right`, `not_same`,
    `update_client`, `keep`).
  - Al confirmar o declinar con éxito, regresa a la lista.
- **Estado de la tabla en el store** — `slices/bookings/store.js` (`requestsTable` +
  `setRequestsTable`) y `useBookingsTable.js`: búsqueda, filtros y orden sobreviven al ir a la
  vista y volver (antes eran `useState` y se perdían al desmontar la página).
- **Drawer** (`BookingDrawer.jsx`): ya no renderiza requests y no se abre para un `REQUEST`. Se borró `detail/RequestDetail.jsx` (su contenido pasó a `request/index.jsx`).
- Helper `requestPath(id)` en `bookings/helpers.js`.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Quitar Source y Match de la tabla de Requests | usuario | se ven en el resumen de la request |
| Vista de página en vez de drawer para requests | usuario | resumen más legible y extendible |
| Flecha ← para volver a la ruta anterior | usuario | — |
| Source y Match se muestran en la tarjeta Client de la vista | agente | interpreté "ya se van a mostrar en los detalles" — confirmar con el usuario |
| Quitar también el filtro "Source" del toolbar | agente | dependía de la columna `source` |
| Drawer se queda para sesiones (Upcoming, Follow-up…) | agente | el pedido era solo para requests |
| Razón de decline opcional (se manda "No reason given") | agente | ya era así en el drawer; el backend exige `reason` |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Lint de `pages/bookings`, `slices/bookings`, `router` | `npx eslint` sin errores |
| Compilación | `npx vite build` en `admin/` OK |

**Lo que NO está verificado:**
- Nada se vio en el navegador (no se pidió permiso para usarlo). Falta probar: clic en fila →
  vista, ← Back con y sin historial, Confirm/Decline y regreso a la lista, revisión de match
  PHONE/CONFLICT/detalles cambiados, barra inferior en teléfono, que los filtros se conserven.
- El texto "48 h" está fijo; el backend usa `depositDueHours` de los settings del estudio.

## Trampas descubiertas

- **Bug reportado por el usuario (2026-10-04): "← Back no funciona".** La primera versión del
  drawer redirigía a la vista si le llegaba un `REQUEST`. Al volver a `/bookings`, el primer
  render del drawer todavía veía en el store el booking de la vista (que solo se limpia cuando la
  vista se cierra, después de ese render). Su efecto tenía guardado ese valor viejo y navegaba
  otra vez a la request, así que Back rebotaba. Arreglo: se quitó la redirección, el drawer queda
  cerrado si el booking es `REQUEST` y el efecto de carga lee `useBookingsStore.getState()` antes
  de cargar. Regla: no navegar desde efectos que dependen de estado compartido con otra ruta.

- Confirm/Decline usan `runAction(..., { keepOpen: false })`, que llama `closeBooking()` y deja
  `booking` en `null` **antes** de terminar el refresh. La vista guarda el último booking
  (`lastRef` + `leaving`) para no mostrar "couldn't be loaded" un instante antes de navegar.
- La vista usa `openBooking`/`closeBooking` del slice (los thunks descartan respuestas cuyo
  `bookingId` no coincide). Al desmontar llama `closeBooking()`; si no, al volver a `/bookings`
  el drawer se abriría solo con ese booking.
- `table.getColumn("source")` sobre una columna inexistente hace que TanStack escriba un error
  en consola; por eso se quitó el bloque del filtro en vez de dejarlo condicionado.

## Siguiente paso

- Revisión en navegador por el usuario.
- Leer `depositDueHours` (settings) en lugar del "48 h" fijo si se quiere exacto.

---
Relacionado: [[admin]]
