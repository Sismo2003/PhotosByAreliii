# Handoff — Portal del cliente (`client/`) y login único

Última actualización: **2026-10-09, noche (2.ª sesión: selección, favoritos, descargas, historial)**. Para el siguiente agente que trabaje en el portal del cliente,
el login o `/api/client/*`.

## 0. Lee primero (en este orden)

1. `CLAUDE.md` (raíz) — Luxon para fechas, libphonenumber-js para teléfonos.
2. **Skill `client-portal`** (`.claude/skills/client-portal/SKILL.md`) — reglas obligatorias de seguridad,
   UI y paridad con el admin.
3. **`docs/portal-cliente-plan.md`** — plan completo: decisiones P1–P17 (§0), pantallas (§1), arquitectura (§2),
   código compartido (§3), API (§4), Preview (§5), seguridad (§6), correos (§7), Book again (§8), fases (§10),
   pendientes (§11).
4. `client/README.md` — rutas y cómo levantarlo.
5. Bitácora: `wiki/portal-cliente/bitacora/2026-10-09-portal-cliente-primer-corte.md`.

**Preferencias de Alexis (usuario):** pregunta **antes** de usar el navegador (Claude in Chrome); no hagas
commit/push sin permiso (el repo no es git); no corras seeds ni escribas en la base sin autorización;
el portal es **mobile first** (barra inferior estilo iOS), **sin tablas tradicionales ni "cards básicas"**;
EN + ES en el portal y la landing, el **admin solo en inglés**; "menos es más" (no repetir texto en pantalla).

## 1. Cómo levantarlo

```bash
cd database && docker compose up -d          # MySQL :3306
cd Backend && npm run dev                    # API :4000
cd client  && npm run dev                    # http://localhost:5175/login  ← login ÚNICO
cd admin   && npm run dev                    # http://localhost:5174/admin/ (sin sesión → :5175/login)
```

Las cookies no distinguen puerto: la sesión creada en `:5175/login` vale en `:5174/admin/`
(`VITE_ADMIN_ORIGIN` en `client/.env.development`, `VITE_LOGIN_ORIGIN` en `admin/.env.development`).

**Datos de prueba en la BD de desarrollo (autorizado por Alexis el 2026-10-09):**
- Cliente 1 "Alexis Camina En puntitas Gallery" tiene login CLIENT: `client@example.com` o `(480) 555-0100`.
  La contraseña temporal se imprimió en la sesión; si no la tienes o ya se cambió, genera otra con
  `cd Backend && CONFIRM=yes node scripts/dev-client-login.js 1` (pide permiso antes: escribe en la base).
- Galería 1 (`alexis-camina-en-puntitas-gallery-solos`, 14 fotos, layout **Split**) está **entregada**
  (vence 2027-01-08, privacidad Client login).

## 2. Qué está hecho

### Login único `/login` (P17)
- Una sola página para Areli y clientes, servida por `client/` (ruta `/login`, fuera del base `/client/`).
  Tras entrar, `destinationFor()` (`client/src/app/auth.jsx`) usa el **rol de la API**: ADMIN → `/admin/…`,
  CLIENT → `/client/…` (o `/client/welcome` si `mustChangePassword`). `?redirect=` solo acepta rutas propias.
- El **admin ya no tiene login**: se borraron `admin/src/app/pages/Auth`, `GhostGuard`, `public/login.jpg`.
  `admin/src/middleware/AuthGuard.jsx` manda a `/login?redirect=/admin/…` (`&expired=1` si la sesión murió);
  `admin/src/app/router/ghost.jsx` redirige `/admin/login`. nginx de borde: `/admin/login` y `/client/login` → `/login`.
- Campo "Email or phone": detecta qué se escribe (`client/src/utils/identifier.js`); teléfono se formatea al
  teclear con libphonenumber-js, correo se deja igual sin espacios; ícono de celular/sobre; error por tipo.

### Primera contraseña `/client/welcome`
- Solo **New password** + **Repeat** (la temporal ya se probó en el login).
- Reglas (`client/src/utils/passwordRules.js` ↔ `Backend/utils/password-rules.js`, **cambiar juntas**):
  más de 8 caracteres, 1 mayúscula, **1 número**, sin nombre/apellido, + "Both passwords match".
  Neutras hasta escribir o salir del campo; cumplidas = palomita verde + texto verde tachado; no cumplidas = X roja + texto rojo.
