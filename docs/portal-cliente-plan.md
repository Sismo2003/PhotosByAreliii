# Plan de desarrollo — Portal del cliente (`/client/`) y "Preview as client"

Fecha: 2026-10-09 · Para el agente que construya el portal del cliente. Reglas: skill `client-portal`.

**Estado (2026-10-09, noche):** hecho el primer corte — app `client/`, **login único `/login`** (P17),
"Choose your password", galerías disponibles, galería con secciones + cuadrícula + visor simple, perfil
de solo lectura, EN/ES, `/api/client/{me,galleries,galleries/:slug,…/photos,…/photos/:id/thumb|web}`,
nginx + Docker. Falta todo lo demás de las fases 2–9 (descargas, favoritos, edición, info, bookings,
pagos, preview, correos, book again, `shared/`). Ver `client/README.md`.

## 0. Decisiones tomadas con Alexis (2026-10-09)

| # | Decisión |
|---|---|
| P1 | App nueva **`client/`** (React 19 + Vite 6 + Tailwind 4, igual que `admin/`), servida por nginx en **`/client/`**. El cliente nunca descarga código del admin. Componentes de `REACT-COMPONETS` (`components/ui`, `shared/ConfirmModal`, `Skeleton`…) y los tokens del sistema de diseño del admin. |
| P2 | **Paridad con el admin.** La galería del cliente se ve y se comporta como `/admin/galleries/1` (grid, visor, info, zoom, swipe). Las piezas comunes viven en **un solo lugar** (§3) y hay contrato de paridad (`docs/paridad-admin-cliente.md`, §9). |
| P3 | **Caras:** encuadre por cara. Se reusan `Photo.focusX/focusY` que ya calcula `Backend/services/photo-focus.js` (UltraFace). Sin modelos nuevos ni datos biométricos. "Buscar a una persona" queda como pendiente (§11). |
| P4 | **Editar/rotar** en el visor del cliente solo afecta **su descarga**: el servidor genera la copia editada al vuelo con metadatos de derechos. No se guarda nada; el original de Areli nunca cambia. |
| P5 | **Perfil:** el cliente cambia nombre, teléfono, Instagram y contraseña. El email solo lo cambia Areli. |
| P6 | **PIN de descarga:** con `privacy = CLIENT_LOGIN` la sesión basta; no se pide PIN. |
| P7 | **Correo de entrega:** si `User.lastLoginAt` existe → correo "tus fotos están listas" **sin credenciales**, solo el enlace al login + "entra con tu cuenta o restablece tu contraseña". Si nunca ha entrado → credenciales temporales nuevas (como hoy). |
| P8 | **Preview as client:** Areli ve el portal **completo en solo lectura** como ese cliente, con banda "Previewing as …". Es **el mismo código** de `client/` (no una copia), así cualquier cambio en `client/` aparece en el preview sin trabajo extra. Skill `client-portal` lo hace obligatorio (§9). |
| P9 | El cliente **no sube fotos**. No existe ninguna ruta de subida en `/api/client/*`. |
| P10 | **Favoritos persisten** en la BD (tabla `Favorite`, PK `clientId + photoId`): se ven igual en cualquier dispositivo. **Es el mismo favorito en el admin y en el cliente** (antes Areli tenía `Photo.keep`; se unificó el 2026-10-09 y el admin ahora dice "Favorite"). |
| P11 | **Nombre original del archivo** visible en Info. |
| P12 | **Descargas:** las del cliente se registran (`ActivityEvent gallery.downloaded`) **una vez por acción** (no por archivo: `POST …/downloads`); las de Areli en preview se permiten y **no** se registran. El historial usa el nombre del cliente, no "Client". |
| P13 | **Galerías vencidas** apagadas y ocultas por defecto; filtro "Show expired" para verlas. |
| P14 | **Contacto:** botones "Text Areli" (`sms:` + E.164) e "Instagram" (`https://instagram.com/<user>` / `ig.me`). Teléfono, Instagram, Zelle y Cash App viven en **`shared/site.js`** (un solo archivo para portal, landing y backend; Alexis, 2026-10-19). |
| P15 | **Idiomas:** inglés por defecto + español con **i18next** (`react-i18next`) en el portal del cliente; la landing también bilingüe (§1.4). |
| P17 | **Un solo login** en `photosbyareliii.com/login`, servido por `client/`. El admin ya no tiene página de login: sin sesión manda a `/login?redirect=/admin/…`. Tras entrar, el **rol que devuelve la API** decide `/admin/` o `/client/` (nginx no puede decidir por rol: no puede validar el JWT). nginx redirige `/admin/login` y `/client/login` a `/login`. |
| P16 | **Sin tablas tradicionales** en el portal del cliente: sí paginación y filtros, pero con diseño propio pensado para móvil (§1.3). |

