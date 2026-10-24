# Auditoría del proyecto — 2026-10-09

Revisión de código de `Backend/`, `admin/`, `database/` y `deploy/`. Se leyó todo el backend
(~6 000 líneas). Del admin se revisaron auth, rutas, axios y guards, y se corrieron `lint` y `build`.
También se revisaron la configuración de Docker/nginx y `npm audit`. **No se levantó nada ni se
probó en el navegador.**

Resultados rápidos:
- `admin`: `npm run lint` con 0 errores, `npm run build` OK (un chunk de 582 kB) y `npm audit` con 0
  vulnerabilidades. El bypass de login (`areli@dev.local`) **no** aparecía en `dist/` y desde el 2026-10-09 ya no existe en el código.
- `Backend`: `npm audit` encuentra **8 vulnerabilidades (7 altas)**, en `sharp` 0.35.4, `mariadb`,
  `mysql2`, `deepmerge-ts` (vía prisma) y `source-map-js`.
- **No hay ni una prueba automatizada** en el repo (ningún `*.test.*` ni script `test`).
- `Frontend/` (sitio público) solo tiene `package.json`.

---

## 1. Seguridad

### Alta: corregir antes de producción

| # | Problema | Dónde | Arreglo sugerido |
|---|---|---|---|
| S1 | **Login sin límite de intentos.** Se puede probar contraseñas por fuerza bruta contra el admin (email o teléfono). nginx tampoco limita. | `Backend/routes/auth.routes.js:7`, `deploy/nginx/photosbyareliii.conf` | `express-rate-limit` en `/api/auth/login` (p. ej. 10 intentos / 15 min por IP + por identificador) y/o `limit_req` en nginx. |
| S2 | **Dependencias con vulnerabilidades altas**: `sharp` <0.35.5 (procesa archivos subidos), driver `mariadb`, `mysql2`. | `Backend/package.json` | `npm audit fix` y subir `sharp` a ≥0.35.5. Volver a probar la subida de fotos. |
| S3 | **`GALLERY_ENC_KEY` opcional**: sin ella la clave del PIN y la contraseña de galería se derivan de `JWT_SECRET`. Si algún día se rota el JWT, todos los PIN y contraseñas quedan ilegibles (`decrypt` devuelve `null` sin error). | `Backend/utils/crypto.js:8` | Lanzar error al arrancar si `NODE_ENV=production` y falta `GALLERY_ENC_KEY`. |
| S4 ✅ | **El dev seed borra todo sin protección** (resuelto 2026-10-09: pide `CONFIRM_SEED=yes` y solo corre contra una base local): `node seeds/dev-seed.js` vacía clientes, reservas, pagos, galerías y correos de la base que tenga `DATABASE_URL`. Basta un `.env` equivocado para borrar producción. | `database/seeds/dev-seed.js:195` | Negarse a correr si `NODE_ENV=production` o si el host de `DATABASE_URL` no es `localhost`/`mysql`. |
| S5 | **MySQL y Prisma Studio de desarrollo abiertos a la red** (`0.0.0.0:3306` con `root/root` y `pba/pba`, `0.0.0.0:5555`). Prisma Studio da acceso total a la base sin login. En un wifi público cualquiera puede leer o borrar datos. | `database/docker-compose.yml:13`, `:30` | Publicar como `"127.0.0.1:3306:3306"` y `"127.0.0.1:5555:5555"`. |

### Media

