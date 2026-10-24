# Handoff — photosByArelli

Última actualización: **2026-10-02, noche** (Prisma en Docker, seed y login por email o teléfono).

## 0. Empieza aquí

0. **Git y publicación**: el repo es público; skill `git-workflow` (nunca `git push` sin autorización del dueño) y `docs/publicacion.md`.
1. **`CLAUDE.md`** — reglas del proyecto: fechas siempre con **Luxon** (`America/Phoenix`) y
   teléfonos siempre con **libphonenumber-js**.
2. **Datos reales del negocio** (precios, políticas, contacto): no están en el repo público; los
   mantiene el dueño en privado. Los valores usados por la app están en `shared/site.js` y
   `database/seeds/data/catalog.js`.
3. Este archivo, y después el documento del área en la que vayas a trabajar (§3).
4. Detalle y razones de cada decisión: vault `wiki/` (abrir `wiki/README.md`), temas
   `diseno-ui`, `base-de-datos`, `infraestructura`, `correos` y `admin`.

> Última nota: 2026-10-03 — dev seed (`database/seeds/dev-seed.js`) con 45 bookings (40
> pasados, 5 futuros) y datos en todas las tablas dev. Ver [[admin]] ·
> [[2026-10-03-admin-bookings-details-fixes]] para los arreglos de Bookings (Detail Changes,
> CONFLICT sin "Not the same person", filtro de Service).
>
> **2026-10-09 (Portal del cliente, primer corte):** app nueva `client/` (`/client/`) y **login único
> `/login` para admin y clientes** — el admin ya no tiene página de login. API `/api/client/*` (solo
> lectura, aislada por cliente). Sin ver en el navegador. **Handoff del portal: `client/handoff.md`.** Ver `client/README.md`, skill
> `client-portal`, `docs/portal-cliente-plan.md` y [[2026-10-09-portal-cliente-primer-corte]].
>
> **2026-10-05 (Overview):** agenda, requests agendaron/no, dona del disco por galería y visitas (Cloudflare Web Analytics, sin conectar). API `/api/admin/overview` (`docs/api-overview.md`), pasos para Cloudflare en `docs/overview-integraciones.md`. Sin ver en el navegador. Ver [[2026-10-05-overview]].
>
> **2026-10-04 (vista de request):** en Bookings, una request abre una vista de página completa
> (`/bookings/requests/:id`) con ← Back, en vez del drawer; la tabla ya no tiene Source ni Match.
> Ver `admin/handoff.md` y [[2026-10-04-vista-request]]. Sin probar en el navegador.
>
> **2026-10-04 (Galleries):** lista, crear, editor (fotos, sets, portada, ajustes, actividad), entrega y almacenamiento (`/api/admin/galleries`, `/api/admin/storage`); probado con curl, sin ver en el navegador. Faltan Correos, galería del cliente y HEIC. Ver [[2026-10-04-galleries]], `docs/api-galleries.md`, `docs/galleries-pendientes.md` y el resumen [[2026-10-04-sesion-clients-galleries]].
>
> **2026-10-04 (Clients):** lista, perfil, alta y soft delete hechos en el admin y la API (`/api/admin/clients`); sin probar en el navegador. Ver [[2026-10-04-clients]], `docs/api-clients.md`, `docs/clients-page-integraciones.md`.
>
> **2026-10-04:** todas las acciones de Bookings probadas con éxito por curl y dev seed corregido;
> falta revisar la UI en el navegador (lo hace el usuario).
>
> **2026-10-03:** Bookings completo en el admin (6 pestañas, detalle, acciones, calendario),
> probado con curl, todavía sin verlo en el navegador. Ver [[2026-10-03-bookings-tabs-admin]].

**Preferencias del usuario (Alexis, desarrollador y quien hospeda el sitio de Areli):**
- **Pregunta siempre antes de usar el navegador** (Claude in Chrome), incluso en localhost.
- No hagas commit ni push sin permiso. El repo **no es** un repositorio git todavía.
- Prefiere opciones sin costo extra de infraestructura.

## 1. Estado del proyecto