## 1. Qué ve el cliente

Navegación con 4 pestañas. **Móvil:** barra inferior fija estilo iOS (icono + etiqueta, `env(safe-area-inset-bottom)`,
objetivos ≥ 44 px, la pestaña activa con el color primario y texto oscuro en dark mode — ver memoria de contraste).
**Tablet:** barra inferior en vertical, rail lateral en horizontal. **Desktop:** sidebar como el admin (Sideblock).

| Pestaña | Contenido |
|---|---|
| **Galleries** | Tarjetas de sus galerías entregadas (portada con encuadre por cara, título, fecha de sesión, nº de fotos, "Expires in N days"). Galerías vencidas: tarjeta apagada "Expired on …" sin fotos. |
| **Bookings** | Próxima sesión arriba (fecha/hora en `America/Phoenix`, lugar, servicio, paquete, extras, estado). Debajo, sesiones anteriores con enlace a su galería si existe. Botón **Book again** (§8). |
| **Payments** | Por reserva: total, depósito, pagado, saldo pendiente y fecha límite. Historial de `Payment` (fecha, método, monto, reembolsos). Instrucciones de pago Zelle / Cash App desde `site-config` (pago manual, no hay pasarela). |
| **Profile** | Nombre, email (solo lectura, "Contact Areli to change it"), teléfono (`libphonenumber-js`), Instagram, "Client since", cambiar contraseña, cerrar sesión. |

### 1.1 Galería y visor (paridad con el admin)

- Grid igual al del admin: miniaturas con `object-position` desde `focusX/focusY` (fallback centro), sets como filtros,
  scroll infinito con `Skeleton` en forma de miniatura.
- **Visor**: swipe entre fotos, pinch/zoom (`ZoomStage`), teclado en desktop, precarga de la siguiente.
- **Edit** (solo para la descarga): rotar 90°, voltear, recortar con proporciones (libre, 1:1, 4:5, 9:16, 16:9),
  brillo/contraste/saturación. Misma isla "Unsaved edits · Cancel / Download edited" que el admin, pero **sin "Replace the original"**.
- **Info**: tamaño, dimensiones, fecha de captura, datos de cámara curados (`Photo.exif`) y **los metadatos de derechos que
  insertamos al descargar** (Artist, Copyright, "Licensed to: Gallery #id – título", Credit, contacto) — el mismo panel
  `InfoPanel` del admin con las filas internas ocultas (ruta en disco, nombre de archivo original si Areli no lo quiere, `keep`, `hidden`, foco).
- **Favorites** (corazón) si `favoritesEnabled`, respetando `favoritesLimit` ("12 of 20").
- **Download**: según `downloadMode` → `HIGH_AND_WEB` (Original / Web), `WEB_ONLY` (Web), `OFF` (sin botón).
- Selección múltiple con la misma `SelectionIsland` (descargar seleccionadas, favoritas).

### 1.2 Funciones confirmadas (2026-10-09)

- **Aviso de vencimiento** en la tarjeta y dentro de la galería ("Available until Oct 30 · 21 days left"; a 7 días cambia a tono de alerta).
- **Add to calendar** (.ics generado con Luxon, zona `America/Phoenix`) en la próxima sesión.
- **Text Areli** / **Instagram** (P14).
- **Guardar en el iPhone** — cómo funciona cada vía:
  - **ZIP en iPhone:** Safari lo guarda en *Archivos*; al tocarlo, iOS lo descomprime en una carpeta, pero para pasarlo a
    *Fotos* el cliente tiene que seleccionar las imágenes → Compartir → "Save N Images". Funciona, pero son 5–6 pasos y confunde.
  - **Por eso en iPhone/Android el botón principal es "Save to Photos"**: `navigator.share({ files })` con varias fotos a la vez
    abre la hoja de compartir y "Save N Images" las manda directo a *Fotos*. Se envían en **lotes** (≈20 fotos tamaño web por lote,
    "Save next 20") para no agotar la memoria de Safari. Fallback a descarga normal si el navegador no soporta compartir archivos.
  - **ZIP** queda como "Download all (ZIP)" para desktop y para originales en alta resolución; en móvil aparece en el menú secundario
    con la nota "Opens in Files".