| # | Problema | Dónde | Arreglo sugerido |
|---|---|---|---|
| S6 | **Cambiar la contraseña no pide la actual**, y el JWT dura 7 días sin forma de revocarlo: con una cookie robada se puede cambiar la contraseña y la sesión robada sigue sirviendo. Logout tampoco invalida el token. | `Backend/controllers/auth.controller.js:86`, `:51` | Pedir `currentPassword`. Guardar `passwordChangedAt` (o `tokenVersion`) en `User` y rechazar los JWT emitidos antes. |
| S7 | **Los 500 devuelven `error.message` interno** (mensajes de Prisma/MySQL con nombres de tablas). Pasa en login, `me`, `change-password` y `requireAdmin`. El resto usa `sendError`, que sí lo oculta. | `auth.controller.js:58,82,97`, `auth.middleware.js:39` | Usar `sendError` en todos. |
| S8 | **Sin cabeceras de seguridad en la API ni en el sitio** (no hay `helmet`; nginx solo pone HSTS). El admin sí pone X-Frame-Options/nosniff en su contenedor. | `Backend/app.js`, `deploy/nginx/photosbyareliii.conf` | `helmet()` en Express y CSP básica en nginx para `/`. |
| S9 | **Un cliente borrado (soft delete) conserva su sesión**: `requireAuth` no mira `deletedAt` (solo `/me` lo mira), así que puede seguir usando `change-password`. Hoy no importa porque el portal de clientes no existe, pero sí importará cuando exista. | `Backend/middlewares/auth.middleware.js:19` | Cargar al usuario en `requireAuth` (o en un `requireClient`) y rechazar si `client.deletedAt`. |

### Baja

- **Enumeración por tiempo en el login**: un usuario inexistente responde al instante y uno
  existente tarda lo de argon2 (`auth.controller.js:42`). Arreglo: verificar contra un hash falso.
- **`password`/`newPassword` sin validar el tipo**: si mandan un objeto, argon2 lanza error y la
  respuesta es un 500 (`auth.controller.js:46`, `:88`).
- **El tipo de archivo se valida solo por el MIME que manda el navegador.** sharp también abre
  TIFF/GIF/SVG, así que un archivo que diga `image/jpeg` se guarda como `original.jpg` aunque no lo
  sea (`services/storage.js:100`). Solo lo sube y lo ve el admin. Arreglo: comprobar
  `metadata().format`.
- **`guardUpload` reserva 0 bytes si no llega `Content-Length`** (subida chunked), y entonces la
  revisión de espacio deja pasar todo (`middlewares/upload.middleware.js:26`). multer sigue
  limitando a 20 × 50 MB.
- **Login por teléfono ambiguo**: `findFirst` con `OR` sobre `User.phoneE164` y `Client.phoneE164`,
  y `assertFree` no revisa el teléfono de Areli (`models/user.model.js:17`). Si un cliente tiene el
  mismo teléfono que Areli, el login con ese número entra a una sola de las dos cuentas.
- Código muerto que confunde: `Backend/config/uploads.js` (habla de 30 MB y de `uploads/`) y
  `Backend/models/photo.model.js` (usa campos que ya no existen). No los importa nadie.

---

## 2. Bugs

> ✅ = corregido el 2026-10-09 (B1, B2, B4, B5, B7; B8 ya no aplica al admin: `mustChangePassword` es del cliente y su pantalla está en `Frontend/src/components/portal/ChangePassword.jsx`), también S6 (parcial: pide la contraseña actual y revoca sesiones al cambiarla; el logout sigue sin invalidar el token), S7 en auth y S9. Detalle y qué falta por probar en el navegador: `obsidian/admin/bitacora/2026-10-09-bugs-auditoria-datos-y-sesion.md`. Se cambió además: el teléfono es obligatorio al crear un cliente a mano.

