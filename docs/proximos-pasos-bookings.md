# Bookings — próximos pasos

Fecha: 2026-10-04 · Estado: lo construido compila y pasa lint, **pero no se ha visto en el navegador ni contra
la base de datos real**. Este archivo es la cola de trabajo y, al final, lo que hay que saber sobre las reservas
cuando llegue el momento de documentar el sitio.

Relacionado: `docs/api-bookings.md` · `docs/bookings-page-integraciones.md` · `docs/correos.md` ·
`wiki/admin/bitacora/2026-10-04-ui-bookings-sesion.md`.

---

## 1. Primero: verificar lo ya hecho (30 min)

Reinicia el backend (cambió la regla de sesión pasada) y recarga el admin. Revisa en **claro y oscuro** y con
**Hairlines y Shadow** (Display → Sections).

- [ ] **Página única `/bookings/:id`**: abre una reserva de cada pestaña (Requests, Upcoming, Follow-up, Done,
      Expired, Cancelled). Todas muestran la misma estructura.
- [ ] **Volver (←)** regresa a la pestaña de origen; con el enlace pegado directo va a `/bookings`.
- [ ] **Anterior / siguiente** ("3 of 20") recorre la lista de la pestaña.
- [ ] **Progreso animado**: confirma una solicitud y mira cómo avanza a Deposit; registra un depósito y avanza a
      Confirmed.
- [ ] **Request**: Confirmar, Declinar (menú ⋯, con motivo), revisión de cliente (PHONE, CONFLICT, detalles cambiados).
- [ ] **Pago de más**: en "Mark as paid" escribe un monto mayor al saldo → aparece el modal; "Cancel" vuelve al
      formulario; "Save" registra y deja el saldo en $0. El historial dice "over the balance (confirmed by admin)".
- [ ] **Sesión pasada**: una reserva confirmada cuya hora ya pasó aparece en **Follow-up** con paso "Create the
      gallery". Una futura sigue en Upcoming.
- [ ] **Móvil**: el botón principal fijo abajo no tapa contenido; el progreso se ve como "Step 3 of 6".
- [ ] **Filtros retráctiles** (barra "Filters"): abrir/cerrar, contador de filtros activos, íconos lista/calendario.
- [ ] **Contraste en oscuro**: paginación, checkboxes del filtro Service, fechas del calendario (inicio, fin y rango).
- [ ] **Tablas**: sin dos líneas bajo la barra de filtros.

## 2. Decisiones que necesita el usuario

| # | Decisión | Estado actual | Dónde |
|---|---|---|---|
| 1 | ¿"Pasada" cuando **empieza** la sesión o cuando **termina**? | Cuando empieza. Una sesión en curso ya cuenta como pasada y no se puede reagendar. | `wiki/admin/bitacora/2026-10-04-regla-sesion-pasada.md` |
| 2 | ¿Separar la **propina** del precio de la sesión? | No: el exceso solo queda en el historial del evento. | Pago de más (`ActionForms.jsx`, `booking.model.js`) |
| 3 | ¿"Source" y "Match" visibles en la ficha del cliente? | Sí ("Came from", "Client record") | `booking/ClientCard.jsx` |
| 4 | "48 h" del depósito está escrito en el texto de la tarjeta | Debe leerse de `depositDueHours` de settings | `booking/stage.js` |
| 5 | Anterior/siguiente: ¿cruzar de página al llegar al borde de la lista? | No | `booking/index.jsx` (`useNavigation`) |

## 3. Trabajo que depende de otros módulos

Ya hay interruptores listos en `admin/src/app/pages/bookings/booking/integrations.js` (receta de tres pasos y
dudas D1–D7 en `docs/bookings-page-integraciones.md`).

1. **Correos** (`docs/correos.md`): agradecimiento, pedir reseña, recordatorio de preparación, reenviar
   instrucciones de pago, y avisar al cliente al confirmar/declinar/cancelar/reagendar/vencer/reabrir.
2. **Galleries** (`docs/almacenamiento-fotos.md`): crear y entregar galería, y enlace directo desde la reserva.
3. **New booking** (reserva manual): hoy el botón está deshabilitado ("Coming next").

## 4. Pendientes técnicos

- [ ] Limpiar el store: `bookingId`/`openBooking` quedaron solo como estado interno de la página de reserva; el
      drawer ya no existe (`admin/src/slices/bookings/store.js`).
- [ ] Pruebas del backend para `deriveBooking`/`tabWhere` con la regla nueva (cruce de medianoche, sesión en curso,
      zona `America/Phoenix`).