- PWA "Add to Home Screen" (icono, `display: standalone`) — opcional, refuerza la sensación de app iOS.
- Compartir enlace a una foto: **no** en esta fase.

### 1.3 Cómo se muestran las listas (sin tablas, sin "cards básicas")

El portal del cliente **no** usa la skill `admin-tables` (esa es solo para `admin/`). Sí lleva paginación, filtros y `Skeleton`, con este diseño:

| Pantalla | Presentación |
|---|---|
| **Galleries** | Portadas grandes a sangre (encuadre por cara), estilo "recuerdo": título encima de la foto, fecha y fotos en una píldora translúcida, mini-tira de 3 fotos debajo. La vencida, en escala de grises con "Expired". |
| **Bookings** | **Línea de tiempo vertical**: la próxima sesión arriba como "ticket" (cuenta regresiva "In 12 days", hora, lugar con enlace a Maps, Add to calendar); las anteriores son nodos de la línea con miniatura de su galería. Agrupadas por año. |
| **Payments** | Por reserva, un **anillo de progreso** pagado/total con el saldo al centro y fecha límite; al tocar se despliega un **recibo** (lista estilo ticket: depósito, pagos, reembolsos, saldo). Instrucciones Zelle/Cash App con botón copiar. |
| **Profile** | Encabezado con avatar de iniciales y "Client since"; ajustes como grupos iOS (filas con chevron, hojas inferiores para editar). |

- **Filtros:** fila de *chips* deslizable horizontal (estilo segmented control de iOS): p. ej. Galleries → All / Favorites / Expired;
  Bookings → Upcoming / Past / Year; Payments → Pending / Paid. Búsqueda solo si hay más de N elementos.
- **Paginación:** la misma lógica de páginas que el admin (cursor del backend), mostrada como **isla flotante** compacta encima de la
  barra inferior (‹ 2 / 5 ›) — misma familia visual que `PaginationIsland` del admin, en `shared/`. En el grid de fotos, scroll infinito.
- Antes de construir, se diseñan estas 4 pantallas en el canvas de diseño (memoria *Design artifacts*) para que Alexis las apruebe.

### 1.4 Idiomas (i18n)

- `client/`: `react-i18next`, archivos `client/src/i18n/locales/{en,es}.json`; idioma = `Client.locale` si hay sesión, si no el del navegador;
  selector EN/ES en Profile que guarda `Client.locale` (`PATCH /me`). Fechas con Luxon `setLocale(locale)`; monedas con el locale.
- Correos al cliente en su `Client.locale` (las plantillas de `docs/correos.md` necesitan versión ES).
- Landing (Astro): rutas `/` y `/es/` con i18n de Astro, `hreflang` (skill `landing-seo`). Fuera de este trabajo, queda en pendientes.
- `admin/` queda **solo en inglés** (decisión de Alexis, 2026-10-09).

## 2. Arquitectura

```
photosbyareliii.com/client/   → nginx → contenedor client (build estático Vite, base '/client/')
photosbyareliii.com/api/client/* → api (Express) — rutas nuevas, solo rol CLIENT (o ADMIN en preview, solo lectura)
```

- Una sola cookie de sesión (`httpOnly`, mismo origen) para admin y cliente — no hace falta CORS.
- Si un ADMIN abre `/client/` sin `?preview=<clientId>` → se le manda a `/admin/`. Si un CLIENT abre `/admin/` → a `/client/`.
- Login: **`/login`** (P17), único para admin y clientes. Si `mustChangePassword` → `/client/welcome`
  (pantalla obligatoria; la API rechaza `/api/client/*` con `MUST_CHANGE_PASSWORD` hasta que la cambie).