| # | Bug | Dónde | Efecto |
|---|---|---|---|
| B1 ✅ | **"Update client" desde una request cambia `Client.email` pero no `User.email`.** La edición en Clients sí sincroniza los dos. | `Backend/models/booking.model.js:505` | El cliente sigue entrando con el email viejo y ya no con el nuevo. Los dos registros quedan distintos. |
| B2 ✅ | **Nueva reserva manual: si el email no existe pero el teléfono sí, la reserva se pega en silencio al dueño del teléfono.** El email que se escribió se pierde y el nombre del cliente existente se sobrescribe con el que se tecleó. | `Backend/models/booking-create.model.js:245`, `:249-252` | Datos de un cliente mezclados con los de otro. Debería responder 409 (como en CONFLICT) o pedir confirmación. |
| B3 | **Nueva reserva acepta servicios en DRAFT/HIDDEN, paquetes ocultos y clientes borrados** (el catálogo del formulario los filtra; el backend no). | `booking-create.model.js:105-108`, `:232` | Se pueden reservar cosas que no se ofrecen o a un cliente borrado si llamas a la API directo o con un borrador viejo. |
| B4 ✅ | **Cada PATCH de galería escribe "Settings updated: favoritesEnabled"** aunque solo cambie el título, porque `favoritesEnabled=false` y `downloadPinEnc=null` siempre entran en `data`. El `return` de "nada que cambiar" nunca se alcanza. | `Backend/models/gallery.model.js:261`, `:273` | El historial se llena de entradas falsas. |
| B5 ✅ | **Cambiar a mano la fecha de vencimiento no reinicia `expiryReminderSentAt`** (Extend sí lo hace). | `gallery.model.js:263-269` | Si el aviso de 48 h ya salió y Areli mueve la fecha más adelante, el nuevo aviso no se manda y las fotos se borran sin avisar (cuando se active `GALLERY_AUTO_DELETE`). |
| B6 | **Galería vencida con las fotos todavía en disco**: Deliver responde "Its photos are gone" aunque el borrado automático esté apagado. | `gallery.model.js:463` | Mensaje falso. Además no hay forma de reabrirla aunque las fotos sigan ahí. |
| B7 ✅ | **El admin no reacciona a un 401**: si la sesión vence con la pantalla abierta, todo falla con errores sueltos y no te manda al login. | `admin/src/utils/axios.js:13` | Areli ve errores en lugar de "inicia sesión de nuevo". Falta un interceptor que mande al login. |
| B8 ↪ | **`mustChangePassword` no se respeta (replanteado: es del cliente, no del admin)** (el backend lo devuelve y nadie lo usa). | `admin/src/app/contexts/auth/Provider.jsx` | Una contraseña temporal sigue sirviendo para siempre. |
| B9 | **Ordenar clientes por "Recent activity" ignora asc/desc.** | `Backend/models/client.model.js:203` | El botón de orden no hace nada en esa columna. |
| B10 | **Rebook reminder desde una reserva funciona en cualquier estado** (cancelada, declinada, request). | `booking.model.js:740` | Se pueden crear recordatorios en reservas muertas. |
| B11 | **Al cancelar con "refund" se devuelve todo lo pagado (depósito + saldo), pero el texto dice "deposit".** "Keep" también se queda con el saldo. | `booking.model.js:610-627` | Pregunta de negocio: ¿al cancelar se devuelve solo el depósito o todo? |
| B12 | Slug único de galería/servicio: si se crean dos con el mismo nombre al mismo tiempo, choca el índice único y la respuesta es un 500. | `gallery.model.js:40`, `service.model.js:21` | Raro con un solo admin. Basta con reintentar si llega P2002. |
| B13 | Reglas del proyecto (Luxon): `new Date()` en `gallery.model.js:430` y `new Date(iso).getTime()` en `admin/src/app/pages/bookings/new/schema.js:69`. | — | Funcionan, pero rompen la regla de `CLAUDE.md`. |

### Bloqueadores de despliegue (no son bugs del código)

- **El Backend importa Prisma desde `../../database/generated/…`** (`Backend/config/db.js:5`), pero
  el compose construye `api` con `context: ../Backend`, así que la imagen no puede ver `database/`.
  Hay que cambiar el contexto a la raíz o generar el cliente dentro de `Backend/`.
- Faltan `Backend/Dockerfile`, `Frontend/Dockerfile`, `deploy/setup-storage.sh`, `deploy/api.env` y
  `deploy/mysql.env`.