- [ ] Pruebas del pago de más (con y sin `allowOverpay`, en depósito y en saldo).
- [ ] Revisar el resto del admin con la regla de contraste en oscuro (Clients, Galleries, Services, Mail, Settings) cuando se construyan.
- [ ] `Backend`: el resumen `paymentsPendingCents` y `sessionsThisWeek` cambian de valor con la regla nueva; confirmar con datos reales.

## 5. Siguiente trabajo sugerido (orden)

1. Verificación del §1 y arreglar lo que salga.
2. Decisiones 1 y 4 del §2 (las dos afectan lo que ve el usuario cada día).
3. Pruebas del backend (§4).
4. Módulo **Correos** → activa agradecimiento y reseña en la página (solo cambiar `integrations.js`).
5. Módulo **Galleries** → activa el enlace directo y la entrega.
6. "New booking" manual.

---

## 6. Para la documentación del sitio: lo que hay que saber sobre las reservas

Cuando se escriba la documentación del sitio (para Areli o para desarrolladores), estos puntos **no se
deducen del código a simple vista**:

### Ciclo de vida de una reserva

`REQUEST` (solicitud) → `AWAITING_DEPOSIT` (confirmada, espera depósito) → `CONFIRMED` (depósito recibido) →
sesión → seguimiento (cobrar saldo, galería, agradecimiento, reseña, recordatorio de re-reserva) → archivada (Done).
Salidas: `DECLINED`, `CANCELLED`, `EXPIRED` (el depósito no llegó a tiempo y se liberó la fecha; se puede reabrir
si la sesión es futura).

### Reglas que se aplican solas

- **Sesión pasada:** en cuanto su hora de inicio ya ocurrió (zona `America/Phoenix`). Decide la pestaña, el paso
  siguiente y que ya no se pueda reagendar. Detalle y decisión abierta: `wiki/admin/bitacora/2026-10-04-regla-sesion-pasada.md`.
- **Depósito:** al confirmar, el cliente tiene `depositDueHours` (48 por defecto) para pagar. Pasado ese plazo la
  reserva se marca como "depósito vencido" y se puede liberar la fecha ("Mark as expired").
- **Reagendar:** solo reservas activas y futuras, **sin límite de veces** (decisión del usuario, 2026-10-05). `maxReschedules` en `StudioSettings` ya no se usa.
- **Galería:** se promete entregar en `galleryDeliveryDays` (14 por defecto) desde la sesión.
- **Archivar:** solo con saldo en $0 y galería entregada.
- **El siguiente paso lo calcula el backend** (`derived.nextStep`), en este orden: cobrar saldo → crear galería →
  entregar galería → agradecer → pedir reseña → esperar reseña → recordatorio de re-reserva → archivar.

### Pagos (no pasan por el sitio)

- Se registran a mano, después de comprobar Zelle o Cash App (o efectivo). El sitio no cobra.
- Pagado = depósitos + saldos − reembolsos.
- **Pago de más:** si el monto supera lo que falta, el sistema pide una confirmación manual. Si se acepta, queda
  registrado en el historial como "over the balance (confirmed by admin)" y el saldo queda en $0. No existe un campo
  separado de propina.
- Cancelar con reembolso crea un movimiento de reembolso por lo pagado.

### La página de reserva

- Una sola ruta, `/bookings/:id`, para todas las etapas. La tarjeta "Next step" dice qué hacer ahora; hay una barra
  de progreso de seis pasos (Request, Deposit, Confirmed, Session, Follow-up, Done).
- Lo destructivo (cancelar, declinar) está en el menú ⋯, con confirmación.
- El admin respeta el ajuste **Sections** (Hairlines o Shadow) y funciona en claro y oscuro.

### Lo que todavía **no** hace el sistema (decirlo claro en la documentación)

- **No manda correos al cliente** en ninguna acción: ni al confirmar, ni al declinar, cancelar o reagendar, ni el
  agradecimiento ni la reseña. Hasta que exista el módulo Correos, Areli debe avisar por su cuenta.
- **No crea ni entrega galerías desde la reserva**: solo enlaza a la lista de Galleries.
- **No crea reservas manuales** (botón "New booking" deshabilitado).

### Dónde leer más

`docs/api-bookings.md` (API y reglas), `docs/bookings-page-integraciones.md` (pendientes por módulo),
`docs/correos.md`, `database/handoff.md` (modelo de datos), `wiki/admin/` (bitácora de decisiones).