## 3. Código compartido (garantía de paridad)

Crear **`shared/`** en la raíz (paquete local, alias `@shared` en los dos `vite.config.js`) con lo que ambos portales usan:

| Pieza | Hoy en | Pasa a |
|---|---|---|
| Visor (`PhotoViewer`, `ZoomStage`, `EditPanels`, `viewerEdits.js`, `useEditedPreview.js`, `InfoPanel`) | `admin/src/app/pages/galleries/gallery/viewer/` | `shared/gallery/viewer/` |
| Grid de fotos + `focus.js` + `SelectionIsland` + `usePhotoPages` | `admin/.../galleries/` | `shared/gallery/` |
| Tokens/tema, `utils/date.js`, `utils/phone.js`, `formatBytes` | `admin/src/` | `shared/` |
| Login (campo único + Show/Hide), `ChangePassword` | admin / Frontend | `shared/auth/` |

El visor recibe **capacidades**, no un modo mágico:

```js
<PhotoViewer
  api={clientGalleryApi}            // o adminGalleryApi: misma interfaz (photoUrl, info, download, edit…)
  can={{ replaceOriginal: false, focus: false, hide: false, keep: false,
         favorite: true, downloadEdited: true, download: gallery.downloadMode }}
/>
```

Regla: **toda mejora del visor/grid se hace en `shared/`**, nunca en una copia. Primero se mueve el código (refactor sin
cambios visibles en el admin, verificado en el navegador), después se construye el cliente encima.

## 4. API del cliente (`/api/client/*`)

Archivo `Backend/routes/client-portal.routes.js`, controladores `client-portal.controller.js`, modelo `client-portal.model.js`.

| Método y ruta | Qué hace |
|---|---|
| `GET /me` | Perfil del cliente (DTO explícito) + `preview: bool`. |
| `PATCH /me` | Nombre, teléfono, Instagram (§6.4). |
| `GET /galleries` | Sus galerías entregadas (incluye vencidas como tarjeta sin fotos). |
| `GET /galleries/:slug` | Galería + sets + ajustes visibles (`downloadMode`, `favoritesEnabled`, `favoritesLimit`, `expiresAt`). |
| `GET /galleries/:slug/photos?cursor=&setId=&favorites=1` | Fotos visibles paginadas (sin `hidden`), con `favorite` por foto. **Hecho.** |
| `GET /galleries/:slug/photos/:photoId/info` | Info + metadatos de derechos (sin coordenadas, solo `hasLocation`). **Hecho.** |
| `GET /galleries/:slug/photos/:photoId/:variant` | `thumb` / `web` para ver; `download-web` / `download-original` para descargar. |
| `GET /galleries/:slug/photos/:photoId/download-edited?rotate&straighten&flipH&flipV&resize=WxH` | Archivo editado al vuelo (GET para que funcione en preview). **Hecho**, sin crop. |
| `GET /galleries/:slug/download.zip?scope=all|favorites|ids` | ZIP en streaming. |
| `PUT` / `DELETE /galleries/:slug/photos/:photoId/favorite` | Marcar / quitar favorita (idempotente, límite en transacción con la galería bloqueada, registra `gallery.favorited/unfavorited`). **Hecho.** |
| `GET /galleries/:slug/photos/:photoId/download?quality=web\|original` | Adjunto, **sin registrar** (lo registra el `POST`). `original` = calidad completa con derechos escritos (GPS y cámara se conservan). **Hecho.** |
| `GET /galleries/:slug/download.zip?quality=&all=1\|favorites=1\|setId=\|ids=` | ZIP en streaming, registra una línea, un ZIP a la vez por cliente. **Hecho.** |
| `POST /galleries/:slug/downloads` `{ photoIds }` | Registra **una** línea de historial por descarga; el cliente lo llama una vez antes de bajar. **Hecho.** |
| `GET /bookings?cursor=` | `{ upcoming, past, nextCursor }`. Visibles: REQUEST, AWAITING_DEPOSIT, CONFIRMED, CANCELLED (nunca DECLINED/EXPIRED), todo vía `bookingScope(scope)`. `gallery` solo si pasa `galleryScope`. **Hecho** (2026-10-19). |
| `GET /bookings/:code/calendar.ics` | "Add to calendar" generado en el servidor (`services/ics.js`, UTC, `SEQUENCE = rescheduleCount`). Solo activas y futuras; si no → 404. **Hecho.** |
| `GET /payments` | Por reserva con dinero: `money` (pagado/saldo con `paidCents` de booking-derive) + `receipt` (sin `note` ni `recordedById`). **Hecho.** |
| `GET /me/booking-prefill` | Datos para "Book again" (§8). **Pospuesto** (Alexis, 2026-10-19): fuera de esta fase hasta que exista `/book`. |

