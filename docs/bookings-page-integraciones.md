# Página de reserva (`/bookings/:id`) — qué falta integrar de otros módulos

Fecha: 2026-10-04 · Para el agente que construya **Correos** o **Galleries** y deba conectarlos con
la página de una reserva. Relacionado: `docs/api-bookings.md` (§3 acciones, §4 correos pendientes,
§5 galería), `docs/correos.md`, `docs/almacenamiento-fotos.md`.

## 1. Cómo está armada la página

Una sola ruta para todas las etapas: `admin/src/app/pages/bookings/booking/`.

| Archivo | Qué hace |
|---|---|
| `index.jsx` | Página: barra superior (volver, anterior/siguiente, menú ⋯), identidad, progreso, tarjeta "Next step", cifras, bloques, columna del cliente, barra fija en móvil. |
| `stage.js` | **Lógica pura.** `stageOf()` (en qué paso del viaje va) y `describeNext()` (título, detalle y botones de la tarjeta). Todo sale de `derived.*` de la API. |
| `useNextStep.js` | Qué hace cada botón (thunks, formularios, navegación). Aquí se conectan las integraciones. |
| `NextStepCard.jsx` | La tarjeta "Next step" (un botón principal; los formularios se abren dentro). |
| `StageProgress.jsx` | Barra de progreso animada de 6 pasos. |
| `integrations.js` | **Interruptores de lo que depende de módulos que aún no existen** (esta guía). |

Los puntos de integración están marcados en el código con `INTEGRATION(nombre)`:

```
grep -rn "INTEGRATION(" admin/src
```

## 2. Cómo integrar una (receta de 3 pasos)

1. Construye el endpoint y su thunk en `admin/src/slices/bookings/` (misma forma que los demás: devuelve
   `{ ok: true } | { ok: false, error }`; usa `runAction` para refrescar la reserva, la lista y el resumen).
2. En `booking/integrations.js` de la entrada correspondiente: pon `ready: true` y rellena `run`
   (o `href`).
3. Verifica en el navegador con una reserva en esa etapa: el botón deja de estar deshabilitado, la nota
   `pendingNote` desaparece, el toast muestra `successMessage` y, tras la acción, `derived.nextStep` avanza
   solo (la tarjeta cambia al siguiente paso).

No hace falta tocar `stage.js` ni `NextStepCard.jsx`.

## 3. Integraciones pendientes

### 3.1 `thankYouEmail` — agradecimiento (módulo **Correos**)
- **Dónde:** paso `send_thanks` (`stage.js`), botón "Send thank-you". Código: `useNextStep.js`.
- **Qué debe pasar:** crear la fila en `EmailOutbox` + poner `thanksSentAt` + evento
  `followup.thanks_sent`, **en la misma transacción** (`docs/api-bookings.md` §4).
- **Contrato propuesto (sin confirmar):** `POST /api/admin/bookings/:id/thanks` → `{ ok }`.
  Thunk sugerido: `sendThankYouThunk(id)` con `runAction`.
- **Efecto esperado:** `derived.nextStep` pasa de `send_thanks` a `ask_review`.

### 3.2 `reviewRequestEmail` — pedir reseña (módulo **Correos**)
- **Dónde:** paso `ask_review`, botón "Ask for a review".
- **Qué debe pasar:** correo + `reviewStatus = REQUESTED`, `reviewRequestedAt`, evento
  `followup.review_requested`.
- **Contrato propuesto (sin confirmar):** `POST /api/admin/bookings/:id/review-request`.
- **Efecto esperado:** `nextStep` pasa a `waiting_review` (ahí ya existe "Mark received").
- La acción "Remind" (reenviar) del diseño comparte campo; ver duda D3.

### 3.3 `galleries` — crear / entregar galería (módulo **Galleries**)
- **Dónde:** pasos `create_gallery`, `deliver_gallery`, `deliver_gallery_overdue`; botón "Open Galleries".
- **Hoy:** solo navega a `/galleries` (la lista; decisión del usuario 2026-10-03: Bookings no crea ni entrega).
- **Integración:** cuando Galleries acepte un enlace directo, cambia `href` en `integrations.js` a algo como
  `` `/galleries?booking=${booking.id}` `` y pon `ready: true`.
- **Efecto esperado:** al entregar la galería, `galleryState.key = delivered` y `nextStep` avanza a `send_thanks`.

### 3.4 Fuera de la página hoy (para quien construya Correos)
Estas acciones del diseño **no** tienen botón todavía. Si se agregan, el sitio natural es el menú ⋯ de
`index.jsx` (`MoreMenu`) o la tarjeta "Next step":
- Send prep reminder (`booking.prep_reminder_sent`) · Resend payment instructions
  (`booking.payment_instructions_resent`) · New booking manual (`booking.created_manual`).
- Confirmar, declinar, cancelar, reagendar, vencer y reabrir **ya existen pero no avisan al cliente**
  (`docs/api-bookings.md` §4). La página no promete ningún correo en sus textos; si se agregan, actualiza el
  detalle de la tarjeta en `stage.js` (p. ej. "the client is emailed").

## 4. Dudas abiertas (no se resolvieron; decidir al integrar)

- **D1 — Endpoints.** Los contratos de §3 son propuestas; no existen en `Backend/`. ¿Rutas y nombres definitivos?
- **D2 — Qué pasa si el correo falla.** `thanksSentAt` debería ponerse al encolar o al enviar. La tarjeta
  asume "al encolar" (el botón desaparece al instante). ¿Se muestra "pendiente de envío" si el worker lo
  reintenta (`docs/correos.md` §5)?
- **D3 — Recordatorio de reseña.** ¿"Remind" reenvía el mismo correo? ¿Cuántos días tras pedirla? Hoy `waiting_review`
  solo ofrece "Mark received".
- **D4 — Deep link de Galleries.** ¿Parámetro de consulta (`?booking=`) o ruta (`/galleries/booking/:id`)?
- **D5 — Vista previa del correo.** ¿El usuario debe ver/editar el correo antes de enviarlo, o se envía directo
  con la plantilla (`docs/correos.md` §6, "Send test")? Si hay vista previa, el botón principal debería abrir
  un formulario dentro de la tarjeta, igual que "Record deposit".
- **D6 — Interruptor por plantilla apagado.** Si la plantilla está desactivada en Settings → Email
  (`docs/correos.md` §3.3), `ready` debería ser falso para esa entrada. ¿El backend lo expone en algún
  endpoint de configuración para que el admin lo lea?
- **D7 — Anterior / siguiente.** Recorre los elementos de la lista que el store tiene cargada (una página); al
  llegar al borde no salta a la siguiente página. ¿Basta o se quiere recorrer toda la pestaña?

## 5. Qué NO es una integración (ya funciona)

Confirmar, declinar, registrar depósito/pago, reagendar, cancelar, vencer, reabrir, archivar, desarchivar,
marcar reseña recibida y programar recordatorio de re-reserva usan los thunks de `slices/bookings/thunks.js`.

## Añadido 2026-10-04 — correo de "New booking"

`newBookingEmail` en `integrations.js` (usado por el interruptor de `new/Summary.jsx`, marcado
`INTEGRATION(newBookingEmail)`). Detalle y reglas: `docs/nuevo-booking-admin.md` §5.
