---
tema: admin
fecha: 2026-10-03
---

# Bookings — todas las pestañas en el admin

Segunda iteración de Bookings: llevar al admin las pestañas Upcoming, Follow-up, Done, Expired
y Cancelled, el panel de detalle de sesiones y sus acciones, contra el contrato
`docs/api-bookings.md`. La hicieron dos subagentes en paralelo:

- **"Backend for Bookings tabs"** terminó (endpoints de `docs/api-bookings.md` §2–§3).
- **"Admin UI for Bookings tabs"** se detuvo a la mitad el 2026-10-03, a la 1:18 a. m.
  ("Agent stalled: no progress for 600s"). Dejó escritos todos los componentes, pero **no
  reescribió `admin/src/app/pages/bookings/index.jsx`**: nada de lo nuevo se veía y Requests
  perdió el drawer y el calendario.
- Ese mismo día, el agente principal revisó lo que quedó en disco y escribió `index.jsx`
  para conectarlo todo. Después lo probó contra el backend real.

El repo no es git, así que no hay un diff contra la versión anterior.

## Qué se hizo

### Backend (agente terminado + arreglo del agente principal)

- `Backend/routes/booking.routes.js`: `GET /`, `/summary`,
  `/calendar` y los `POST /:id/{payments,reschedule,cancel,expire,reopen,archive,unarchive,review-received,rebook-reminder}`
  del contrato. Las rutas viejas `/requests` y `/requests/calendar` se quedan.
- `Backend/models/booking.model.js` y `Backend/controllers/booking.controller.js`: después, el
  agente principal agregó `actorId` (el id del admin, `req.user.id`) a los eventos de
  `confirm`, `decline`, `resolveMatch` y al `client.created` de `not_same`, que no lo guardaban.
  Probado con curl (ver abajo): los eventos guardan `actorType ADMIN` y `actorId 1`.

### Admin (agente detenido + `index.jsx` del agente principal)