- Backend `POST /api/auth/change-password`: sin `currentPassword` **solo** si `mustChangePassword`; rechaza la
  temporal (`SAME_AS_TEMPORARY`); guardado atómico `UserModel.setFirstPassword` (409 `ALREADY_CHOSEN` si dos
  peticiones compiten). Cambios posteriores siguen pidiendo la actual.

### Portal `/client`
- `AppShell.jsx`: barra inferior iOS en móvil (Galleries, Profile; se agregan en `TABS`), barra superior en `md+`.
- **Galleries** (`pages/galleries`): portadas grandes recortadas en caras + tira de 3 fotos + días restantes;
  vencidas ocultas, chip "Expired (n)" las muestra apagadas y sin fotos; Skeleton, vacío y error.
- **Gallery** (`pages/gallery`): portada según `coverLayout` (`Hero.jsx`: Full / Split / Minimal), aviso de cierre
  ≤ 7 días, chips de sets, cuadrícula cuadrada con `focusX/focusY`, scroll infinito por cursor
  (`usePhotoPages.js`, sin carreras), visor `Viewer.jsx` (swipe, teclado, precarga, `?photo=<id>` para que Back lo cierre; ver abajo).
- **Visor con las herramientas del admin** (2026-10-10, `pages/gallery/Viewer.jsx` + `components/viewer/`): Favorite (doble toque/clic),
  Zoom (`ZoomStage`, copia del admin con `ZoomBar` en i18n), **Compare** de 2 fotos con zoom sincronizado y tira para elegir la segunda,
  Rotate & flip + straighten, Resize, Info (cámara, archivo, derechos; **sin mostrar coordenadas**) y Download. Rotar/Resize **solo
  dan forma a la descarga**: vista previa en canvas (`useEditedPreview`) y el servidor hace el archivo real con
  `GET …/photos/:id/download-edited` (sin guardar nada; conserva GPS/cámara y escribe derechos). Requieren `downloadMode = HIGH_AND_WEB`.
  Sin crop ni focus (no se pidieron; focus es de Areli). En móvil: barra de iconos abajo y paneles como hoja inferior.
  **Copias del admin** (cambiar juntas hasta que exista `shared/`): `ZoomStage.jsx`, `useEditedPreview.js`, `viewerEdits.js`, `explain.js`.
- **Selección múltiple** (sesión 2): círculo en cada foto, Select / Done + **Select all** (carga todas las páginas
  del filtro), isla flotante `SelectionIsland.jsx` (Favorite · Download · Clear), **recuadro azul** con mouse
  (`hooks/useMarquee.js`, copia del admin; cancela `selectstart` para no resaltar texto, necesario en Safari). Cursores:
  manita en el círculo, `zoom-in` en la foto.
- **Chips**: All · sets de Areli con ≥ 1 foto visible · Favorites (nunca "No set"). Select / Select all / Done a la derecha.
- **Favorito único**: el mismo en admin y cliente (tabla `favorites`, `clientId` de la galería). Doble toque/clic en el
  visor = favorito con corazón animado. Límite `favoritesLimit` solo para el cliente (transacción con `FOR UPDATE`).
  `Photo.keep` está **obsoleta**; el admin dice "Favorite".
- **Descargas completas** (2026-10-10): menú `DownloadMenu` con **ZIP/original = calidad completa** (derechos de Areli escritos con
  `exiftool`, GPS y cámara intactos) y **copia web = calidad reducida**; botón *Download all* junto a Select. Backend:
  `services/photo-delivery.js`, `GET …/download.zip`, `GET …/photos/:id/download?quality=`. Antes de esto: **descargas** (solo web size): una foto directa; varias → hoja de compartir en lotes de 20 si el dispositivo puede
  (`utils/download.js`), si no una por una. Se registra **una** línea por acción (`POST …/downloads`).
