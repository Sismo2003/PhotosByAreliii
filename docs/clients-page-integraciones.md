# Clients — qué falta integrar de otros módulos

Fecha: 2026-10-04 · Para el agente que construya el **login del cliente**, **Correos** o **Galleries**.
Contrato de la API: `docs/api-clients.md`. Puntos de integración en el código: `grep -rn "INTEGRATION(" admin/src`.

## 1. Estado

La página Clients (`admin/src/app/pages/clients/`) está completa **salvo** lo que depende de módulos que no
existen. Decisión del usuario: sin login de cliente todavía, la pantalla **solo muestra** su estado
(No login yet / Invite sent / Active) en la tabla y en el bloque "Gallery login" del perfil. No hay botones de invitar.

## 2. Qué se conecta después

| Qué | Dónde se enchufa | Qué cambia al estar listo |
|---|---|---|
| Crear login e invitar, reenviar invitación, restablecer contraseña | `client/index.jsx`, bloque "Gallery login" (`INTEGRATION(login)`) | Botones según `client.login.state`: `none` → "Create login & send invite", `invited` → "Resend invite", `active` → "Send password reset". El diseño los tiene (`AdminClients.dc.html`). |
| Casilla "Create their gallery login now" en Add client | `clients/new/index.jsx` | Agregar la casilla del diseño; el backend `POST /` aceptaría `createLogin`. |
| Aviso por correo al cambiar el email | `Backend/models/client.model.js` (`update`, rama `email`) | Encolar el correo al nuevo email. Hoy solo cambia `User.email` y se escribe `client.email_changed`. |
| Galerías del cliente (enlace al editor, estado) | perfil: bloque Sessions ya muestra `derived.galleryState` | Agregar enlace a Galleries cuando exista la ruta. |
| Botón para restaurar un cliente borrado | — | `POST /:id/restore` ya existe; falta una vista de "borrados" si Areli la quiere. |

## 3. Dudas abiertas (declaradas, para el agente que integre)

- **D1.** ¿Cuándo se crea el `User` del cliente? (`database/handoff.md` D2): al entregar la primera galería, al
  agregar al cliente, o con un botón. Cambia la casilla de Add client y el texto del bloque "Gallery login".
- **D2.** ¿Qué pasa con el login de un cliente **borrado** y luego restaurado? Hoy el login queda bloqueado mientras
  `deletedAt` esté puesto y vuelve solo al restaurar.
- **D3.** Un cliente borrado conserva su email y teléfono: si vuelve a reservar por `/book`, se une a ese cliente
  oculto. ¿Debe restaurarse solo, o crear uno nuevo? Falta decidirlo cuando se construya el formulario público.
- **D4.** "Balance due" del perfil es total − pagado de **todas** las sesiones activas (incluye depósitos futuros);
  Bookings > "Payments pending" usa el depósito en las futuras. ¿Se unifican?