| Archivo | Qué contiene |
|---|---|
| `admin/src/app/pages/bookings/index.jsx` | **Reescrito por el agente principal.** Las 6 pestañas desde `TABS`, con contador de `summary.counts`. Métricas de `GET /summary`: Requests to confirm · Sessions this week · Payments pending · Follow-ups due. Requests usa `BookingsToolbar` + `BookingsTable`; las demás, `SessionToolbar` + `SessionList` + `ListPager`. Selector List/Calendar solo en Requests y Upcoming. `<BookingDrawer />` siempre montado. Requests recarga al cambiar de página (antes solo al cambiar de pestaña, así que la página 2 nunca se pedía) |
| `admin/src/services/bookings.js` | Wrappers de axios de todo el contrato: `getSummary`, `listBookings`, `getCalendar`, `getBooking` y las 9 acciones de sesión, más las de Requests |
| `admin/src/slices/bookings/store.js` | Estado nuevo: `summary`, `list` + `query` (q, serviceId, page) para las pestañas del servidor, `calendar` (con tope `CALENDAR_MIN_MONTH = "2026-10"`), `bookingId`/`booking`/`busyId` del drawer. `setTab` limpia lista, vista y drawer |
| `admin/src/slices/bookings/thunks.js` | `loadSummaryThunk`, `loadListThunk` (ignora respuestas viejas con un contador), `loadCalendarThunk` (ahora contra `/calendar`, no `/requests/calendar`), `loadBookingThunk`, y `runAction`: marca ocupado, llama, recarga el detalle (o cierra el drawer en confirm/decline) y refresca lista + summary + calendario |
| `admin/src/slices/bookings/index.js` | Exporta todo lo anterior |
| `admin/src/utils/date.js` | Nuevos: `fromStudioDay`, `formatDay` (fechas sin hora como `dueOn`) y `studioInputToISO` (fecha + hora escritas en Phoenix → ISO UTC) |
| `admin/src/app/pages/bookings/labels.js` | Etiquetas en inglés de las claves de `derived` (payment, status, nextStep, galleryState), dinero en centavos, métodos de pago, motivos de cancelación, rebook, `TABS` (con Cancelled) y `EMPTY_TEXT` |
| `admin/src/app/pages/bookings/helpers.js` | `dateParts`, `bookingFlags` (qué panel toca, como el `det` del diseño) y `archiveBlockers` |
| `admin/src/app/pages/bookings/parts.jsx` | Piezas de UI: `ToneTag`, `ActionButton`, `ChoiceGroup`, `Section`, `KeyValueRows`, `History`, `AlertNote` |
| `admin/src/app/pages/bookings/SessionList.jsx` | Lista para las pestañas del servidor: tabla en lg (Date · Client · Session · Total · Payment · Status), "tracker" para Follow-up/Done (Balance · Gallery · Thank-you · Review · Next step), filas compactas en tablet y tarjetas en móvil |
| `admin/src/app/pages/bookings/SessionToolbar.jsx` | Búsqueda con debounce de 300 ms + filtro de servicio (los dos vuelven a la página 1) y `ListPager` |
| `admin/src/app/pages/bookings/CalendarView.jsx` | Reescrito sobre `/calendar`: solicitudes punteadas, sesiones sólidas; chips por día en desktop y puntos + agenda del día elegido en tablet/móvil. Recibe `onPickBooking` |
| `admin/src/app/pages/bookings/BookingDrawer.jsx` | Reescrito: lee `bookingId` del store, carga el detalle y muestra `RequestDetail` o `SessionDetail`; pantalla completa en móvil ("← All bookings") |
| `admin/src/app/pages/bookings/detail/RequestDetail.jsx` | Detalle de solicitud (lo que antes estaba en el drawer: match, cambios de datos, Confirm/Decline) |
| `admin/src/app/pages/bookings/detail/SessionDetail.jsx` | Detalle de sesión según estado: depósito pendiente/vencido, confirmada, reprogramar, cancelar, expirar, reabrir, desarchivar |
| `admin/src/app/pages/bookings/detail/ActionForms.jsx` | Formularios en línea: `PaymentForm`, `RescheduleForm`, `CancelForm`, `ExpireForm` |
| `admin/src/app/pages/bookings/detail/FollowUpChecklist.jsx` | Checklist de seguimiento: balance, galería (solo lectura, enlaza a `/galleries`), thank-you y reseña (solo lectura salvo "review received"), rebook y "Archive — all done" |
| `admin/src/app/pages/bookings/detail/NotesList.jsx`, `useBookingAction.js` | Notas del cliente; hook que corre un thunk y guarda el error |
| `admin/src/app/pages/bookings/BookingsTable.jsx`, `Toolbar.jsx`, `columns.js`, `rows.jsx` | Tabla de Requests. `BookingsTable` ahora recibe solo `table`: ya **no** trae el selector lista/calendario ni pinta el drawer; dice "the detail drawer is rendered by the page" |
| `admin/src/components/shared/form/Datepicker.jsx` | Lo tocó el agente, pero ningún archivo de Bookings lo importa. Sin git no se sabe qué cambió |

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Las acciones que mandan correo (thank-you, pedir reseña, prep reminder, reenviar instrucciones, New booking manual) no se construyen todavía | usuario (2026-10-03) | Se harán cuando exista el envío de `docs/correos.md`; ver `docs/api-bookings.md` §4 |
| La galería es de solo lectura en Bookings; crear, entregar y extender va en Galleries | usuario (2026-10-03) | `docs/api-bookings.md` §5 |
| Requests sigue con la tabla de TanStack del lado del cliente sobre `/requests`; las demás pestañas paginan y filtran en el servidor (`GET /?tab=`) | agente | Requests ya funcionaba así; las demás pueden crecer (Done, Cancelled) |
| Confirm y Decline cierran el drawer; las demás acciones lo dejan abierto y recargan el detalle | agente | Después de confirmar, la reserva ya no está en la pestaña Requests |

## Verificado vs. no verificado

Pruebas del agente principal, el 2026-10-03:

| Pieza | Prueba |
|---|---|
| Lint y build del admin | `npm run lint` (todo `admin/`) sin errores; `npm run build` compila, ya con todos los componentes nuevos en el bundle |
| Imports de los componentes nuevos | Revisados a mano: `studioInputToISO`, `formatDay`, `useDebounceCallback` (`hooks`) y los thunks existen |
| `GET /summary` | curl contra `node --env-file=.env server.js` en el puerto 4100, con una cookie JWT firmada con el `JWT_SECRET` local. Con el dev seed: requests 6, upcoming 5, followup 20, done 3, expired 3, cancelled 8 |
| `GET /?tab=` de las 6 pestañas | Cada clave de `derived.payment` y `derived.status` que llega tiene su etiqueta en `labels.js` |
| `GET /:id` y `GET /calendar?month=2026-10` | Traen `derived`, `gallery`, `payments`, `events`, `rebookReminders`; el calendario agrupa por día de Phoenix con solicitudes y sesiones |
| Acciones | `unarchive` → 200; repetirlo → 409; `archive` → vuelve a Done. El dev seed queda igual. Errores: pago mayor al total → 400, método `VENMO` → 400, reprogramar a una fecha pasada → 400, expirar una confirmada → 409 |
| `actorId` | En la base: `booking.archived` y `booking.unarchived` quedaron con `ADMIN` y `actorId 1` |
| Errores en la UI | `utils/axios.js` pasa `error_message` a `err.message`, y `useBookingAction` y los formularios lo muestran (toast o `AlertNote`) |