Se identifica la galería por **slug** dentro del alcance del cliente; nunca por `clientId` del request.

## 5. Preview as client (admin)

- Botón del admin (`admin/src/app/pages/galleries/integrations.js` `previewAsClient`, y también en el perfil del cliente)
  abre `/client/?preview=<clientId>` (en la galería: `/client/galleries/<slug>?preview=<clientId>`) en pestaña nueva.
- `client/` guarda el `previewClientId` en memoria y lo manda en el header **`X-Preview-Client`** en cada llamada.
- Middleware `resolveClientScope` (§6.1): si el usuario es ADMIN **(rol leído de la BD)** y viene el header →
  `req.scope = { clientId, readOnly: true }`. Mismo controlador, mismas consultas → paridad automática.
- `readOnly`: cualquier método distinto de GET/HEAD → 403 (en el middleware, no en cada controlador). La UI oculta
  los botones de cambio y muestra la banda "Previewing as The Ortega family · Read only · Exit".
- En preview Areli **sí puede descargar** (GET), pero **no** se registran `ActivityEvent` (vistas, descargas) ni se tocan favoritos.
  Las descargas del cliente sí se registran.
- Muestra galerías en `DRAFT` también (Areli quiere ver cómo quedará antes de entregar), con etiqueta "Draft — client can't see this yet".

## 6. Seguridad (obligatorio, revisar en code review)

### 6.1 Alcance del cliente — una sola fuente de verdad
- `resolveClientScope`: tras `requireAuth` (que ya rechaza tokens anteriores a `passwordChangedAt`), lee el `User` de la BD:
  CLIENT con `clientId` y `client.deletedAt = null` → `{ clientId, readOnly: false }`; ADMIN + `X-Preview-Client` válido → preview;
  cualquier otro caso → 403. **Ningún controlador lee `clientId`, `galleryId` o `userId` del body/query.**
- Todas las consultas filtran por `req.scope.clientId` **en la misma consulta** que trae el recurso (sin "traer y luego comprobar" en dos pasos):
  ```js
  prisma.photo.findFirst({ where: { id: photoId, hidden: false,
    gallery: { slug, clientId: scope.clientId, status: 'DELIVERED', privacy: 'CLIENT_LOGIN',
               photosDeletedAt: null, expiresAt: { gt: now } } } })
  ```
- Si no existe o no es suyo → **404** igual en ambos casos (no revelar que existe la galería de otro).
- Helper único `clientGalleryWhere(scope, slug)` usado por todas las rutas de galería; prueba que falle si alguien lo salta (§10).

### 6.2 Respuestas
- DTOs con `select` explícito. Nunca salen: `privateNotes`, `downloadPinEnc`, `accessPasswordEnc`, `originalPath`/`webPath`/`thumbnailPath`,
  `keep`, `hidden`, `deliveredToEmail`, notas internas de booking/pagos, `recordedById`, datos de otros clientes.
- Archivos: `Cache-Control: private, max-age=…` (nunca `public` — un CDN no debe guardarlas), `X-Content-Type-Options: nosniff`,
  `Content-Disposition` con nombre saneado (`<galería>-<nº>.jpg`), rutas en disco resueltas solo desde la BD y verificadas dentro de la carpeta de fotos.
- Descarga del original: escribir derechos sin pérdida y **quitar GPS** con `exiftool` sobre una copia temporal o por stream (pendiente D-G10 en `docs/galleries-pendientes.md`).

### 6.3 Edición en la descarga
- Validar el body (middleware `validate`): rotación ∈ {0, 90, 180, 270}, flip bool, crop en fracciones 0–1 con ancho/alto > 0,
  ajustes en rangos fijos. Nada de cadenas libres que lleguen a sharp.