- **Rostro/alineación**: `utils/focus.js` + `components/FocusImg.jsx` (misma fórmula que el admin; antes era un `%` simple, mal).
- **Historial del admin**: usa el nombre del cliente ("Alexis downloaded 12 photos", "… opened the gallery for the first
  time", "Alexis liked x.jpg", "Alexis removed the like from x.jpg"). Eventos viejos conservan "Client …".
- **Profile**: solo lectura (nombre, correo, teléfono, Instagram, cliente desde), idioma EN/ES, cerrar sesión.
- i18n: `client/src/i18n/locales/{en,es}.json` (siempre los dos). Modo oscuro según el dispositivo (`public/theme.js`).
- Diseño: tokens copiados de `admin/src/styles/index.css` (espejo, cambiar juntos); `components/ui` = Button, Input, Skeleton del admin.

### API `/api/client/*` (lectura + favoritos + log de descargas)
- `Backend/middlewares/client-scope.middleware.js`: CLIENT → su `clientId` (403 `MUST_CHANGE_PASSWORD` mientras
  no elija contraseña); ADMIN + header `X-Preview-Client` → preview **solo GET**; otro → 403.
- `Backend/models/client-portal.model.js`: dueño + entregada + no vencida + privacidad CLIENT_LOGIN + no oculta,
  **en la misma consulta** (`galleryScope`); si no, 404. `select` explícitos. Registra `gallery.viewed` (1 cada 30 min, nunca en preview).
- Rutas (`Backend/routes/client-portal.routes.js`): `GET /me`, `/galleries[?expired=1]`, `/galleries/:slug`,
  `/galleries/:slug/photos?cursor&setId&pageSize&favorites=1`, `/galleries/:slug/photos/:id/thumb|web`,
  `PUT|DELETE …/photos/:id/favorite`, `GET …/photos/:id/download`, `POST /galleries/:slug/downloads {photoIds}`. Rate limit por cuenta.
- `Backend/utils/phone.js`: se agregó `formatPhone`.

### Admin (cambios hechos aquí)
- Login eliminado (ver arriba). `admin/README.md` actualizado.
- `CoverTab.jsx` → `CoverPreview` refleja el mismo texto y composición que `Hero.jsx` del cliente.

### Despliegue
- `client/Dockerfile`, `client/nginx.conf` (CSP sin inline, `/client/` + `/login`), servicio `client` en
  `deploy/docker-compose.yml`, rutas nuevas en `deploy/nginx/photosbyareliii.conf`. **Sin probar** (como todo `deploy/`).

## 3. Verificado / sin verificar

- ✅ eslint sin errores y `vite build` ok en `client/` y `admin/`.
- ✅ Modelo contra la BD dev: otro cliente → 404 (galería y foto), borrador invisible al cliente y visible en preview,
  `original` → 404, paginación por cursor.
- ✅ curl: sin sesión → 401; login de cliente por teléfono; galerías → 403 `MUST_CHANGE_PASSWORD`; cliente en
  `/api/admin/*` → 403; reglas de contraseña y `SAME_AS_TEMPORARY`.
- ✅ Alexis probó en su navegador el recuadro azul sin selección de texto (Safari/macOS).
- ❌ Casi nada más visto en el navegador (pregúntale antes de usar Chrome). Sin probar con sesión real: favoritos, descargas, historial nuevo, "Save to Photos" en iPhone, doble toque en táctil.
- ❌ Cambio de contraseña exitoso y galerías con sesión de cliente real (se evitó gastar la temporal).
- ❌ nginx/Docker de producción.

## 4. Qué falta (en orden sugerido)

> **2026-10-19:** lista revisada contra el código en `wiki/portal-cliente/bitacora/2026-10-19-auditoria-pendientes.md`
> (más completa que esta; incluye que `client/` no tiene `node_modules`).

Detalle de cada punto en `docs/portal-cliente-plan.md` (sección indicada).

1. **Revisión en el navegador** del primer corte (móvil y escritorio, claro y oscuro) y arreglos.
2. **`shared/` — visor y cuadrícula comunes con el admin** (§3, fase 1): mover `PhotoViewer`, `ZoomStage`,
   `EditPanels`, `InfoPanel`, grid, `SelectionIsland` a `shared/` con props `api` + `can`; reemplazar `Viewer.jsx` y las copias de `components/viewer/`.
   Primero refactor sin cambios visibles en el admin. Ojo: los Dockerfiles construyen con contexto por carpeta;
   con `shared/` el contexto debe ser la raíz.
3. **Descargas** — **hecho: web size, original y ZIP (ver arriba).** Falta lo de `docs/portal-cliente-plan.md` §1.2 que no se hizo: ZIP de favoritas con botón propio, original según `downloadMode`; original con derechos y **sin GPS**
   vía `exiftool` (D-G10 en `docs/galleries-pendientes.md`); registrar `gallery.downloaded` (no en preview);
   **"Save to Photos"** en iPhone con `navigator.share({ files })` en lotes de ~20; ZIP en streaming para escritorio
   (1 a la vez por cliente). Mostrar el nombre original del archivo (P11).
4. ~~**Editar para la descarga** (P4, §6.3)~~ **Hecho** sin crop/ajustes de color (ver arriba). Original: (P4, §6.3): rotar/voltear/recortar/ajustes → copia generada al vuelo con
   `stamp(rights)`, nada se guarda; validar parámetros, cola con concurrencia limitada.
5. ~~**Info en el visor**~~ **Hecho** (sin coordenadas en pantalla). Original: datos de cámara curados + metadatos de derechos (`Backend/services/photo-rights.js`), igual que el admin.
6. ~~**Favoritos** persistentes (P10)~~ **Hecho** (compartido con el admin). Falta: corazón deshabilitado en Preview, migrar `keep` → `favorites` (opcional) y borrar la columna.
7. **Profile editable** (P5): `PATCH /api/client/me` (nombre, teléfono con libphonenumber-js + capturar `P2002`
   de `phoneE164`, Instagram, `locale` para correos); el correo solo lo cambia Areli. Comprobar `Origin` y JSON en escrituras.
8. **Bookings** (línea de tiempo, próxima sesión con cuenta regresiva y **Add to calendar .ics**) y **Payments**
   (anillo pagado/total + recibo, instrucciones Zelle/Cash App de `site-config`) (§1, §1.3). Pestañas nuevas en `TABS`.
9. **Contacto**: "Text Areli" (`sms:` + E.164) e Instagram (P14).
10. **Preview as client** (§5): botón en el admin (`admin/src/app/pages/galleries/integrations.js` `previewAsClient`,
    y en el perfil del cliente) → `/client/…?preview=<clientId>`; el cliente manda `X-Preview-Client`; banda
    "Previewing as …"; `RequireClient` (`client/src/app/guards.jsx`, marcador `INTEGRATION(preview-as-client)`) debe dejar pasar al ADMIN con `?preview`.
11. **Correos de entrega** (§7, P7): variante *first* (credenciales temporales) si `lastLoginAt` es null, *returning*
    (solo enlace a `/login`) si ya entró; decidir dentro de la transacción de entrega; aviso en el modal Deliver del admin.
12. **"Create login" en el admin** (reemplaza `Backend/scripts/dev-client-login.js`).
13. **Book again** (§8): botón + `GET /api/client/me/booking-prefill`; documentar en `docs/formulario-publico-booking.md`.
14. **Restablecer contraseña** (PENDIENTE, §11): hoy el login dice "Text or message Areli". Modelo `PasswordResetToken` ya existe.
15. Landing bilingüe `/` + `/es/` (fuera del portal), galerías PASSWORD / PUBLIC_LINK (`/g/<slug>`), búsqueda por persona (embeddings).

## 5. Trampas conocidas

- **Favorito único**: no reutilices `Photo.keep`; los `keep = true` viejos no se migraron. `gallery.model.js` devuelve `favorite` con el helper `shape`.
- **Selección de texto en Safari**: `useMarquee.js` cancela `selectstart` mientras dura el press; el `useMarquee` del admin es otra copia y puede tener el mismo problema.
- El contador de descargas lo declara el cliente (`photoIds`); bajar por URL directa no registra.
- Originales: se conserva **todo** el EXIF (GPS incluido, decisión de Alexis) y se agrega el aviso de derechos con `exiftool-vendored` (necesita **perl** en la imagen de producción). El texto `USAGE_TERMS` de `photo-rights.js` está por revisar.
- Los errores del ZIP (429 `ZIP_BUSY`, 403) no se muestran: el navegador descarga por un iframe oculto.

- `client/` no tiene `basename` en el router: es dueño de `/login` y de `/client/*`. En dev, un plugin de
  `client/vite.config.js` sirve `index.html` para `/login` y `/`.
- El script de modo oscuro está en `public/theme.js` y no inline, para que la CSP sea `script-src 'self'`.
- La API solo muestra galerías con privacidad **CLIENT_LOGIN**; si Areli cambia a Password o Anyone with link, desaparece del portal (decisión del plan).
- Dos copias que deben ir iguales: tokens CSS (`client` ↔ `admin`), reglas de contraseña (`client` ↔ `Backend`),
  portada (`Hero.jsx` ↔ `CoverPreview`). Hasta que exista `shared/`, el visor del cliente es más simple que el del admin.
- `auth.jsx` tiene 2 warnings de eslint (react-refresh) aceptados, igual que en el admin.