- **Nadie corre `prisma migrate deploy` en producción** (solo el compose de dev).
- No hay respaldos de MySQL ni de `/srv/pba/photos`.
- `mysql` no tiene healthcheck y `api` arranca sin esperarlo.
- Si `api.env` no trae `NODE_ENV=production`, la cookie de sesión sale **sin `Secure`**.

---

## 3. Inventario: lo que tenemos

### Backend (Express 5 + Prisma 7 + MySQL), puerto 4000

| Módulo | Endpoints | Qué hace |
|---|---|---|
| **Auth** `/api/auth` | `POST /login`, `POST /logout`, `GET /me`, `POST /change-password` | Login con email **o teléfono** (libphonenumber), argon2, JWT en cookie httpOnly de 7 días, rol re-verificado en la BD para el admin. |
| **Bookings** `/api/admin/bookings` | `GET /`, `GET /summary`, `GET /calendar`, `GET /requests`, `GET /requests/calendar`, `GET /:id`, `POST /` (nueva manual), `GET /new/catalog`, `GET /new/clients`, `GET /new/client-lookup` | 6 pestañas (requests, upcoming, follow-up, done, expired, cancelled), búsqueda (también por teléfono normalizado), conflicto del mismo día, estados calculados (pago, siguiente paso, galería). |
| | `POST /:id/confirm`, `/decline`, `/match` | Aceptar/declinar requests; revisar el emparejamiento de cliente (PHONE/CONFLICT, detalles cambiados). |
| | `POST /:id/payments`, `/reschedule`, `/cancel`, `/expire`, `/reopen`, `/archive`, `/unarchive`, `/review-received`, `/rebook-reminder` | Pagos manuales (Zelle/Cash App/efectivo, pago de más confirmado), reagendar, cancelar con reembolso o sin él, vencer/reabrir, archivar, reseña, recordatorio de re-reserva. Todas con actualización condicional (sin carreras) y un ActivityEvent. |
| **Clients** `/api/admin/clients` | `GET /summary`, `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `PUT /:id/rebook-reminder`, `DELETE /:id`, `POST /:id/restore` | Lista con pestañas y orden, perfil con sesiones e historial, alta, edición (sincroniza el email del login), soft delete y restaurar. |
| **Galleries** `/api/admin/galleries` | `GET /summary`, `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `GET /:id/activity` | Crear desde una reserva o un cliente, ajustes (privacidad, PIN y contraseña cifrados AES-GCM, descargas, favoritos, marca de agua), borrar con sus archivos. |
| | `POST/PATCH/DELETE /:id/sets…` | Sets de fotos. |
| | `POST /:id/photos`, `/photos/bulk`, `GET /photos/:pid/info`, `POST /photos/:pid/edit`, `/focus`, `GET /photos/:pid/:variant`, `PUT /:id/cover` | Subida con control de disco (507), copias web/thumb con metadatos de derechos, EXIF, edición del original (rotar, enderezar, recortar, redimensionar), punto de foco automático (ONNX) o manual, mover/ocultar/elegir/borrar en lote, portada. |
| | `POST /:id/deliver`, `/extend` | Entregar (90 días, PIN) y extender. **El correo no sale** (falta el módulo Correos). |
| **Storage** `/api/admin/storage` | `GET /`, `POST /check` | Barra de disco (OK/LOW/CRITICAL/FULL, bloqueo con 500 MB libres). |
| **Services / Extras** | `/api/admin/services/*`, `/api/admin/extras/*` | CRUD de servicios, paquetes y add-ons, reordenar, qué add-ons permite cada servicio, protección contra borrar lo que ya tiene reservas. |
| **Overview** `/api/admin/overview` | `GET /bookings`, `/storage`, `/visits` | Requests por mes, agenda de 14 días, disco por galería y visitas de Cloudflare (sin configurar). |
| **Tareas** | `gallery-cleanup` cada hora | Limpia tmp y carpetas huérfanas. Borra las galerías vencidas solo con `GALLERY_AUTO_DELETE=1` (apagado). |