**Lo que NO está verificado:**

- **Nada se ha visto en el navegador**: ni el layout, ni el drawer, ni los formularios, ni el
  calendario, ni las versiones de tablet o móvil.
- Acciones que cambian datos para siempre: registrar un pago, reprogramar, cancelar, expirar,
  reabrir, review-received y rebook-reminder. Solo se probaron sus rechazos, no un caso exitoso.
- Confirm, decline y match con el `actorId` nuevo: no se llamaron.
- Qué cambió en `Datepicker.jsx`.
- La API que ya corría en el puerto 4000 (`node server.js`, sin modo watch) puede tener código
  viejo. Hay que reiniciarla para que tome el `actorId` de confirm, decline y match.

## Trampas descubiertas

- **El dev seed tiene dos reservas `AWAITING_DEPOSIT` con el depósito ya pagado** (PBA-0138 y
  PBA-0139). Upcoming las muestra como "Awaiting deposit" + "Deposit paid". No es un error
  del admin: el seed creó el pago sin pasar por `POST /payments`, que es el que cambia el estado a
  `CONFIRMED`.
- `npm run build` no prueba un componente que nadie importa: Vite lo deja fuera. Por eso el
  build pasaba aunque el agente hubiera dejado la página a medias.
- `setQuery({ page })` funciona porque `setQuery` pone `page: 1` antes de aplicar lo que recibe.
  Si se cambia ese orden, el pager se rompe.

## Siguiente paso

- Revisar Bookings en el navegador (**preguntando antes**) con `npm run dev` (antes `dev:auth`, ya eliminado), en
  desktop, tablet y móvil.
- Probar una vez cada acción que cambia datos sobre el dev seed y volver a correr el seed.
- Las acciones que mandan correo y "New booking" esperan al envío de `docs/correos.md`.

---
Relacionado: [[admin]] · [[2026-10-03-bookings-requests]] · [[2026-10-03-bookings-backend]] · [[2026-10-03-bookings-details-fixes]]

## 2026-10-04 — acciones probadas y dev seed corregido

Sin navegador (el usuario prueba la UI él mismo). API de prueba en el puerto 4100 con una cookie
JWT del admin 1. Cada acción se probó **con éxito** una vez sobre el dev seed:

| Acción | Resultado |
|---|---|
| `payments` DEPOSIT en PBA-0138 | `AWAITING_DEPOSIT` → `CONFIRMED`, `deposit_paid` |
| `payments` BALANCE en PBA-0132 | `paid_in_full` |
| `reschedule` PBA-0133 | nueva fecha, `rescheduleCount 1` |
| `cancel` refund PBA-0134 | `CANCELLED`, `depositRefunded`, pagos `DEPOSIT` + `REFUND` |
| `expire` → `reopen` PBA-0139 | `EXPIRED` → `AWAITING_DEPOSIT` con `depositDueAt` nuevo |
| `review-received`, `rebook-reminder` (crear y `null`), `archive`, `unarchive` en PBA-0108 | OK; `null` pone `doneAt` y el detalle ya no lo lista |
| `confirm` PBA-0140, `decline` PBA-0141 | OK; repetir confirm → 409 |
| `match`: `looks_right`, `not_same` (PHONE, crea cliente sin `phoneE164`), `update_client` (BOTH, cambia el nombre), `keep` | OK; `not_same` sobre CONFLICT → 409 a propósito |

Todos los eventos quedaron con `actorType ADMIN` y `actorId 1`, incluidos confirm, decline y match.

**Arreglos en `database/seeds/dev-seed.js`:**
- Las `AWAITING_DEPOSIT` ya no reciben un pago de depósito (era la "trampa" de PBA-0138/0139).
- Las reservas futuras tenían `createdAt` y el evento `booking.requested` con fecha **futura**
  (usaban `daysAgo` negativo). Ahora se piden "ayer" (`requestedDaysAgo`). Comprobado: 0 eventos
  y 0 reservas con fecha futura.
- El seed se volvió a correr al final: la base quedó limpia (45 reservas, 34 pagos, 105 eventos).

**Abierto (decisión de producto, no se cambió):** las `AWAITING_DEPOSIT` con sesión ya pasada y
sin depósito (PBA-0135/0136/0137 del seed) caen en Follow-up como "Collect balance" / "Balance
due", porque `nextStepOf` en `Backend/services/booking-derive.js` solo mira el balance. Quizá
deberían decir "Deposit overdue" y sugerir Expire.
