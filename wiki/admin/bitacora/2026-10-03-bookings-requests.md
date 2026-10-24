---
tema: admin
fecha: 2026-10-03
---

# Bookings Requests tab — primer pase end-to-end

Implementación de la primera pestaña de `Admin · Bookings` (lienzo `AdminBookings*.dc.html`,
[[diseno-ui]]): backend con endpoints reales, página en el admin con tabla + drawer + vista
calendario, estructura de slices Zustand estilo `~/Developer/rebate/FrontEnd/src/slices/`.

## Qué se hizo

### Backend (`Backend/`)

- `models/booking.model.js` (nuevo): `listRequests`, `requestSummary`, `getById`,
  `findConflictClient`, `listRequestsCalendar`, `confirm`, `decline`, `resolveMatch`. Las
  acciones siguen las reglas de "Cliente que vuelve" ([[base-de-datos]] §4.4): confirm rellena
  `depositDueAt = now + 48h`, decline exige razón, match tiene cuatro acciones
  (`looks_right`, `not_same`, `update_client`, `keep`). `not_same` crea un `Client` nuevo con
  los datos de `/book`; `update_client` sobrescribe la ficha del cliente enlazado (en
  transacción). Cada transición registra un `ActivityEvent` con el código y la razón.
- `controllers/booking.controller.js` (nuevo): 6 handlers con el envelope `{ message, data, error }`.
- `routes/booking.routes.js` (nuevo): router Express, todo bajo `requireAdmin`.
- `app.js`: monta `/api/admin/bookings`.

### Admin — slice Zustand

Estructura espejo de `~/Developer/rebate/FrontEnd/src/slices/` (que usa Redux Toolkit), pero con Zustand.

```
admin/src/slices/
  index.js                       ← re-export raíz
  bookings/
    index.js                     ← superficie pública del dominio
    store.js                     ← useBookingsStore (tab, view, page, requests, calendar,
                                   services, bookingId, booking, busyId, setters)
    thunks.js                    ← loadRequestsThunk, loadCalendarThunk, loadServicesThunk,
                                   loadBookingThunk, confirmBookingThunk, declineBookingThunk,
                                   resolveMatchThunk
```

Cada thunk lee/escribe el store con `getState()` y reporta errores como `{ ok, error }` para que
la UI reaccione con `toast`. Los componentes consumen el store con selectores (`useBookingsStore((s) => s.x)`).

### Admin — UI (`admin/src/app/pages/bookings/`)

- `index.jsx`: `PageHeader` + `StatRow` + tabs (solo Requests), y una barra flexible donde las
  tabs van a la izquierda y los filtros a la derecha (mismo renglón).
- `useBookingsTable.js` (nuevo): `useReactTable` en un hook que se llama una sola vez en la
  página, así toolbar y body comparten la misma instancia.
- `BookingsTable.jsx`: solo el body + view toggle; render condicional lista/calendario.
- `Toolbar.jsx`: search (fuzzy), `FacedtedFilter` por Source, por Service (cuando hay
  opciones), `DateFilter` por Submitted (Luxon), botón "Reset filters".
- `columns.js` + `rows.jsx`: TanStack columns y celdas. Celdas notables: `ContactCell` usa
  `telHref`/`formatPhone`, `MatchCell` muestra tag `border-alert text-alert` cuando el match
  es PHONE/CONFLICT sin revisar, `SubmittedCell` y `WhenCell` van con `formatDate`/`fromNow`.
- `CalendarView.jsx`: grid 7×6 propio, navegación por mes, "Today", pills con código + nombre.
- `BookingDrawer.jsx`: panel lateral con secciones Session / Client / Notes / History. Para
  PHONE/CONFLICT sin revisar: botones "Looks right" / "Not the same person". Para
  "Details changed" (`contactEmail/Phone/FirstName/LastName` ≠ `Client`): "Update client" /
  "Keep". Footer con **Decline** (modal + razón) y **Confirm**.