### Admin (React 19 + Vite + Tailwind), `/admin/`

| Página | Estado |
|---|---|
| Login (email o teléfono, Show/Hide) | Hecho |
| Overview (agenda, gráfica de requests, disco, visitas) | Hecho. Sin ver en el navegador. |
| Bookings: tabla de 6 pestañas, calendario, página de reserva con progreso y acciones, nueva reserva (borrador en localStorage) | Hecho. Sin QA completo en el navegador. |
| Clients: lista, perfil, alta, edición, recordatorio, borrar/restaurar | Hecho. Sin ver en el navegador. |
| Galleries: lista, crear, editor (fotos, sets, portada, ajustes, actividad, visor con zoom/edición/foco, entrega) | Hecho. Sin ver en el navegador. |
| Services: catálogo, paquetes, add-ons, reordenar | Hecho. |
| **Mail** | Página vacía (20 líneas) |
| **Settings → Studio / Email / Email templates** | Páginas vacías (9 líneas cada una) |
| Layouts Sideblock/Main, Display, tema oscuro, barra de disco | Hecho |

### Base de datos

23 tablas y 8 migraciones. Seed base (admin, settings, catálogo, horarios provisionales) y dev seed
(45 reservas de ejemplo).

---

## 4. Lo que falta construir

1. **Sitio público (`Frontend/`, Astro)**: landing, servicios, sub-landings, SEO, `site.js` y
   `services.json`. No hay nada.
2. **Formulario público `/book`** y su endpoint (`docs/formulario-publico-booking.md`): hoy las
   requests solo llegan del seed. Necesita rate-limit y captcha o honeypot.
3. **Portal del cliente**: login de cliente, galería `/g/<slug>` (contraseña, PIN, descargas, ZIP,
   favoritos), "Preview as client", y las métricas de vistas y descargas.
4. **Correos** (`docs/correos.md`): SMTP de Hostinger, 25 plantillas, outbox, bandeja Mail, Settings →
   Email/Templates, aviso de 48 h antes de vencer la galería (y entonces activar el borrado
   automático), entrega de galería, gracias y reseña, cambio de email.
5. **Cuentas de cliente**: crear o invitar el `User` del cliente, restablecer contraseña (la tabla
   `PasswordResetToken` existe y no se usa) y forzar `mustChangePassword`.
6. **Settings → Studio** (depósito %, horas, horarios, fechas bloqueadas): hoy solo con el seed.
7. **HEIC** (convertir en el navegador o compilar sharp con libheif).
8. **Despliegue**: Dockerfiles, `setup-storage.sh`, migraciones en producción, respaldos, TLS/certbot y
   monitoreo.
9. **Pruebas automatizadas**: hoy no hay ninguna.

---

## 5. Plan de QA

Marcar cada punto en desktop, tablet y móvil, y en tema claro y oscuro donde aplique.

### 5.1 Pruebas automatizadas (prioridad)
- [ ] Unitarias de `services/booking-derive.js` (`tabOf`, `paidCents`, `pendingCents`, `nextStepOf`,
      `archiveBlocker`): medianoche en Phoenix, sesión en curso, reembolsos, depósito 0.
- [ ] Unitarias de `utils/date.js`, `utils/phone.js`, `utils/crypto.js` y `photo-edit.inscribed`.
- [ ] Integración (supertest + MySQL de Docker): cada endpoint con 401 sin cookie, 403 con un
      cliente, 400 con un body inválido y 404 con un id inexistente.
- [ ] Carreras: dos `confirm` o dos `payments` a la vez → uno 200 y el otro 409.

### 5.2 Auth
- [ ] Login con email (también en mayúsculas) y con teléfono en 3 formatos; contraseña mala → 401.
- [ ] Un cliente que entra al admin ve el mensaje y se le cierra la sesión.
- [ ] Logout; cookie `Secure` en producción; la sesión vence a los 7 días.
- [ ] Cliente borrado → no puede entrar.
- [ ] (tras S1) Rate limit: el intento 11 responde 429.