- sharp con `limitInputPixels`, y **cola con concurrencia limitada** (p. ej. 2 trabajos) + rate limit por cliente para que nadie tire el CPU.
- Se aplica `stamp(rights)` de `photo-rights.js`. No se guarda nada en disco.

### 6.4 Condiciones de carrera
- **Favoritos:** `PUT` = `upsert` sobre la PK `(clientId, photoId)`, `DELETE` = `deleteMany` → idempotentes. El límite
  `favoritesLimit` se comprueba **dentro de una transacción** que bloquea la fila de la galería (`SELECT … FOR UPDATE`) antes de contar e insertar,
  para que dos toques simultáneos no pasen el límite.
- **Teléfono del perfil:** no basta con "comprobar y luego guardar": se guarda y se captura el `P2002` de `phoneE164 @unique` → 409 "This phone belongs to another account".
- **Galería que vence o se borra durante una descarga:** el stream maneja `ENOENT` y corta limpio; el job de vencimiento no rompe el proceso.
- **ZIP:** máximo 1 ZIP a la vez por cliente (mapa en memoria + rate limit); cancelar el trabajo si el cliente cierra la conexión.
- **Actividad:** se insertan eventos (`ActivityEvent`), nunca contadores leer-sumar-escribir.
- **Correo de entrega (P7):** decidir "primera vez o no" y generar la contraseña temporal **dentro de la misma transacción** que marca la entrega.

### 6.5 Sesión y peticiones
- Cookie `sameSite: 'lax'` + las rutas que cambian algo exigen `Content-Type: application/json` y comprueban `Origin` = sitio (defensa CSRF).
- Rate limit en login (ya existe el patrón), descargas y ZIP.
- nginx para `/client/`: CSP estricta (`default-src 'self'; img-src 'self' blob: data:`), `frame-ancestors 'none'`, `Referrer-Policy: same-origin`.
- No hay ninguna ruta de subida en `/api/client/*`; `upload.middleware.js` solo se monta en rutas `requireAdmin`.

## 7. Correos (actualizar `docs/correos.md`)

| Clave | Cuándo | Contenido |
|---|---|---|
| `gallery.delivered` (variante **first**) | Entrega y el cliente **nunca** ha iniciado sesión (`lastLoginAt = null`) | Fotos listas + usuario (email o teléfono) + contraseña temporal nueva + enlace `/client/login`; al entrar debe cambiarla. |
| `gallery.delivered` (variante **returning**) | Entrega y `lastLoginAt` existe | "Your photos are ready" + enlace `/client/login` + "You already have an account — sign in with it, or reset your password" (enlace a `/client/forgot-password`). **Sin credenciales.** |

- La variante la decide el backend al enviar, no el admin. El modal "Deliver gallery" del admin muestra cuál se enviará ("This client already has an account — no password will be sent").
- `/client/forgot-password` existe como página, pero hasta que haya reset muestra "Contact Areli to reset your password" (**PENDIENTE**, §11).

## 8. "Book again" — dejarlo listo para la página pública `/book`

Lado del portal (este trabajo):
- Botón **Book again** en Bookings y Profile → navega a **`/book?rebook=1`** (sin datos personales en la URL).
- `GET /api/client/me/booking-prefill` devuelve `{ firstName, lastName, email, phone, phoneE164, instagram, lastServiceId, lastPackageId }`.

Lado de `/book` (lo hace el agente de la landing; dejar escrito en `docs/formulario-publico-booking.md` §"Cliente con sesión"):
1. Al cargar con `rebook=1`, llamar a `/api/client/me/booking-prefill` (misma origin, la cookie viaja sola). 401 → formulario vacío normal.
2. Rellenar nombre, email, teléfono, Instagram; preseleccionar el último servicio. El cliente puede cambiar todo menos el email (se muestra fijo con "Not you? Sign out").
3. Al enviar, el backend toma el `clientId` **de la sesión**, no del formulario, y marca `ClientMatch` como cliente existente.
4. Marcador `INTEGRATION(book-prefill)` en el código del portal y en el formulario.

## 9. Paridad admin ↔ cliente: documentación y skill

