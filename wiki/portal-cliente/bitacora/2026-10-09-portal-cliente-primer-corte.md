---
tema: portal-cliente
fecha: 2026-10-09
---

# Portal del cliente: primer corte y login único

Parte de [[portal-cliente]]. Plan: `docs/portal-cliente-plan.md`.

## Qué se hizo

- **App `client/`** (React 19 + Vite 6 + Tailwind 4, base `/client/`, puerto 5175). Tokens y
  `components/ui` (Button, Input, Skeleton) copiados del admin; `styles/index.css` lleva un aviso de
  que es espejo del admin.
- **Login único `/login`** (pedido del usuario: misma ruta y mismo diseño para todos, sin repetir
  código). Lo sirve `client/`; tras entrar, `destinationFor()` usa el rol de la API → `/admin/…` o
  `/client/…`. **Se borró el login del admin** (`app/pages/Auth`, `GhostGuard`, `login.jpg`); su
  `AuthGuard` manda a `/login?redirect=/admin/…` (con `&expired=1` si la sesión murió). `/admin/login`
  y `/client/login` redirigen a `/login` (nginx y routers).
  - Por qué no "nginx redirige por rol": nginx no puede validar el JWT; el rol solo es confiable
    leído de la BD por la API.
- **Primera contraseña** `/client/welcome`: el componente de `Frontend/src/components/portal/` se
  movió aquí (con i18n); `passwordRules.js` vive ahora en `client/src/utils/` (espejo de
  `Backend/utils/password-rules.js`). La API rechaza `/api/client/*` con `MUST_CHANGE_PASSWORD` mientras tanto.
- **API** `/api/client/*`: `middlewares/client-scope.middleware.js` (CLIENT → su `clientId`; ADMIN +
  `X-Preview-Client` → preview solo lectura, ya listo para el botón del admin), `models/client-portal.model.js`
  (dueño + visibilidad en la misma consulta, 404 uniforme, `select` explícitos), rutas `me`,
  `galleries`, `galleries/:slug`, `…/photos` (cursor), `…/photos/:id/thumb|web` (`sendFile` con
  `root`). Rate limit por cuenta. Registra `gallery.viewed` (una vez cada 30 min; no en preview).
- **UI**: barra inferior estilo iOS en móvil, barra superior en `md+`; galerías como portadas grandes
  con tira de 3 fotos y aviso de días; vencidas ocultas con chip "Expired (n)"; galería con portada,
  aviso de cierre ≤ 7 días, chips de secciones, cuadrícula cuadrada recortada en las caras
  (`focusX/focusY`), scroll infinito, visor con swipe/teclado y `?photo=<id>` para que Back lo cierre.
- **Deploy**: `client/Dockerfile`, `client/nginx.conf` (CSP sin inline: el script de modo oscuro es
  `public/theme.js`), servicio `client` en `deploy/docker-compose.yml`, rutas en el nginx de borde.
- `Backend/utils/phone.js`: `formatPhone`. `Backend/scripts/dev-client-login.js` (con `CONFIRM=yes`)
  da login a un cliente en desarrollo.

## Verificado

- `client`: eslint sin errores, `vite build` ok. `admin`: eslint sin errores, build ok.
- Modelo probado contra la BD de desarrollo (solo lectura): otro cliente → 404 en galería y foto;
  borrador invisible para el cliente y visible en preview; `original` → 404; paginación por cursor.
- `/api/client/*` sin sesión → 401.

## Sin verificar

- Nada visto en el navegador. Falta un cliente con login y una galería entregada en la BD de
  desarrollo (script de arriba + Deliver en el admin).
- nginx de producción sin probar (como el resto de `deploy/`).

## Cambio: primera contraseña sin "contraseña actual" (pedido del usuario)

- `/client/welcome` muestra solo **New password** + **Repeat**: la temporal ya se probó en el login.
- `POST /api/auth/change-password`: si `mustChangePassword` es true, `currentPassword` no se pide;
  rechaza la nueva si es igual a la temporal (`SAME_AS_TEMPORARY`). Se guarda con
  `UserModel.setFirstPassword` (`updateMany … where mustChangePassword: true`), atómico: si dos
  peticiones compiten, la segunda recibe 409 `ALREADY_CHOSEN`. Cambios posteriores siguen pidiendo la actual.
- Probado con curl: igual a la temporal → 400, reglas → 400, sin cuerpo → 400. El caso exitoso
  no se probó para no gastar la contraseña temporal del cliente 1.

## Cambio: el layout de portada (Full / Split / Minimal) se respeta en el portal

- Antes el portal siempre dibujaba Full, aunque Areli eligiera otro (la API ya mandaba `coverLayout`).
- `client/src/app/pages/gallery/Hero.jsx`: **Full** (foto a pantalla completa + texto sobre degradado),
  **Split** (foto | texto; en móvil foto arriba y texto abajo), **Minimal** (texto centrado + foto entera
  sin recortar, enmarcada). Mismo texto en los tres: servicio · fecha, título, fotos · disponible hasta.
- La vista previa del admin (`CoverTab.jsx` → `CoverPreview`) se alineó: mismo texto superior
  (antes decía "Photos by Areliii") y Minimal con la foto enmarcada. Regla en la skill `client-portal` §4.
- Build y eslint ok en las dos apps. Sin ver en el navegador.
