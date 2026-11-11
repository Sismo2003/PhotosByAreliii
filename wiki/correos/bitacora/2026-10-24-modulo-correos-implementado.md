---
tema: correos
fecha: 2026-10-24
---

# Módulo de correos implementado (fase 1: envío) y listo para producción

Implementa la fase 1 de `docs/correos.md` (envío). La bandeja IMAP (§7) es la fase 2 y no está hecha.
Continúa [[2026-10-02-especificacion-correos]]. Lo hicieron dos sesiones seguidas; la segunda retomó
cuando se cortó la primera, a mitad de preparar producción.

## Qué se hizo

**Backend**

- Plantillas: `Backend/emails/` — `catalog.js` (catálogo con `trigger` auto/manual/scheduled y
  `switch` on/warn/locked), `defaults.js` (contenido por defecto EN/ES en bloques), `layout.js`
  (bloques → MJML), `render.js` (Liquid + MJML → HTML y texto plano), `format.js` (fechas con Luxon,
  teléfonos con libphonenumber-js, enlaces desde `APP_URL`), `fixtures.js` (datos de ejemplo para
  la vista previa y el envío de prueba).
- Servicio: `Backend/services/email/` — `settings.js` (archivo `settings.json`, contraseñas cifradas
  con `CONFIG_SECRET_KEY`), `transport.js` (Nodemailer; Mailpit en desarrollo), `outbox.js`
  (`queueEmail` dentro de la transacción del cambio), `worker.js` (envío y reintentos a
  1 min, 5 min, 30 min, 2 h, 6 h y 24 h), `scheduler.js` (recordatorios cada hora),
  `context.js` (datos de cada correo y `STILL_VALID`), `templates.js`, `login.js`.
- API: `Backend/routes/email.routes.js` (`/api/admin/email/settings|templates|outbox`),
  `Backend/routes/email-assets.routes.js` (solo el logo, público, para los clientes de correo),
  `Backend/controllers/email.controller.js`, `Backend/models/email.model.js`,
  `Backend/validators/email.schemas.js`.
- Disparadores: los `queueEmail` en `Backend/models/booking.model.js`,
  `Backend/models/booking-create.model.js`, `Backend/models/gallery.model.js`,
  `Backend/models/client.model.js` y `Backend/controllers/auth.controller.js`.

**Admin**: `admin/src/app/pages/settings/email/` (servidor, remitente, interruptores, "Test
connection") y `admin/src/app/pages/settings/email-templates/` (editor, vista previa, borrador,
publicar, versiones, envío de prueba), con `admin/src/services/email.js` y `admin/src/slices/email/`.
La casilla "Email the client" del nuevo booking y `DeliverDialog.jsx` de galerías ya encolan correo.

**Producción (esta sesión)**

- `deploy/docker-compose.yml`: `CONFIG_PATH=/data/config/settings.json` y volumen
  `${DATA_DIR}/config:/data/config`. El contenedor de la API es `read_only`, así que sin este
  volumen el archivo no se podía crear.
- `deploy/server-setup.sh`: crea `$DATA_DIR/config` con dueño 1000 y `0700`.
- `Backend/Dockerfile.dockerignore`: excluye `Backend/var` para que el `settings.json` de desarrollo
  no termine dentro de la imagen.
- `Backend/.env.example`: documenta `CONFIG_SECRET_KEY`, `CONFIG_PATH`, `APP_URL`, `MAILPIT_*` y
  `EMAIL_DEV_*`. Los textos "SMTP…" de los secretos cambiaron a `CONFIG_SECRET_KEY`, porque el SMTP
  no va en `.env`, va en `settings.json`.
- `docs/deploy.md`: `config/` en "dónde vive cada cosa", en el respaldo diario y en la mudanza de servidor.
  `docs/correos.md` §3.2: ruta real `/data/config` en vez de `/app/config`.

**Ajustes de la primera sesión, después de la prueba de punta a punta**

- `gallery.resent` ahora incluye la nota personal de Areli (`{{ gallery.message }}`); antes el reenvío la perdía.
- En `layout.js`, un párrafo que solo contiene un campo se envuelve en `{% if campo != blank %}`
  para que una nota vacía no deje un hueco.