| Parte | Estado |
|---|---|
| Diseño | **Completo como prototipo** en dos Artifacts de claude.ai (§2). Hay cambios pendientes de aplicar (§6). |
| `database/` | Prisma 7 funcionando: `prisma/schema.prisma`, `prisma.config.ts`, migraciones `init_schema` y `add_user_login_phone`, seed en `seeds/seed.js`. MySQL y Prisma Studio corren en Docker **solo para desarrollo** (`database/docker-compose.yml`, §1.1). |
| `Backend/` | Arranca con `npm run dev` (puerto 4000). Montados: **`/api/auth/*`** (login con email **o teléfono**, logout, me, change-password), **`/api/admin/bookings/*`** (Requests: lista, calendario, detalle con `detailChanges`, confirm, decline, match) y **`/api/admin/services/active`** — ver [[2026-10-03-bookings-backend]] en `wiki/admin/`. Errores con `utils/http.js`. `config/db.js` usa `@prisma/adapter-mariadb`. **`/api/admin/clients/*`** y **`/api/admin/galleries/*`** + **`/api/admin/storage`** ya están montados (2026-10-04). |
| `admin/` | **Nuevo.** React 19 + Vite 6 + Tailwind 4, a partir del template Tailux del usuario, re-tematizado con el sistema de diseño. Login con un solo campo "Email or phone" y botón Show/Hide (oculta por defecto), dos layouts (Sideblock por defecto, Main layout opcional), Display con engrane giratorio, barra de almacenamiento, Overview y Settings con pestañas. El resto son páginas vacías. `npm run dev` usa el login real contra el Backend (el bypass de desarrollo se eliminó el 2026-10-09). Ver `admin/README.md`. |
| `client/` | **Nuevo (2026-10-09).** Portal del cliente + página única `/login`. Empieza por `client/handoff.md`. |
| `Frontend/` | Sitio público **mínimo** (Astro estático: una página con enlaces a `/login`, Instagram y correo; `noindex` mientras el dominio sea temporal). Falta la landing real y `/book`. |
| `deploy/` · `.github/` | **Despliegue al servidor `grid`** (CI/CD por Tailscale). Imágenes, compose, vhost, rollout y CI probados en local; **el primer rollout real está pendiente**. Ver `docs/deploy.md`. |
| `docs/` | `almacenamiento-fotos.md` (aprobada) y `correos.md` v2 (aprobada en lo general; quedan 5 puntos en su §12). |

### 1.1 Levantar todo en local

```bash
cd database && docker compose up -d --build   # MySQL :3306 + Prisma Studio :5555; aplica migraciones
# El seed NO corre solo. Solo si lo autorizas: CONFIRM_SEED=yes node seeds/seed.js (desde database/)
cd ../Backend && npm run dev                  # API :4000 (lee Backend/.env)
cd ../client && npm run dev                   # http://localhost:5175/login — login ÚNICO (admin y clientes)
cd ../admin && npm run dev                    # http://localhost:5174/admin/ (sin sesión → :5175/login)
```

- Si cambias `database/package.json`, reconstruye con `docker compose up -d --build -V`.
- Migraciones nuevas: `docker compose run --rm prisma npx prisma migrate dev --name <cambio>`
  necesita una terminal interactiva. Si `migrate dev` pide confirmación y no hay TTY se queda
  esperando: genera el SQL con `prisma migrate diff --from-config-datasource --to-schema
  prisma/schema.prisma --script` en una carpeta nueva de `prisma/migrations/` y aplica con
  `migrate deploy` (así se hizo `add_user_login_phone`).
- `.env` (no van al repo): `database/.env` (URL local y datos del admin del seed) y `Backend/.env`
  (`JWT_SECRET` generado, `DATABASE_URL`). Copiar de los `.env.example`.

**Admin de prueba (seed):** `areli@photosbyareliii.test` o el teléfono ficticio `(480) 555-0123`.
La contraseña se generó al azar y se imprimió una sola vez al correr el seed; no está guardada en
ningún archivo. Para fijar otra: `CONFIRM_SEED=yes SEED_ADMIN_PASSWORD=... node seeds/seed.js` (también la
restablece si el admin ya existe).

**Login por teléfono:** el Backend distingue por la `@`. Un teléfono se normaliza con
libphonenumber-js (US por defecto) y se busca en `User.phoneE164` (Areli, que no tiene `Client`) o
en `Client.phoneE164` (clientes). Cualquier formato sirve: `480-555-0123`, `+1 480 555 0123`…

**Qué crea el seed** (solo lo que falta; nunca pisa lo que Areli edite después):
- el admin;
- `StudioSettings` (id 1, valores por defecto);
- 6 servicios, 8 paquetes y 2 extras, con textos y duraciones del lienzo (`seeds/data/catalog.js`);
- 12 horarios: martes, sábado y domingo a las 8:00, 10:00, 16:30 y 17:15. Salen del diseño y
  son **provisionales** hasta que Areli confirme los suyos.

## 2. El diseño (fuente de verdad visual)

- **Sistema de diseño:** https://claude.ai/artifact/WFQTGdkRUQkFJL97hSUSKq (tokens en `project/tokens.json`).
- **Lienzo con todas las pantallas** (tipo Figma): https://claude.ai/artifact/6q8sY1zKxH3zMTBRoyj1dQ
  (índice `project/canvas.json`; cada pantalla es un `project/<Nombre>.dc.html`).

