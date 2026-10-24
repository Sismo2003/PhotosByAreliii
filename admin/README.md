# admin — Studio admin de Photos By Areliii

React 19 + Vite 6 + Tailwind 4. Parte del template **Tailux** (`~/Developer/REACT-COMPONETS`):
se copió lo básico (contextos, layout Sideblock, Customizer, componentes `components/ui` y
`components/shared`, hooks y utils) y se re-tematizó con el sistema de diseño de Claude Design.
Las páginas de demo, el MainLayout, el buscador, el panel derecho y la documentación del template
**no** se copiaron.

## Cómo se adaptó el template al diseño

- **Tokens → escalas del template** (`src/styles/index.css`): `gray-*` = tema claro (papel `#fff`,
  `#f6f5f3`, líneas `#e7e5e1`, tinta `#151515`); `dark-*` = tema oscuro; `primary` = tinta (negro en
  claro, blanco roto en oscuro). Así todos los componentes de Tailux (Button, Input, Card, Table,
  Badge…) toman el diseño sin reescribirlos.
- **Radio 0** en todas partes, **EB Garamond** como única fuente, botones en mayúsculas de 44 px,
  campos con línea inferior.
- Utilidades propias: `caps`, `wordmark`, `field-label`; colores `bg-paper`, `bg-paper-alt`,
  `text-ink`, `text-ink-muted`, `border-line`, `border-line-strong`, `text-alert`.
- Los únicos colores fuera del blanco y negro: verde, ámbar y rojo de la **barra de almacenamiento**
  (`docs/almacenamiento-fotos.md` §4.2) y `alert` para errores.
- **Customizer ("Display")**: claro / oscuro / sistema, **layout**, estilo de secciones y posición
  de las notificaciones. Se abre con el **engrane giratorio** del template, adaptado: cuadrado,
  en tinta, pegado al borde derecho a media altura (gira lento; quieto si el sistema pide menos
  movimiento). La paleta no se puede cambiar.
- **Dos layouts**, se eligen en Display y se recuerdan en el navegador:
  - **Sideblock** (por defecto, el del diseño): sidebar de 220 px desde 1024 px; debajo, menú
    desplegable.
  - **Main layout** (del template): riel de íconos + panel con sub-secciones y la barra de
    almacenamiento, re-tematizado con los mismos tokens.

## Estructura

```
src/app/navigation/index.js        menú del sidebar (Overview, Bookings, Clients, Galleries, Services, Mail, Settings)
src/app/layouts/Sideblock/         sidebar del diseño + barra superior en móvil
src/app/layouts/MainLayout/        layout del template (opcional, desde Display)
src/app/pages/                     overview, bookings, clients, galleries, services, mail, settings, errors
src/components/shared/layout/      PageHeader, StatRow, Placeholder (temporal)
src/components/shared/storage/     StorageBar, useStorageStatus, storageLevel
src/components/template/Customizer Display + engrane (DisplayButton)
```

## API que espera (mismo origen, `/api`)

| Endpoint | Uso | Estado |
|---|---|---|
| `GET /api/auth/me`, `POST /api/auth/login`, `POST /api/auth/logout` | Sesión por cookie httpOnly; solo `role = ADMIN` | Controladores existen en `Backend/`, falta montar rutas |
| `GET /api/admin/storage` | Barra del sidebar | Pendiente (`docs/almacenamiento-fotos.md` §7) |
| `GET /api/admin/summary` | Métricas del Overview y contadores del menú: `{ requests, sessionsThisWeek, paymentsPending, followUpsDue, unreadMail }` | Pendiente |

El admin **no tiene página de login**: usa la página única `/login` de `client/` (ver `client/README.md`;
en desarrollo, `cd client && npm run dev`). `npm run dev` siempre usa el login real y el Backend (proxy de `/api` a `http://localhost:4000`, o a
`VITE_API_PROXY`). Ya no hay bypass de desarrollo (se eliminó el 2026-10-09): sin Backend y sin base de
datos no se puede entrar al dashboard.

## Comandos

```bash
npm install
npm run dev       # http://localhost:5174/admin/ — sin sesión manda al login único de client/ (http://localhost:5175/login)
npm run build     # dist/ para la imagen de Docker
npm run lint
```

## Despliegue

`Dockerfile` (build con Node 22 → nginx 1.27). El nginx de entrada (`deploy/nginx/photosbyareliii.conf`)
lo sirve en `https://photosbyareliii.com/admin/` y redirige `admin.photosbyareliii.com` ahí.
Se usa la ruta y no el subdominio para que sitio, admin y API compartan origen y la cookie de sesión
funcione sin CORS.

## Siguiente

Las páginas con `Placeholder` dicen qué artboard del lienzo y qué especificación implementar.
Quitar `Placeholder` al construir cada una.
