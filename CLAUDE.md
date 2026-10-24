# photosByArelli — reglas del proyecto

Reglas para cualquier agente que trabaje en este repo (`Frontend/`, `admin/`, `Backend/`, `database/`).
Empieza por `handoff.md`.

## Fechas: siempre Luxon

- Todo cálculo, parseo y formato de fechas usa **`luxon`**. Nada de `dayjs`, `moment`, `date-fns`,
  aritmética con `Date` (`setDate`, `getTime() + …`) ni `Intl.DateTimeFormat`/`toLocale*String` a mano.
- La base guarda **UTC**; el estudio está en **`America/Phoenix`** (sin horario de verano). Se convierte en
  los bordes: entra ISO/UTC → `DateTime` en `America/Phoenix` para mostrar y calcular ("48 h antes",
  "sesiones de esta semana"); sale `toISO()`/`toJSDate()` en UTC a Prisma o a la API.
- Solo se crea un `Date` nativo cuando una librería lo exige (Prisma, flatpickr): `dt.toJSDate()`.
- Admin: `admin/src/utils/date.js` (`STUDIO_ZONE`, `toStudio`, `formatDate`, `fromNow`, `todayLabel`).
  Backend y Frontend: el mismo patrón en su propio `utils/date.js`.

## Teléfonos: siempre libphonenumber-js

- Parsear, validar, normalizar y formatear teléfonos con **`libphonenumber-js`**. Nada de regex ni de
  cortar strings.
- País por defecto **US**. Se guarda `Client.phone` tal como se escribió y `Client.phoneE164`
  normalizado (`+14805550100`), que es el segundo identificador del cliente
  (`database/handoff.md` §4.4, "Cliente que vuelve").
- Mostrar: `formatNational()` si es de US, `formatInternational()` si no. Enlaces: `tel:` + E.164.
- Validar en yup con `isValid()` (formularios) y volver a validar en el backend.
- Admin: `admin/src/utils/phone.js` (`parsePhone`, `toE164`, `formatPhone`, `isValidPhone`, `telHref`).

## Tablas del admin: siempre la misma estructura

- Toda tabla/lista en `admin/` sigue la skill **`admin-tables`** (`.claude/skills/admin-tables/SKILL.md`):
  TanStack + shell de `bookings/BookingsTable.jsx`, barra de filtros, alto limitado con scroll,
  tarjetas en móvil e **isla flotante de paginación** (`components/shared/table/PaginationIsland.jsx`).
  Nada de listas con grids a mano ni paginadores estáticos.
- Todo componente que espere datos muestra **`Skeleton`** (`components/ui`, el de REACT-COMPONETS) con la
  forma del contenido; nunca texto "Loading…" ni huecos en blanco. Spinners solo en botones/acciones.