- Se quitó el enlace del logo, porque metía la URL del sitio en la versión de texto plano.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| SMTP de Hostinger por 587, plantillas editables, configuración en archivo | usuario | Ver [[2026-10-02-especificacion-correos]] |
| `settings.json` en `$DATA_DIR/config` (bind mount), junto a `photos/` y `mysql/` | agente | Sigue la convención `$DATA_DIR` de `docs/deploy.md`; `/data/config` es paralelo a `/data/storage` |
| `CONFIG_SECRET_KEY` en `Backend/.env`, separado de `GALLERY_ENC_KEY` | spec (§3.1) | La clave no puede vivir en el archivo que protege. Si falta, el código usa `GALLERY_ENC_KEY` |
| El respaldo de `settings.json` va junto al dump de MySQL | spec (§3.2) | Las contraseñas van cifradas, así que restaurarlas exige la misma `CONFIG_SECRET_KEY` |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Entrega de galería de punta a punta (PIN, fecha, enlace) | Envío real a Mailpit, sesión 1 |
| Nota vacía sin hueco / nota presente | `render()` de `gallery.resent` con `message=''` y con la nota de ejemplo |
| Reintento al caer SMTP | Se apagó Mailpit: la fila quedó `PENDING`, intento 1, `ECONNREFUSED`. Al levantarlo pasó a `SENT` en el intento 2 (outbox id 4) |
| Las 25 plantillas × EN/ES renderizan | Script que llama `render(defaultContent, locale, sampleData)` sobre todo `CATALOG`: 50 de 50 sin errores |
| Compose de producción | `docker compose -f deploy/docker-compose.yml config` con variables ficticias: aparecen `CONFIG_PATH` y el montaje `/data/config` |
| `server-setup.sh` | `bash -n` (solo sintaxis) |

**Lo que NO está verificado:**

- Nada se ha desplegado: ni el volumen `config/` en `grid` ni el envío real por Hostinger desde Hetzner (puerto 587).
- No se ha corrido `server-setup.sh` de verdad. En un servidor ya preparado hay que crear
  `$DATA_DIR/config` volviéndolo a correr (es idempotente) **antes** del primer deploy con correos.
  Si no, la API no podrá escribir `settings.json`.
- Un grep de `queueEmail` indica que estos correos del catálogo **no tienen disparador** todavía:
  `booking.request_received` y `admin.new_request` (no hay ruta pública de reservas en
  `Backend/routes/`), `account.invite` y `account.password_reset` (aún no hay alta ni reset de login
  de cliente), `admin.daily_digest`, `admin.email_bounced` (depende de IMAP, fase 2) y
  `support.storage_level`.
- SPF/DKIM/DMARC del dominio (§1.3): siguen pendientes porque el dominio aún no está decidido.

## Trampas descubiertas

- El contenedor `pba-api` es `read_only` y solo tiene `/tmp` como tmpfs: cualquier archivo que la API
  escriba necesita su volumen en `deploy/docker-compose.yml` y su carpeta con dueño 1000 en
  `deploy/server-setup.sh`.
- `Backend/var/` está en `.gitignore`, pero eso no lo saca del contexto de Docker. La imagen se
  arma con `Backend/Dockerfile.dockerignore`, que es otro archivo.
- En desarrollo todo va a Mailpit (`database/docker-compose.yml`, UI en :8025) salvo con
  `EMAIL_DEV_REAL_SMTP=true`, y entonces solo a `EMAIL_DEV_ALLOWLIST`. En producción no hay Mailpit.
- Los enlaces de los correos salen de `APP_URL`, o de `CLIENT_ORIGIN` si no está. En producción
  `CLIENT_ORIGIN` ya es `https://$APP_DOMAIN`, así que no hace falta definir `APP_URL`.

## Siguiente paso

1. El dueño decide el commit y el push (skill `git-workflow`). En el servidor: volver a correr
   `deploy/server-setup.sh` y poner `CONFIG_SECRET_KEY` en `Backend/.env`; eso lo hace el dueño, no el repo.
2. Después del deploy, Areli pone la contraseña SMTP en Settings → Email, pasa "Test connection" y enciende el envío.
3. Conectar los correos que no tienen disparador (lista de arriba) cuando existan sus flujos.
4. Fase 2: bandeja IMAP (`docs/correos.md` §7) y volumen `mail/` (§8).
5. Puntos abiertos con el usuario: `docs/correos.md` §12.

---
Relacionado: [[correos]] · [[infraestructura]]
