---
tema: setup-inicial
fecha: 2026-09-22
---

# Instalación del stack (npm workspaces) — sin base de datos todavía

## Qué se hizo

- Se configuró la raíz como **npm workspace** (`package.json` con
  `workspaces: ["Frontend", "Backend", "database"]`) para que `@prisma/client` generado en
  `database/` sea importable desde `Backend/` sin trucos de rutas — se hoistea a un solo
  `node_modules/` en la raíz.
- Se creó `Backend/package.json`, `Frontend/package.json` y `database/package.json` con las
  dependencias descritas en las skills `backend`, `frontend` y `db-migrations`.
- Se corrió `npm install` en la raíz — **634 → 593 paquetes** tras corregir versiones (ver
  "Decisiones"). `npm ls --workspace Backend --workspace Frontend --workspace database` confirma
  que las 3 carpetas resuelven sus dependencias correctamente.
- Se verificó que `@prisma/client` y `astro` resuelven vía `require.resolve` desde `Backend/` y
  `Frontend/` respectivamente, contra el `node_modules/` hoisteado en la raíz.

## Qué quedó a medio construir (a propósito) y por qué

El usuario detuvo el trabajo porque **todavía no existe una base de datos real** — seguir
escribiendo rutas/servidor/frontend que asumen un `DATABASE_URL` funcional era prematuro.  Se
dejó tal cual, sin completar ni borrar, para retomarlo cuando exista la DB:

- `Backend/config/db.js`, `Backend/config/main.js`, `Backend/config/uploads.js` — escritos y
  completos.
- `Backend/middlewares/auth.middleware.js` — escrito y completo (`requireAuth`/`requireAdmin`).
- `Backend/models/user.model.js`, `gallery.model.js`, `photo.model.js` — escritos y completos.
- `Backend/controllers/auth.controller.js`, `client.controller.js`, `gallery.controller.js` —
  escritos y completos.
- **Lo que faltaba y no se llegó a escribir** cuando se detuvo el trabajo:
  `Backend/controllers/photo.controller.js` (upload/download/delete), `Backend/routes/*.js`
  (nunca se montaron rutas), `Backend/app.js`/`server.js` (el servidor Express no existe
  todavía — nada de esto se ha ejecutado ni una vez), y el scaffold real de `Frontend/`
  (`astro.config.mjs`, `tsconfig.json`, `src/pages/`, `src/data/site.js` +
  `services.json` de la skill **site-config** — ninguno de estos archivos existe todavía, solo
  el `package.json`).
- `database/prisma/schema.prisma` existe (User/Gallery/Photo, ver
  [[2026-09-22-estructura-de-carpetas]]) pero **nunca se corrió `prisma generate` ni `prisma
  migrate dev`** — no hay cliente generado, no hay tablas, no hay servidor MySQL confirmado.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| No completar controllers/rutas/servidor ahora | usuario | Sin DB real, escribir más código que depende de ella es prematuro — mejor detenerse y documentar que seguir a medias |
| Astro `^5.18.2` → `^7.3.4`, `@astrojs/react` `^4.4.2` → `^7.0.0`, `@astrojs/sitemap` → `^3.7.4`, `@tailwindcss/vite`/`tailwindcss` → `^4.3.3` | agente, no objetado | `npm audit` marcó la versión de planner (`astro ^5.18.2`) con 1 vulnerabilidad **crítica** (XSS múltiple, RCE en optimización AVIF) y varias altas — se sube a la versión que el propio `npm audit fix` habría instalado, antes de que hubiera código real que migrar |
| `sharp` `^0.34.2` → `^0.35.4` | agente, no objetado | Vulnerabilidades heredadas de libvips/libheif en versiones `<=0.35.4-rc.0` |
| Prisma `^6.19.3` → `^7.10.0` (client y CLI) | agente, no objetado | Cliente y CLI deben ir en la misma mayor; se alinean ambos a la última estable |
| No forzar `npm audit fix --force` para las 4 vulnerabilidades "high" restantes | agente | Son transitivas del **CLI** de Prisma (`@prisma/config` → `deepmerge-ts`/`mysql2`), no de `@prisma/client` (lo que corre en producción). `--force` quería *bajar* a `prisma@6.19.3`, lo que rompería el alineamiento de versión con `@prisma/client@7.10.0`. No hay fix estable publicado todavía (solo prereleases `8.0.0-rc.*`) |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Instalación de dependencias | `npm install` en la raíz, 0 errores, `npm ls --workspace ...` confirma versiones |
| Resolución cross-workspace de `@prisma/client` y `astro` | `require.resolve(...)` desde `Backend/` y `Frontend/` apuntando al `node_modules/` de la raíz |
| Vulnerabilidades restantes | `npm audit` — 4 "high", todas en `prisma` (CLI, devDependency), ninguna en `@prisma/client` |

**Lo que NO está verificado:** nada del código de `Backend/` se ha ejecutado — no hay
`Backend/server.js`, así que no se puede levantar el servidor todavía. `astro dev` tampoco se ha
corrido — no existe `astro.config.mjs`. `prisma generate` no se ha corrido — no hay
`DATABASE_URL` real, solo el placeholder en `database/.env`.

## Siguiente paso

Cuando exista una base de datos MySQL real:
1. Poner el `DATABASE_URL` real en `database/.env`.
2. `npm run prisma:generate` (raíz) para generar el cliente.
3. `npm run prisma:migrate` (raíz) para la primera migración.
4. Retomar `Backend/`: escribir `photo.controller.js`, `routes/*.js`, `app.js`, `server.js`.
5. Scaffold real de `Frontend/`: `astro.config.mjs`, `tsconfig.json`, `src/pages/`,
   `src/data/site.js` + `services.json` (skill **site-config**).

---
Relacionado: [[setup-inicial]]