Se leen con la herramienta `Artifact` (`action: "read"`, `path`). Son privados del usuario, y **el
usuario edita el lienzo en vivo**: vuelve a leer una pantalla antes de republicarla.

## 3. Documentos por área

| Área | Documento | Notas |
|---|---|---|
| Base de datos | `database/handoff.md` | Cada campo con su pantalla de origen, D1–D16, plan de migración (§8). El DBML se edita a mano. |
| Fotos, disco y despliegue | `docs/almacenamiento-fotos.md` | Hetzner, sistemas de archivos de tamaño fijo, barra del sidebar, bloqueo con 500 MB, borrado al vencer. |
| Correos | `docs/correos.md` | Hostinger SMTP por el **587**, 25 correos, plantillas editables (GrapesJS + MJML), bandeja, `settings.json`. |
| Admin | `admin/README.md` | Cómo se adaptó el template, API que espera, comandos, despliegue. |
| Despliegue | `docs/deploy.md`, skill `deploy` | `areli.grid.nimbuscloud.mx/` sitio, `/login`, `/client/`, `/admin/`, `/api/` (un solo origen); dominio y servidor son variables. |
| Publicación | `docs/publicacion.md` · `docs/derechos-imagenes.md` | Qué va a GitHub y qué se queda local; la única imagen pública y su copyright. |

## 4. Decisiones del usuario (no cambiar sin preguntar)

**Producto y diseño**
- Estilo súper simple, blanco y negro, EB Garamond, referencia juliaandgil.com.
- Marca real: **Photos By Areliii LLC**. El logo es `Photos By Areliii LLC/PBA.png`. No hay
  dirección de estudio: no mostrar ninguna.
- Areli confirma cada reserva a mano. Los pagos se hacen fuera del sitio (Zelle, Cash App,
  efectivo) y se registran a mano. Sin Stripe.
- Admin: desktop y tablet primero; móvil responsivo y funcional.
- Un solo login para Areli y clientes, con redirección por rol.

**Datos (detalle en `database/handoff.md` §7)**
- El teléfono también identifica al cliente (`phoneE164` único).
- Los textos de "Page content" y todas las fotos del sitio van en el código, no en la base.
- PIN y contraseña de galería cifrados, no hash. Favoritos solo con login.
- **Las fotos se borran cuando vence la galería**, con email al cliente **48 h antes**.

**Infraestructura**
- Servidor propio **`grid`** (red de Tailscale) con Docker y el `nginx-proxy` compartido; se llega **solo por Tailscale**. Fotos en el disco del servidor (`$DATA_DIR/photos`), **no en R2**. (Antes se planeó Hetzner; ver `wiki/infraestructura`.)
- Barra de disco en el sidebar: verde con más de 60% libre, ámbar de 60% a 30%, rojo por debajo.
- Con **500 MB** libres o menos no se sube nada. El mensaje apunta a borrar galerías viejas o a
  escribir a soporte@nimbuscloud.mx (enlace `mailto:`).
- El espacio de cada parte (fotos, MySQL, correo) se asigna al crear el servidor.

**Correos**
- SMTP de Hostinger. Plantillas editables desde el admin, prueba a un email, interruptor general y
  por plantilla.
- Configuración y claves en un archivo persistente que se reescribe desde el admin.
- Bandeja Sent/Inbox que se puede vaciar.

**Admin**
- Carpeta `admin/` con su propio Docker; nginx la sirve en `/admin`.
- Copiar solo lo básico del template y adaptarlo al diseño.
- Sideblock por defecto; el layout se elige en Display, que se abre con el engrane giratorio.
- (Eliminado el 2026-10-09) Antes, en desarrollo había un bypass de login; ahora `npm run dev` usa siempre el login real.

## 5. Siguiente trabajo sugerido

1. **Backend** (skill `backend`): pasar `Backend/models/*.js` y los controladores de clientes y
   galerías a los nombres del schema nuevo (`database/handoff.md` §8 paso 6; `Gallery.clientId`
   ahora apunta a `Client`, `Photo.originalFilename`…). Crear `GET /api/admin/storage` y
   `GET /api/admin/summary`, que el admin ya consume. Opcional: clientes y reservas de ejemplo
   en el seed, solo para desarrollo.
2. **Areli**: confirmar horarios reales (los del seed son del diseño) y dar el email/teléfono
   reales del admin.
3. **Admin**: construir Bookings (`AdminBookings*.dc.html`), luego Clients, Galleries y Services.
   Cada página vacía dice qué pantalla y qué especificación implementar.
4. **Frontend** (skills `frontend`, `site-config`, `landing-seo`): tokens, `site.js` /
   `services.json` con los datos reales y la landing.