### 5.3 Bookings
- [ ] Requests: confirmar, declinar con motivo, looks_right / not_same / update_client / keep
      (verificar B1).
- [ ] Nueva reserva: cliente nuevo, existente por búsqueda, por email, por teléfono (verificar B2),
      conflicto; extras con cantidad; ajuste negativo; pago NONE/DEPOSIT/FULL; borrador tras recargar.
- [ ] Pagos: depósito confirma la reserva; pago de más con y sin confirmar; ya pagado.
- [ ] Reagendar (fecha pasada rechazada), cancelar keep/refund (B11), vencer, reabrir, archivar
      (bloqueos: saldo, galería sin entregar), desarchivar, reseña, recordatorio.
- [ ] Pestañas, conteos y "Payments pending" con datos reales; calendario por mes; filtros en la URL;
      anterior/siguiente; volver.
- [ ] Lista de `docs/proximos-pasos-bookings.md` §1.

### 5.4 Clients
- [ ] Alta con email o teléfono duplicado (409 con "Open that client" / "Restore").
- [ ] Editar email de un cliente con login → el login nuevo funciona.
- [ ] Borrar y restaurar; orden por nombre, received y recent (B9); filtros heardFrom y login.

### 5.5 Galleries
- [ ] Crear desde reserva (bloqueos: reserva ajena, no confirmada, ya tiene galería).
- [ ] Subir JPG/PNG/WebP, HEIC (mensaje), archivo falso, 50 MB+, carpeta arrastrada, 3 en paralelo.
- [ ] Disco: forzar `STORAGE_RESERVE_BYTES` alto → 507 y la barra en FULL.
- [ ] Bulk: mover, ocultar, mostrar, elegir y borrar (también borrar la foto de portada).
- [ ] Visor: zoom, EXIF, editar (rotar, enderezar, recortar, redimensionar), foco manual y reset.
- [ ] Ajustes: privacidad PASSWORD sin contraseña, PIN nuevo, vencimiento (B5), historial (B4).
- [ ] Entregar, reenviar, extender; galería vencida (B6); borrar galería → la carpeta desaparece.
- [ ] Limpieza: tmp de más de 24 h y carpetas huérfanas se borran al arrancar.

### 5.6 Services / Extras
- [ ] CRUD, nombres duplicados, "Most booked" único, reordenar, borrar con reservas (409 → ocultar).
- [ ] Un add-on desactivado ya no aparece en Nueva reserva.

### 5.7 Overview y general
- [ ] Agenda de 14 días, gráfica de 6 meses, dona del disco, visitas "Not connected".
- [ ] Sesión vencida con la pantalla abierta (B7).
- [ ] Skeletons en lugar de "Loading…"; isla de paginación; tarjetas en móvil (skill `admin-tables`).

### 5.8 Producción (cuando exista el despliegue)
- [ ] `docker compose up` desde cero, migraciones, seed del admin real.
- [ ] HTTPS, redirecciones `www.`/`admin.`, subida de 50 MB a través de nginx.
- [ ] Probar que se puede restaurar un respaldo.
- [ ] Cabeceras de seguridad (securityheaders.com) y que `/api` no se pueda usar sin cookie.

---

## 6. Orden sugerido para arreglar

1. S2 (`npm audit fix` + sharp), S5 (puertos de dev a 127.0.0.1) y S4 (protección del dev seed): son
   minutos.
2. S1 rate-limit, S7 `sendError` y S3 exigir `GALLERY_ENC_KEY`.
3. B1, B2 y B3 (integridad de datos de clientes y reservas).
4. B7 y B8 en el admin, y B4/B5 en galerías.
5. Pruebas de `booking-derive` y de integración de auth.
6. S6 (revocación de sesión) antes de abrir el portal de clientes.
