# client/ — portal del cliente y página única de inicio de sesión

React 19 + Vite 6 + Tailwind 4, mismo sistema de diseño que `admin/`. Reglas: skill
`client-portal` (`.claude/skills/client-portal/SKILL.md`). Plan: `docs/portal-cliente-plan.md`.

| Ruta | Qué es |
|---|---|
| `/login` | **La única página de inicio de sesión** (admin y clientes). Según el rol que devuelve la API manda a `/admin/` o a `/client/`. |
| `/client/welcome` | "Choose your password" (primer ingreso con la contraseña temporal). |
| `/client` | Galerías disponibles (vencidas ocultas, con filtro para verlas). |
| `/client/galleries/:slug` | Portada, secciones, cuadrícula de fotos y visor (`?photo=<id>`). |
| `/client/profile` | Datos (solo lectura), idioma, cerrar sesión. |

## Desarrollo

```bash
cd Backend && npm run dev     # API :4000
cd client && npm run dev      # http://localhost:5175/login
cd admin && npm run dev       # http://localhost:5174/admin/ (sin sesión → localhost:5175/login)
```

Para tener un cliente con login (mientras no exista "Create login" en el admin):
`cd Backend && CONFIRM=yes node scripts/dev-client-login.js <clientId>`. El cliente solo ve galerías
**entregadas** (Deliver en el admin), con privacidad "Client login" y sin vencer.

## Producción

`Dockerfile` + `nginx.conf` (sirve `/client/` y `/login`, con CSP). El nginx de borde
(`deploy/nginx/photosbyareliii.conf`) envía `/client/`, `/login`, `/admin/login` y `/client/login` aquí.