5. **Despliegue**: hacer el primer rollout real en `grid` (`docs/deploy.md` §4: `server-setup.sh`, `.env`, llave de CI,
   secrets de GitHub). El límite de disco por sistema de archivos de tamaño fijo (`docs/almacenamiento-fotos.md` §2) sigue sin
   implementar: en `grid` las fotos van a un directorio normal.
6. **Correos**: resolver `docs/correos.md` §12 y crear el buzón de Hostinger con el DNS.

## 6. Pendientes

**Bookings (admin):** cola de trabajo, verificación pendiente en el navegador y decisiones abiertas en `docs/proximos-pasos-bookings.md`. Incluye lo que hay que saber de las reservas para la documentación del sitio (§6 de ese archivo).

**En el lienzo de diseño**
- AdminServices: ya construido (2026-10-05) como catálogo operativo, sin pestañas de landing. Ver `docs/api-services.md`.
- Galería: quitar **"Reopen 30 days"** y cambiar "reminder 7 days before" por **"48 hours before"** (D9).
- Diseñar las pantallas nuevas: Settings → Email, Email templates, el editor de plantilla, Mail
  (Inbox/Sent) y la barra de almacenamiento.
- Siguen faltando las versiones móviles de `/services`, las sub-landings y `/book`.

**Con el usuario o con Areli**
- `docs/correos.md` §12: dominio de Areli, plan de Hostinger, dónde se dejan las reseñas, recibo del
  balance y resumen diario.
- Usuarios de Zelle y Cash App, tiempo de entrega de las galerías y duración de la galería.
- Tamaño del servidor: con 80 GB caben unas 20 galerías y el estimado de fotos vivas era de ~58 GB.
  Conviene un plan de 160 GB.
- Confirmar que la licencia del template Tailux cubre este proyecto.

**Quitar en producción**
- El recuadro "Prototype accounts" y el "Demo PIN: 4821" del lienzo.
- Las fotos del demo del lienzo, que son recortes de capturas de Instagram.
- `admin/public/login.jpg` es una foto real de Areli (pareja de espaldas): confirmar que se puede usar.

## 7. Qué se verificó y qué no

### Sesión 2026-10-02, noche (Prisma, seed, login)

**Verificado**
- `prisma validate`; migraciones aplicadas en el MySQL de Docker (23 tablas + columnas nuevas de
  `users`); Prisma Studio responde 200 en :5555.
- Seed corrido dos veces desde la Mac: mismos conteos (1 usuario, 6 servicios, 8 paquetes,
  2 extras, 7 enlaces extra–servicio, 12 horarios, 1 fila de settings).
- Login con `curl` contra `Backend/server.js`: email (en mayúsculas también), `(480) 555-0123`,
  `480-555-0123` y `+1 480 555 0123` → 200; contraseña mala o teléfono desconocido → 401; vacío →
  400; `/api/auth/me` con y sin cookie. Un cliente de prueba entró con el teléfono de su `Client`
  (después se borró).
- Validación del campo del admin (email o teléfono) con un script de Node; `admin` compila con
  `npm run build` y `npm run lint` da 0 errores (1 aviso viejo en `Datepicker.jsx`).

**No verificado**
- La pantalla de login no se ha visto en el navegador, ni el flujo completo a través del proxy de
  Vite.
- El seed **desde dentro** del contenedor: la imagen se tiene que reconstruir con `-V` para tener
  argon2 y el adapter. Docker Desktop se colgó en ese momento, se forzó a cerrar y quedó
  encendido, pero **`pba-dev-mysql-1` y `pba-dev-prisma-1` están apagados**: levantar con §1.1.

### Sesión 2026-10-02 (diseño, base, infraestructura, admin)

**Verificado**
- `schema.draft.prisma` con `prisma validate`, y `schema.dbml` con `@dbml/core`.
- `admin/`: `npm run build` y `npm run lint` sin errores. En Chrome, contra una API simulada:
  login, error de contraseña, Overview, sidebar, barra en LOW y FULL, Display, modo oscuro, menú
  desplegable y Settings.
- El admin ya no tiene bypass de login (eliminado el 2026-10-09).
- Conversiones de Luxon y libphonenumber-js con un script de Node.

**No verificado**
- No se ha visto en pantalla: el Main layout, el engrane, el selector de layout ni el modo `dev`.
- Producción: las imágenes, el compose y el vhost se probaron **en local** (2026-10-24); nada se ha ejecutado en el servidor `grid`.
- (Al cierre de esa sesión no había base ni backend; ver la sesión de la noche arriba.)
- No se hizo ningún commit.

Trampas del codebase descubiertas en esta sesión: notas de bitácora de `wiki/admin/`,
`wiki/infraestructura/` y `wiki/base-de-datos/`.
