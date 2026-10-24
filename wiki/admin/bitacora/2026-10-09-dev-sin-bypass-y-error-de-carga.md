---
tema: admin
fecha: 2026-10-09
---

# `npm run dev` con login real, error de carga de páginas y reserva que no aparece en Bookings

Continuación de [[2026-10-09-bugs-auditoria-datos-y-sesion]] y de [[2026-10-09-seeds-con-autorizacion-y-base-limpia]].

## Qué se hizo

- **Fuera el bypass de login (pedido del usuario).** `admin/package.json`: `dev` es ahora `vite` y se
  borró `dev:auth`. Se eliminó `admin/src/configs/dev.config.js` y todo uso de `AUTH_BYPASS` /
  `DEV_USER` (`app/contexts/auth/Provider.jsx`, `middleware/GhostGuard.jsx`, `app/pages/Auth/index.jsx`).
  `npm run dev` exige el Backend (proxy `/api` → `localhost:4000` o `VITE_API_PROXY`) y una base con un
  usuario ADMIN. Docs actualizadas: `admin/README.md`, `handoff.md`, `wiki/README.md`, [[admin]].
- **Pantalla "Something went wrong" de ~1 s al cambiar de página.** `admin/src/app/pages/errors/RootErrorBoundary.jsx`:
  si el error es de carga de un archivo de la página (`Failed to fetch dynamically imported module`,
  `Outdated Optimize Dep`…), recarga la página **una vez** (guarda la hora en `sessionStorage`; un segundo
  fallo dentro de 15 s sí muestra el error, para no entrar en un ciclo).
- **Nueva reserva fallaba con la base vacía** (`depositCents: NaN`): ver la corrección de
  `SETTINGS_FALLBACK` en [[2026-10-09-seeds-con-autorizacion-y-base-limpia]].

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Quitar el bypass por completo, no solo cambiar el script | usuario pidió que `npm run dev` use siempre la autenticación | un bypass que sigue en el código puede reactivarse sin querer |
| Recargar una vez ante error de carga de archivo en lugar de mostrar el error | agente | un error transitorio de carga no es un fallo de la página |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| `npm run dev` + Backend | `GET /api/auth/me` por el proxy de Vite llegó al Backend (401 sin cookie) y `/admin/` respondió 200; `lint` y `build` limpios; `dist/` sin `areli@dev.local` |
| Reserva sin fila de ajustes | reserva de prueba creada con el modelo: total $175, depósito $87.50; se borró |

**Lo que NO está verificado:**
- **La causa de la pantalla de error de 1 s es una hipótesis.** No se reprodujo (no se abrió el navegador sin permiso
  del usuario). Si sigue apareciendo, abrir la consola del navegador (F12) y copiar el mensaje en rojo.
- Nada de esto se vio en el navegador.

## Problema abierto: la reserva PBA-0002 sale en el perfil del cliente pero no en `/bookings`

Reportado por el usuario tras crear una reserva a mano. **No se diagnosticó**: se interrumpió antes de llamar
al listado. Lo que ya se sabe (consulta directa a la base, 2026-10-09):

- `bookings`: una fila, `PBA-0002`, `status = CONFIRMED`, `source = MANUAL`, `startsAt = 2026-10-11 17:00 UTC`,
  `archivedAt = NULL`, `clientId = 1`. Por esas columnas debería caer en la pestaña **Upcoming**
  (`tabWhere('upcoming')` en `Backend/services/booking-derive.js`: estado activo y `startsAt >= ahora`).
- `payments`: una fila `DEPOSIT` de **$160** (16 000 centavos) sobre un total de $160 y un depósito de $80
  (8 000): el historial dice "$160 deposit received · Zelle — booking confirmed", o sea el pago se registró
  después de crear la reserva y como depósito completo. Conviene revisar si eso es lo esperado.
- El ID `PBA-0002` y no `0001`: la reserva `0001` de la prueba anterior se borró, pero el contador de
  `AUTO_INCREMENT` siguió.

Siguiente paso: llamar `GET /api/admin/bookings?tab=upcoming` (con la cookie del admin) y mirar qué responde;
revisar el filtro y el estado de la pestaña en la URL del admin (`admin/src/app/pages/bookings/`), y si el
listado usa joins (`ROW_INCLUDE`, `listBookings` en `Backend/models/booking.model.js`) que excluyan la fila.

---
Relacionado: [[admin]] · [[2026-10-09-bugs-auditoria-datos-y-sesion]] · [[2026-10-09-seeds-con-autorizacion-y-base-limpia]] · [[2026-10-04-nuevo-booking-admin]]
