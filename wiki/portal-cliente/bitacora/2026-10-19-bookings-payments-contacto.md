---
tema: portal-cliente
fecha: 2026-10-19
---

# Bookings, Payments y contacto en el portal + `shared/site.js`

## Qué se hizo

- **`shared/site.js`** (raíz del repo, con `shared/package.json` `type: module`): `BRAND`, `CONTACT.phoneE164`,
  `SOCIAL`, `PAYMENTS` (Zelle y Cash App vacíos porque aún no se conocen). Fuente única para `client/`, la landing
  Astro y `Backend/`. Skill `site-config` reescrita con la forma de importarlo en cada app.
- **Docker de `client/`:** contexto en la raíz (`deploy/docker-compose.yml`, `dockerfile: client/Dockerfile`),
  con `client/Dockerfile.dockerignore` que solo deja pasar `client/` y `shared/`. Alias `@shared` en
  `client/vite.config.js` y `client/jsconfig.json`.
- **API:** `GET /api/client/bookings?cursor=`, `GET /api/client/bookings/:code/calendar.ics` y
  `GET /api/client/payments` en `Backend/routes/client-portal.routes.js`. La lógica está en
  `Backend/models/client-portal.model.js` (`bookingScope`, `bookingOut`, `galleriesByBooking`, `bookings`,
  `payments`, `calendarEvent`) y el generador de .ics en `Backend/services/ics.js`.
- **Cliente:** pestañas Bookings y Payments (`client/src/app/layout/AppShell.jsx`, 4 columnas),
  `client/src/app/pages/bookings/index.jsx` (ticket de la próxima sesión + línea de tiempo por año),
  `client/src/app/pages/payments/index.jsx` (anillo pagado/total + recibo desplegable + cómo pagar con botón de copiar),
  `client/src/components/ContactActions.jsx` (también en Profile), `client/src/components/Chip.jsx` (sacado de
  galleries), `client/src/utils/money.js`. Textos en `en.json` y `es.json`.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| El cliente ve REQUEST, AWAITING_DEPOSIT, CONFIRMED y CANCELLED; nunca DECLINED ni EXPIRED | Alexis | Las rechazadas y vencidas nunca fueron sesiones |
| Teléfono, Instagram, Zelle y Cash App en `shared/site.js`, no en `StudioSettings` | Alexis | La landing usa los mismos datos; un solo lugar. Las columnas `zelleHandle`/`cashAppHandle` quedan sin uso (comentado en `database/prisma/schema.prisma`) |
| Book again y `/me/booking-prefill` pospuestos | Alexis | `/book` aún no existe |
| El .ics se genera en el servidor, en UTC, con `SEQUENCE = rescheduleCount` | agente | iOS Safari abre bien un archivo (un blob no); al reprogramar, el evento se actualiza en lugar de duplicarse |
| `CONTACT` guarda solo E.164; cada app lo formatea con su `utils/phone.js` | agente | Una sola forma del número; regla libphonenumber-js |
| Payments sin paginación (tope de 100 reservas en la consulta) | agente | Un cliente tiene pocas reservas; filtrar Pending/Paid en el cliente sería incorrecto sobre una lista paginada |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| `bookings()` / `payments()` | Script con Prisma contra la base de desarrollo: forma correcta, `paidCents` coincide con el pago registrado y sin `privateNotes`, `note`, `recordedById`, `contact*` ni `id` en el JSON |
| Propiedad del .ics | `calendarEvent` con otro `clientId` → 404 |
| `services/ics.js` | Archivo de prueba: CRLF, plegado a 75 octetos con acentos, escape de `; , \`; 10:00 en Phoenix = `170000Z` |
| Ruta `calendar.ics` en Express 5 | App de prueba: el `.` es literal (`calendarXics` → 404) |
| API viva | `curl` sin sesión → 401 |
| `client/` | ESLint sin errores; `vite build` correcto, con el teléfono de `shared/site.js` dentro del bundle |
| Docker | `docker build -f client/Dockerfile .` correcto con un contexto de 977 KB (imagen de prueba borrada) |

**Lo que NO está verificado:**
- Ninguna pantalla se ha visto en el navegador (móvil, escritorio, modo oscuro, EN/ES).
- No hay prueba HTTP con sesión de cliente real (solo el modelo directo). La base de desarrollo tiene una
  sola reserva, CONFIRMED y pasada, así que el ticket, la línea de tiempo con varias sesiones y el .ics de
  una sesión real no se probaron con datos.
- No se ha importado ningún .ics en Calendar de iOS/macOS.
- Las pantallas no pasaron por el canvas de diseño antes de construirse, a diferencia de lo que pide el plan §1.3.

## Trampas descubiertas

- **Docker:** cada imagen se construía solo con su carpeta. Cualquier app que importe `shared/` necesita
  `context: ..` + `<app>/Dockerfile.dockerignore` (BuildKit lo usa en lugar del `.dockerignore` de la carpeta).
  `client/.dockerignore` ya no se usa.
- **`Backend/` importa `../../shared/site.js`** (ics). Su Dockerfile, que aún no existe, debe usar contexto raíz (anotado en el compose).
- **ESM:** `package.json` de la raíz no tiene `type: module`. Por eso `shared/package.json` existe; sin él Node no lee `site.js` como ESM.
- **Preview as client** aún no existe en `client/`. Cuando exista, los enlaces directos (`calendarUrl`,
  `originalUrl`, `zipUrl`) no llevan el header `X-Preview-Client`: habrá que resolverlo para todos a la vez.
- **Cursor de Prisma:** `cursor: { id }` con `orderBy startsAt desc, id desc` funciona igual que en fotos.
- **Datos de prueba:** la reserva de prueba tiene `locationAddress` que repite `locationName`. El .ics y el
  ticket evitan mostrarlo dos veces.

## Siguiente paso

- Revisar en el navegador (preguntar antes a Alexis) y diseñar o ajustar en el canvas.
- Llenar `PAYMENTS.zelle` / `cashApp` en `shared/site.js` cuando Areli los dé.
- Landing: al crear `Frontend/astro.config.mjs`, agregar el alias `@shared` y un Dockerfile con contexto raíz (skill `site-config`).

---
Relacionado: [[portal-cliente]] · [[2026-10-19-auditoria-pendientes]] · [[infraestructura]]