- `services/bookings.js` (nuevo): wrappers de axios para los 6 endpoints.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Construir también los endpoints del Backend, no ir solo con mocks | usuario | Ver datos reales desde el día uno |
| Alcance: solo la pestaña Requests (con mock de las otras como "coming next") | usuario | Destraba el contador del sidebar del día a día de Areli |
| Vista lista + calendario como toggle | usuario | Lo que muestra el lienzo original |
| Estructura Zustand en `slices/<domain>/{store,thunks}.js` espejo de `rebate/FrontEnd/src/slices/` | usuario | El usuario conoce esa estructura y quería conservarla |
| Sticky en `<th>` y no en `<thead>` | agente | `position: sticky` sobre `<thead>` no es fiable entre navegadores; sobre `<th>` sí |
| Tabla con altura `h-[calc(100vh-22rem)] overflow-auto` y cabeceras sticky | agente | La tabla rellena el viewport sin empujar la página a hacer scroll |
| `CodeCell` con EB Garamond semibold, sin `font-mono` | agente | El mono del sistema se ve delgado y desaparece sobre `bg-paper` oscuro |
| Endpoint de servicios (`/api/admin/services/active`) cargado con `fetch` directo, no axios | agente | Aún no existe; la página debe fallar silenciosa si 404 |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Lint del admin | `npm run lint` → 0 errores, 2 warnings preexistentes |
| Build del admin | `npm run build` → OK (2.0 s) |
| Sintaxis del backend | `node --check` en `models/booking.model.js`, `controllers/booking.controller.js`, `routes/booking.routes.js`, `app.js` |
| Sticky thead y altura fija | Sin probar visualmente (no se abrió navegador — preferencia del usuario) |
| `arrIncludesSome` para filtros multi-select | Definido localmente en `columns.js`; el template lo referenciaba como string sin definirlo |

**Lo que NO está verificado:**

- Docker apagado (handoff §1.1). No se levantaron los contenedores ni se corrió el seed de
  requests.
- No se llamó a los endpoints con datos reales (sin base de datos encendida).
- El formulario completo de **New booking manual** queda como botón disabled "Coming next".
- Las otras pestañas (Upcoming / Follow-up / Done / Expired) muestran solo el placeholder.
- Mobile: el layout flex de tabs + filtros probablemente se rompe a < 640 px (no se probó
  con `viewport-fit-sections`).

## Trampas descubiertas

- El template referencia `filterFn: "arrIncludesSome"` y `"inNumberRange"` como strings pero
  nunca los define; `useReactTable` los ignora silenciosamente. Hay que definir las funciones
  en `columns.js` y pasarlas por referencia (no por string).
- `FacedtedFilter` guarda `valueField`s en un array (`["WEBSITE"]`); el `filterFn` debe
  convertir el valor de la celda a string antes de comparar, porque Prisma devuelve enums.
- `sticky` sobre `<thead>` no funciona en todos los navegadores; sobre `<th>` sí. Por eso
  quedó en cada `<th>` con `bg-paper`.
- TanStack `manualPagination` requiere `pageCount` calculado en el `useReactTable` o no se
  renderiza el paginador. Se calcula como `Math.max(1, Math.ceil(total / pageSize))`.
- `useBreakpointsContext` y `useLocaleContext` están en el template; `useThemeContext` y
  `useCardSkinContext` no. El componente `PaginationSection` del template usa `useThemeContext`
  para el skin — funciona pero el `cardSkin` no afecta al admin re-tematizado.
- El handler de `onPaginationChange` de TanStack llama con `(updater | state)` y dentro hay
  que distinguir. Patrón usado: `setPagination((prev) => { const next = typeof updater ===
  "function" ? updater(prev) : updater; setPage(next.pageIndex + 1); return next; })`.
- `fetch` directo (sin axios) en `loadServicesThunk` evita arrastrar el interceptor de axios
  para un endpoint que aún no existe. Cuando se monte, se cambia por un wrapper.
- `Booking.status` en Prisma es enum; el filtro `raw.type` para `FacedtetFilter` necesita
  serializar a string.

## Siguiente paso

1. Levantar Docker y correr un seed de 3 requests (uno NEW, uno PHONE match, uno CONFLICT)
   para verificar el flujo completo contra datos reales.
2. Construir las otras pestañas (Upcoming / Follow-up / Done / Expired) con el mismo patrón.
3. Endpoint `GET /api/admin/services/active` (hoy la página falla silenciosa).
4. Formulario de **New booking manual**.
5. Adaptar `PaginationSection` y `TableColumnsVisibility` del template para no usar
   `useThemeContext` ni `useCardSkinContext`.
6. `viewport-fit-sections`: probar el bloque flex de tabs + filtros en mobile.

---

Relacionado: [[admin]] · [[diseno-ui]] · [[base-de-datos]] · [[infraestructura]]