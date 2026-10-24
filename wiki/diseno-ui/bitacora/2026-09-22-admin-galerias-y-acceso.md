---
tema: diseno-ui
fecha: 2026-09-22
---

# Panel admin, galerías y acceso de clientes

## Qué se hizo (en el lienzo "PhotosByAreli — Pantallas")

- **Admin · Bookings** (12 pantallas `AdminBookings*.dc.html`, desktop/tablet/móvil):
  pestañas Requests · Upcoming · Follow-up · Done · Expired · Cancelled; 4 métricas; búsqueda y
  filtro; vista calendario; panel de detalle con acciones: Confirm/Decline, Record deposit,
  **Mark as paid** (Zelle/Cash App/Cash), **Mark as expired** (depósito vencido → libera la
  fecha; Reopen), Reschedule, Cancel (con/sin reembolso), New booking manual.
- **Seguimiento después de la cita**: tabla Follow-up (saldo, galería, agradecimiento, reseña,
  siguiente paso) y checklist por cliente (Mark as paid → Create gallery → Mark delivered →
  Extend/Reopen → Send thank-you → Ask for review → Rebook reminder → Archive).
- **Editor de galería** (`Gallery*.dc.html`): crear desde la reserva → subida masiva
  (drag & drop real con `URL.createObjectURL`, cola con progreso y pausa) → organizar en sets
  (selección múltiple, mover, portada, ocultar, borrar) → portada (3 layouts) → ajustes
  (descargas, PIN, privacidad, favoritos con límite, marca de agua, compartir, vencimiento) →
  entregar por email → actividad (vistas, descargas, favoritos).
- **Al entregar** se generan automáticamente la **contraseña temporal** y el **PIN de
  descarga**; aparecen en la vista previa del email y en la pantalla "Gallery sent"
  (`GalleryDelivered.dc.html`) para copiarlos. En reenvíos: se conserva el PIN salvo que se
  active "Create a new download PIN"; si el cliente ya tiene cuenta no se crea contraseña.
- **Login compartido** (`Login`, `LoginFirstTime`, `LoginMobile`, `LoginMobileForgot`): mismo
  formulario para Areli y clientes; redirige por rol; primer ingreso obliga a crear contraseña;
  "Forgot password".
- **Galería del cliente** (`ClientGallery*.dc.html`): sets, favoritos con límite, visor,
  descarga con **PIN** → qué bajar (todo / favoritas / una) y tamaño (alta / web) → preparando
  → listo.
- Todos los "Client login" y "Log out" del lienzo apuntan al login.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Confirmación manual de cada reserva | usuario | — |
| Pagos por Zelle / Cash App fuera del sitio; registro manual | usuario | Así cobra hoy |
| Vista calendario en Bookings | usuario | — |
| Desktop + tablet primero; móvil responsivo y funcional | usuario | Uso real de Areli |
| Vista para marcar pagado / expirado y dar seguimiento post-cita | usuario | Seguimiento del cliente |
| Flujo de galería inspirado en Pixieset / Pic-Time / ShootProof | usuario pidió "lo que existe en el mercado"; agente eligió los referentes | UI conocida para clientes |
| Contraseña temporal + PIN **generados automáticamente al enviar** la galería | usuario | — |
| Login único para admin y clientes, con redirección por rol | usuario | — |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Lógica de Bookings (confirmar, pagar, expirar, reabrir, cancelar, seguimiento, archivar, calendario, búsqueda, nueva reserva) | Simulación en Node instanciando el componente y llamando a los handlers |
| Lógica del editor de galería (crear, subir, mover a set, nuevo set, privacidad, PIN, enviar, reenviar con/sin nuevo PIN) | Simulación en Node |
| Login (roles, error, primer ingreso) y galería del cliente (favoritos con límite, PIN correcto/incorrecto, opciones, visor) | Simulación en Node |
| Sintaxis y balance de `<sc-if>` / `<sc-for>` en cada pantalla | `node --check` + conteo |

**Lo que NO está verificado:** el render visual de estas pantallas en el lienzo (no se pudo
abrir claude.ai en el navegador integrado) y el drag & drop real de archivos dentro del iframe
del lienzo.

## Implicaciones para el backend (trabajo futuro, nada de esto existe aún)

`database/prisma/schema.prisma` hoy solo tiene `User`, `Gallery`, `Photo`. Para soportar el
diseño hará falta, como mínimo:

- Modelo **Booking** (tipo de sesión, paquete, extras, fecha/hora, lugar, datos del cliente,
  estado `request | awaiting_deposit | confirmed | cancelled | expired`, `dueBy`, historial) y
  **Payment** (monto, método Zelle/CashApp/Cash, fecha).
- Campos de seguimiento: `thanksSentAt`, `reviewStatus`, `reviewRequestedAt`, `rebookReminder`,
  `archivedAt`.
- En **Gallery**: estado draft/delivered, `deliveredAt`, `expiresAt`, portada y layout, modo de
  descarga, `downloadPinHash`, privacidad, favoritos on/límite, marca de agua, compartir;
  vínculo con Booking.
- En **Photo**: `set`, `hidden`, orden. Modelo **Favorite** (cliente ↔ foto). Log de actividad.
- Contraseña temporal al entregar reutilizando `User.mustChangePassword`; tokens de reset.
- **Seguridad**: guardar solo hashes del PIN y de la contraseña; la contraseña temporal se
  muestra una vez. Las descargas siempre por endpoint autenticado (skill `auth-gallery`).

## Trampas descubiertas

- En el lienzo, la navegación entre pantallas solo funciona con `<a href="Otra.dc.html">`; un
  botón con JS no puede navegar (por eso el login cambia entre `<a>` y `<button>` según el estado).
- Al usar `setState` con closures de `renderVals()`, varios clics seguidos sin re-render usan
  estado viejo (solo afecta a simulaciones, no al uso real).
- Antes de republicar una pantalla, comparar tamaños (`list` scope files) o hashes: el usuario
  edita el lienzo en vivo (ya editó la nota de "Confirm booking" y las páginas de servicio).

---
Relacionado: [[diseno-ui]] · [[2026-09-22-sitio-publico-y-reservas]]
