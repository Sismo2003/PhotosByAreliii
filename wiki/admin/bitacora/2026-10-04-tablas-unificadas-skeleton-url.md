---
tema: admin
fecha: 2026-10-04
---

# Tablas unificadas, isla de paginación, Skeleton, estado en la URL y orden en el servidor

Sesión posterior a [[2026-10-04-ui-bookings-sesion]]. Todo en `admin/src/` salvo lo marcado como
backend. El formulario de nueva reserva tiene su propia nota: [[2026-10-04-nuevo-booking-admin]].

## Decisiones del usuario

- Todas las pestañas de Bookings deben usar **la misma estructura de tabla** que Requests (la de
  `~/Developer/REACT-COMPONETS`, adaptada al estilo del proyecto), con paginado, footer y alto
  limitado con scroll.
- El paginador es una **isla flotante** traída de `rebate/FrontEnd/src/app/pages/CallCenter/CallHistory`,
  adaptada al diseño propio (no el cristal gris/blanco original).
- Toda tabla futura sigue esa estructura; todo componente que espere datos usa **Skeleton**.
  Quedó escrito en la skill `admin-tables` y en `CLAUDE.md`.
- El estado de la lista va en la **URL**; el orden de columnas se hace **en el servidor**.

## Qué se hizo

1. **Tabla compartida** — `bookings/BookingsTable.jsx` ahora es genérica (`table`, `onOpen`, `Card`,
   `emptyText`, `total`, `loading`). Escritorio: `Table/THead/TBody` con encabezado fijo, alto
   `calc(100vh-22rem)` con scroll propio; móvil: tarjetas. Requests usa `useBookingsTable.js`; las
   otras cinco pestañas usan `useSessionsTable.js` + `sessionColumns.js` + `sessionCells.jsx`
   (paginación manual, datos del servidor). Se borró `SessionList.jsx` y el `ListPager`.
2. **Tamaño de página compartido** — `setPageSize` en `slices/bookings/store.js` (vuelve a la página 1);
   las dos tablas derivan `pagination` del store, ya no de `useState` local. Las cargas dependen de
   `pageSize`.
3. **Isla flotante** — `components/shared/table/PaginationIsland.jsx`: filas por página
   (10/25/50/100), "x–y of total", "Page n of m", anterior/siguiente. Respeta Hairlines/Shadow y
   claro/oscuro. `PaginationSection` sigue existiendo pero ya no se usa en Bookings; admite `total`.
   Las listas llevan `pb-20` para que la isla no tape la última fila.
4. **Skeleton** — el componente `components/ui/Skeleton` ya era idéntico al de REACT-COMPONETS.
   Reemplaza los textos "Loading…" en: filas/tarjetas de las tablas (primera carga), calendario,
   cifras de `StatRow` (valor `null` → skeleton) y la página de reserva (`booking/BookingSkeleton.jsx`,
   con la forma real de la página).
5. **Estado en la URL** — `bookings/useBookingsUrlState.js`: `?tab=&q=&service=&page=&size=&sort=&dir=&view=&month=`.
   URL → store en el primer render (antes de las cargas), store → URL con `replace`. Los valores por
   defecto no aparecen. Los filtros de columna de Requests (TanStack) **no** van a la URL todavía.
6. **Orden en el servidor** *(backend + admin)* — `GET /?tab=` acepta `sort` (`date|client|service|total`)
   y `dir`; `sortOrderBy` en `Backend/services/booking-derive.js` (con `id` de desempate), validado en
   `listQuery`. Encabezados clicables solo en esas columnas; Balance, Payment, Status… son valores
   derivados y no se pueden ordenar en BD.
7. **Transición de pantalla** — `viewTransition: true` en los `navigate`/`Link` hacia el detalle y
   entre anterior/siguiente; la clase `page-vt` en el contenedor de ambas páginas y los estilos al
   final de `styles/index.css` (fade + subida de 10 px, respeta `prefers-reduced-motion`). El botón
   *Back* usa `navigate(-1)` y **no anima** (React Router no admite transición con delta).
8. **Skill `admin-tables`** (`.claude/skills/admin-tables/SKILL.md`) + dos viñetas en `CLAUDE.md`.

## Verificado

| Qué | Cómo |
|---|---|
| `sortOrderBy` y el rechazo de `sort` inválido | Node, importando el módulo y `listQuery` |
| Lint y compilación de todo el admin | `npx eslint src/...` y `npx vite build`, limpios tras cada cambio |

## Sin verificar

- **Nada se vio en el navegador** (regla de memoria: no abrir el navegador sin pedir permiso).
- El orden por servidor no se probó contra la BD por HTTP; solo la función que arma el `orderBy`.
- La transición solo existe en navegadores con View Transitions (no Firefox).

## Trampas descubiertas

- `PaginationSection` calculaba "x of total" con las filas cargadas; con paginación manual hay que
  pasar `total`.
- En macOS `sed -i` necesita `-i ''`; un `sed` fallido dentro de una cadena `&&` cancela el resto.
- yup `noUnknown(true)` en `validate()` sin `strict` quita las claves desconocidas en vez de rechazarlas.

## Siguiente

- Filtro por rango de fechas y acciones rápidas por fila (propuestos, no hechos).
- Pasar los filtros de columna de Requests a la URL.