- **`docs/paridad-admin-cliente.md`**: tabla de cada pieza compartida (§3), qué capacidades tiene cada portal, y checklist
  "cambié algo de galerías en el admin → ¿lo ve igual el cliente?".
- **Skill nueva `.claude/skills/client-portal/SKILL.md`** (se activa al tocar `client/`, `shared/`, `/api/client/*` o el visor del admin):
  - El visor y el grid se editan solo en `shared/`.
  - El preview es el mismo `client/` con `X-Preview-Client`; prohibido crear vistas "de preview" aparte.
  - Reglas de §6 (alcance, 404, DTOs, sin subida).
  - Toda pantalla nueva en `client/` debe funcionar en preview (solo lectura) y en móvil con la barra inferior.
- Actualizar `admin-tables`, `auth-gallery` y `frontend` para que apunten a esta skill.

## 10. Fases

| Fase | Entregable | Verificación |
|---|---|---|
| **0. Base** | Skill `client-portal`, `docs/paridad-admin-cliente.md`, carpeta `shared/` con alias, scaffold `client/` (base `/client/`, tema, layout con barra inferior iOS / sidebar), nginx `/client/` + servicio en `deploy/docker-compose.yml`. | `npm run dev` de `client/` y `admin/`; admin sin cambios visibles. |
| **1. Refactor del visor** | Mover visor, grid, focus y selección a `shared/` con `api` + `can`. | Admin `/admin/galleries/1` idéntico (lo revisa Alexis en el navegador). |
| **2. API cliente + seguridad** | `resolveClientScope`, `clientGalleryWhere`, rutas §4, DTOs, rate limits, cola de sharp. | Script `Backend/scripts/test-client-isolation.js`: con 2 clientes del seed, el cliente A pide galería/foto/booking/pago/favorito de B → 404 en todo; preview → 403 en POST/PUT/PATCH/DELETE; foto `hidden` → 404; galería vencida → 404. |
| **3. Login y perfil** | Login, cambio obligatorio de contraseña, Profile, `PATCH /me`. | curl + navegador (Alexis). |
| **4. Galerías y visor** | Lista, galería, visor con Edit/Info/Favorites, descargas (web, original con exiftool, editada), ZIP, "Save to Photos". | Descargar en iPhone y Android; revisar metadatos con `exiftool` (derechos presentes, GPS ausente). |
| **5. Bookings y Payments** | Pestañas con Luxon (`America/Phoenix`), instrucciones Zelle/Cash App, .ics. | Datos del dev seed. |
| **6. Preview as client** | Botón en admin (galería y perfil del cliente), banda, solo lectura, sin Activity. | Abrir preview, intentar favorito → bloqueado; Activity sigue en 0. |
| **7. Correos** | Variantes first/returning de `gallery.delivered`, aviso en el modal de entrega. | Enviar a un cliente nuevo y a uno que ya entró (bandeja de pruebas). |
| **8. Book again** | Botón, endpoint prefill, sección en `docs/formulario-publico-booking.md`. | curl del endpoint. |
| **9. Cierre** | `/security-review`, bitácora en `wiki/`, `handoff.md` actualizado. | — |

## 11. Pendientes (fuera de este trabajo)

- [ ] **Restablecer contraseña** (`account.password_reset`, modelo `PasswordResetToken` ya existe): `/client/forgot-password` hoy solo dice "Contact Areli".
- [ ] Galerías con privacidad **PASSWORD** y **PUBLIC_LINK** (`/g/<slug>`, con PIN de descarga).
- [ ] **Buscar a una persona** por cara (embeddings, consentimiento y borrado de datos biométricos).
- [ ] Página pública **`/book`** consumiendo el prefill (§8).
- [ ] Texto de términos de uso en los metadatos (`xmpRights:UsageTerms`, D-G10).
- [ ] Regenerar metadatos de copias web subidas antes de `photo-rights.js`.
- [ ] Landing bilingüe EN/ES (`/` y `/es/`).
- [ ] Pagos en línea (hoy manual por Zelle / Cash App).

## 12. Dudas abiertas para Alexis

Ninguna por ahora. Siguiente paso: diseñar las 4 pantallas de §1.3 en el canvas y, aprobadas, empezar la fase 0.
