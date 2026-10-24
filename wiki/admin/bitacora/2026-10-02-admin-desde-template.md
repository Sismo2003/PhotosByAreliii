---
tema: admin
fecha: 2026-10-02
---

# Admin a partir del template Tailux

## Qué se hizo

- **Origen:** se copió el template React del usuario (`~/Developer/REACT-COMPONETS`, Tailux) a
  `admin/`.
- **Qué no se copió:** las páginas de demo, el buscador, el panel derecho, la documentación del
  template ni los idiomas árabe y chino.
- **Tema:** `admin/src/styles/index.css` pasa los tokens del sistema de diseño a las escalas
  `gray-*` / `dark-*` / `primary-*` del template. Radio 0, solo EB Garamond, botones en mayúsculas
  de 44 px y campos con línea inferior.
- **Componentes escritos o reescritos:**
  - sidebar del diseño (`admin/src/app/layouts/Sideblock/Sidebar/index.jsx`);
  - `StorageBar` (`admin/src/components/shared/storage/`);
  - `PageHeader`, `StatRow` y `Placeholder`;
  - login de dos columnas;
  - página de error única;
  - Customizer reducido, con el layout y el engrane (`DisplayButton`).
- **MainLayout:** primero se trajo como vista previa solo de desarrollo, con pestañas tipo Figma.
  Después, a pedido del usuario, quedó como opción permanente en Display y se quitaron las pestañas.
- **Autenticación:** cookie httpOnly del backend (`/api/auth/*`) y solo el rol ADMIN.
  `admin/src/configs/dev.config.js` hace el bypass en `vite --mode dev`.
- **Fechas y teléfonos:** se quitó `dayjs`. Ahora están `admin/src/utils/date.js` (Luxon,
  `America/Phoenix`) y `admin/src/utils/phone.js` (libphonenumber-js).
- **Despliegue:** `admin/Dockerfile` (Node 22 → nginx 1.27) y `admin/nginx.conf` (aplicación de una
  sola página bajo `/admin/`).

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Carpeta `admin/` y su propio contenedor | usuario | Separar el admin del sitio |
| Mapear los tokens a las escalas del template en lugar de reescribir componentes | agente | Todos los componentes de Tailux toman el diseño sin tocarlos |
| Bypass de login con `--mode dev` (no con una variable `VITE_*`) | agente | `MODE` siempre llega al cliente; ver trampas |
| El bypass depende de `import.meta.env.DEV` | agente | Vite elimina ese código del build de producción (comprobado) |
| Foto del login: maternidad en el desierto, la pareja de espaldas | agente | No mostrar la cara de clientes en una pantalla pública |
| Sideblock por defecto, layout elegido en Display, engrane giratorio | usuario | — |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Build y lint | `npm run build` sin errores; `npm run lint` con 0 errores (1 aviso en un archivo del template) |
| Login, error de contraseña, Overview, sidebar, barra en LOW y FULL, Display, modo oscuro, menú desplegable a 800 px, pestañas de Settings | Chrome contra una API simulada temporal en localhost (antes de que el usuario pidiera no usar el navegador) |
| El bypass y el MainLayout no llegan a `dist/` (cuando eran solo de desarrollo) | `grep` en el build |
| El servidor de desarrollo compila el MainLayout y las pestañas | `curl` a cada módulo (14 respuestas 200) |
| Conversión de Luxon y libphonenumber-js | Script de Node: 04:30 UTC → 9:30 PM en Phoenix; "480 555 0100" → `+14805550100` |

**Lo que NO está verificado:** nada del MainLayout, el engrane ni el selector de layout se ha visto
en pantalla; tampoco el modo `dev` en el navegador; la imagen de Docker no se construyó (el daemon
no corría); no hay backend real, así que el login real solo se probó contra la API simulada.

## Trampas descubiertas

- `GhostGuard` del template mandaba a `/admin/null` cuando no había `?redirect=`. Ya está
  corregido, y además solo acepta rutas internas.
- `isRouteActive("/")` del template coincide con **todas** las rutas. Para la navegación se usa
  `isNavItemActive`, que respeta `end`.
- Una variable de `@theme` que apunta a otra variable (`var(--x)`) se resuelve en `:root`, no en el
  elemento. Por eso `--color-on-this` se define directamente en `.this:primary` (`admin/src/styles/variants.css`).
- Al probar variables `VITE_*` puestas en la línea de comandos, la primera prueba respondió un Vite
  viejo que había quedado en el puerto. **No se sabe** si `VITE_APP_ENV` funcionaba; se cambió a
  `--mode dev`, que sí está comprobado. Antes de probar, revisa `lsof -i :5174 -i :5175`.
- `admin/` **no** está en los workspaces del `package.json` de la raíz: tiene su propio
  `package-lock.json`. Se instala con `cd admin && npm install`.
- `@eslint/js` 10 choca con `eslint` 9; está fijado en `^9.23.0`.
- El chunk principal pesa ~510 KB (aviso de Vite). Pendiente de dividirlo.
- Tailux es un template comercial: confirmar que su licencia cubre este proyecto.

## Siguiente paso

Montar las rutas del backend (`/api/auth/*`, `/api/admin/storage`, `/api/admin/summary`) y construir
Bookings (lienzo `AdminBookings*.dc.html`).

---
Relacionado: [[admin]] · [[diseno-ui]] · [[infraestructura]] · [[correos]] · [[base-de-datos]]
