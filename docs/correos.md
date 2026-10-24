# Especificación — correos: envío SMTP, plantillas editables, bandeja y configuración

Fecha: 2026-10-02 (v2: SMTP de Hostinger, editor en el admin, bandeja, archivo de configuración) · Estado: **aprobada en lo general por el usuario, sin implementar**. Las decisiones abiertas están en la §12.

Para el agente que implemente cualquier email, la pantalla Settings → Email, el editor de plantillas o la bandeja. Relacionado: `docs/almacenamiento-fotos.md` (sistemas de archivos de tamaño fijo y Docker), `database/handoff.md` (D3 cifrado, D9 borrado, §4.9 eventos).

---

## 1. Decisiones

| Tema | Decisión |
|---|---|
| Envío | **SMTP del correo de Hostinger** (Business Email) con un buzón del dominio de Areli, p. ej. `hola@<dominio>`. Librería: **Nodemailer**. |
| Recepción | **IMAP** del mismo buzón (`imap.hostinger.com:993`, SSL). Librería: **ImapFlow** + **mailparser**. |
| Configuración del servidor de correo | La edita Areli en **Settings → Email**. Se guarda en un **archivo de configuración** del backend (§3), no en la base. |
| Plantillas | **Editables en el admin** con **GrapesJS + grapesjs-mjml** (MIT, se aloja con la app, sin cuentas externas). Se guardan como MJML en MySQL y se compilan a HTML con el paquete `mjml`. |
| Variables en plantillas | **LiquidJS** (`{{ client.firstName }}`): escapa HTML por defecto y no ejecuta código. |
| Encender y apagar | Interruptor **general** de envío e interruptor **por plantilla**, en el archivo de configuración (§3.3). |
| Pruebas | Botón **"Send test"** en cada plantilla, con un campo para el email de destino (§6). |
| Bandeja | **Sent** (lo que manda el sistema) y **Inbox** (lo que llega al buzón por IMAP), guardadas en un sistema de archivos de tamaño fijo, con botón **Vaciar** (§7). |
| Envío asíncrono | **Outbox en MySQL + worker** (§5): se mantiene de la v1. |
| Desarrollo | **Mailpit** en Docker (SMTP en `:1025`, UI en `:8025`): ningún correo de prueba llega a un cliente real. |
| Descartado | Resend (lo reemplaza Hostinger, que el usuario ya usa en su empresa) y React Email (no se puede editar desde el admin). |

### 1.1 Puerto SMTP: usar 587, no 465 (importante)

Hostinger muestra `smtp.hostinger.com`, SSL, puerto **465**. **Hetzner bloquea la salida por los puertos 25 y 465 en todos sus servidores cloud.** Solo los desbloquea a petición, después de unos 30 días como cliente con una factura pagada, y caso por caso. El puerto **587 (STARTTLS)** está abierto desde el primer día, y Hostinger también lo acepta.

- Valor por defecto en la configuración: **host `smtp.hostinger.com`, puerto `587`, seguridad `STARTTLS`**.
- El formulario permite elegir **SSL/TLS (465)** o **STARTTLS (587)**. Si se elige 465 y la conexión no responde, el botón "Test connection" dice: *"Port 465 seems blocked by the server provider — use 587 with STARTTLS."*
- El IMAP (993) **no** está bloqueado.

### 1.2 Límites de Hostinger

- Business Starter: **1 000 correos al día por buzón**. Business Standard y Premium: 3 000. Es una ventana móvil de 24 h, y entradas y salidas se cuentan por separado.
- El volumen estimado es de 150–300 al mes, muy por debajo del límite.
- `dailyLimit` en la configuración (por defecto **800**, con margen sobre 1 000). El worker no lo pasa (§5.4).
- Confirmar el plan real de Hostinger que se contrate y ajustar `dailyLimit`.

### 1.3 Dominio y DNS (antes de enviar nada real)

- Buzón de Hostinger en el dominio de Areli (pendiente: §12).
- En el DNS, los registros que da hPanel: **MX** de Hostinger, **SPF** (`v=spf1 include:_spf.mail.hostinger.com ~all`), **DKIM** (registro de hPanel) y **DMARC** (`v=DMARC1; p=none; rua=mailto:soporte@nimbuscloud.mx`, que pasa a `p=quarantine` después de 2 semanas sin problemas).
- **Remitente:** `Areli · Photos By Areliii <hola@<dominio>>`.
- **Reply-To:** el mismo buzón, para que las respuestas de los clientes aparezcan en la **Inbox** del admin (§7). Areli puede además reenviarlas a su Gmail desde hPanel si quiere.

---

## 2. Catálogo de correos (25)

Leyenda:
- **Auto**: lo manda el sistema solo.
- **Botón**: Areli lo dispara desde el admin.
- **Programado**: lo encola una tarea cada hora (§5.5).

Columna **Apagable**:
- **Sí**: Areli lo puede apagar.
- **Aviso**: se puede apagar, pero se muestra una advertencia.
- **No**: está bloqueado (§3.4).

Todas las plantillas existen en **inglés y español**; se usa la de `Client.locale`.

### 2.1 Reservas (al cliente)

| # | Clave | Cuándo | Disparo | Apagable | Contenido |
|---|---|---|---|---|---|
| 1 | `booking.request_received` | Envía `/book` | Auto | Sí | "Request sent, Daniela.", resumen, código `PBA-0142`, que **todavía no está reservado** y en cuánto responde Areli |
| 2 | `booking.accepted_pay_deposit` | Confirm → AWAITING_DEPOSIT | Auto | Aviso | Depósito del 50%, Zelle y Cash App, fecha límite (48 h) y la política |
| 3 | `booking.deposit_reminder` | Faltan 12 h para `depositDueAt` | Programado + Botón | Sí | Recordatorio del 2 |
| 4 | `booking.confirmed` | Pagado ≥ depósito | Auto | Aviso | Fecha (Arizona time), lugar, balance, política y `.ics` adjunto |
| 5 | `booking.prep_reminder` | 48 h antes de `startsAt` | Programado | Sí | Hora, lugar con enlace a Maps, qué traer, balance y 30 min de tolerancia |
| 6 | `booking.rescheduled` | Reprogramar | Auto | Sí | Fecha nueva y anterior, aviso de que es la única reprogramación y `.ics` nuevo |
| 7 | `booking.cancelled` | Cancelar | Auto | Sí | Motivo y qué pasa con el depósito. Con NO_SHOW solo si Areli marca "Notify client" |
| 8 | `booking.declined` | Rechazar | Auto | Sí | Mensaje amable |
| 9 | `booking.expired` | "Mark as expired" | Auto | Sí | La fecha se liberó |

### 2.2 Seguimiento (al cliente)

| # | Clave | Disparo | Apagable |
|---|---|---|---|
| 10 | `followup.thanks` | Botón | Sí |
| 11 | `followup.review_request` | Botón | Sí |
| 12 | `followup.review_reminder` | Botón (máximo uno) | Sí |

### 2.3 Cuenta (al cliente)

| # | Clave | Cuándo | Disparo | Apagable |
|---|---|---|---|---|
| 13 | `account.invite` | "Create login" / "Resend invite" | Botón | Aviso (sin email, Areli debe pasar la contraseña temporal a mano; la pantalla la muestra una vez) |
| 14 | `account.password_reset` | "Forgot password" | Auto | **No** |
| 15 | `account.password_changed` | Cambio de contraseña | Auto | **No** |
| 16 | `account.email_changed` | Areli cambia el email | Auto, al email anterior y al nuevo | **No** |

### 2.4 Galerías (al cliente)

| # | Clave | Cuándo | Disparo | Apagable |
|---|---|---|---|---|
| 17 | `gallery.delivered` | "Deliver gallery" | Botón (modal con asunto y mensaje) | Aviso (igual que el 13) |
| 18 | `gallery.resent` | "Resend" | Botón | Sí |
| 19 | `gallery.extended` | "Extend 30 days" | Auto | Sí |
| 20 | `gallery.expiry_warning` | **48 h antes** de `expiresAt` (D9) | Programado | Aviso: *"Clients won't be told before their photos are deleted."* |

### 2.5 Para Areli

| # | Clave | Cuándo | Apagable |
|---|---|---|---|
| 21 | `admin.new_request` | Llega una solicitud | Sí |
| 22 | `admin.daily_digest` | 7:00 AM Phoenix, solo si hay algo | Sí (pendiente §12) |
| 23 | `admin.email_bounced` | Se detecta un rebote en la Inbox (§7.4) | Sí |

### 2.6 Para soporte (soporte@nimbuscloud.mx)

| # | Clave | Cuándo | Apagable |
|---|---|---|---|
| 24 | `support.storage_level` | Fotos o correo en CRITICAL o FULL | **No** |
| 25 | `support.email_failures` | Un correo llega a FAILED (como mucho 1 por hora) | **No** |

Los recordatorios para volver a reservar **no** son correos automáticos: serían comerciales, y CAN-SPAM pediría un enlace de baja y una dirección postal, que Areli no tiene.

---

## 3. Archivo de configuración

### 3.1 Qué va en el archivo y qué no

| Dónde | Qué |
|---|---|
| **`.env`** (lo pone Alexis al desplegar; no se edita desde el admin) | `DATABASE_URL`, `JWT_SECRET`, **`CONFIG_SECRET_KEY`** (clave para cifrar los secretos del archivo), rutas (`CONFIG_PATH`, `STORAGE_PATH`, `MAIL_STORAGE_PATH`), `SUPPORT_EMAIL`, `NODE_ENV` |
| **`settings.json`** (lo edita Areli desde Settings → Email) | Servidor SMTP e IMAP, remitente, interruptores de envío y de cada plantilla, límites y retención de la bandeja |
| **MySQL** | Plantillas y su historial, outbox (enviados), mensajes recibidos (metadatos) y `StudioSettings` (reglas del negocio) |

`CONFIG_SECRET_KEY` **no puede** vivir en el mismo archivo que protege; por eso va en `.env`.

### 3.2 Ubicación y persistencia

- En el contenedor: `/app/config/settings.json` (`CONFIG_PATH`).
- En el host: bind mount de **`/srv/pba/config`**, que vive en el disco raíz porque pesa unos pocos KB. **Persiste** al reiniciar o recrear el contenedor y al actualizar la imagen.
- **Al arrancar el backend:**
  1. Si el archivo **no existe**, se crea con los valores por defecto (§3.3) y con el envío **apagado**, hasta que Areli ponga la contraseña SMTP y pase "Test connection".
  2. Si existe, se lee y se **valida** con yup. Si es inválido (por ejemplo, alguien lo editó a mano y rompió el JSON), el backend **no** lo sobrescribe: arranca con el envío pausado, registra el error y el admin muestra *"Email settings file is invalid — contact Alexis"*.
  3. **Migración:** el archivo tiene `"version"`. Si el código espera una versión más nueva, agrega las claves que faltan con sus valores por defecto y conserva el resto.
- **Al guardar desde el admin** (`PUT /api/admin/settings/email`):
  1. Validar todo el cuerpo con el mismo schema yup.
  2. Cifrar las contraseñas nuevas.
  3. Copiar el archivo actual a `settings.json.bak`.
  4. Escribir en `settings.json.tmp`, hacer `fsync` y **renombrar** sobre `settings.json` (escritura atómica: nunca queda un archivo a medias).
  5. Recargar la configuración en memoria y recrear el transporte de Nodemailer y la conexión IMAP.
  6. Registrar un `ActivityEvent` (`settings.email_updated`), **sin** valores secretos.
- Un **candado en memoria** evita que dos guardados simultáneos se pisen (hay una sola instancia del backend).
- **Permisos:** archivo `0600`, dueño el usuario del contenedor (1000). La carpeta no se sirve nunca por HTTP. Se agrega `config/` al `.gitignore`.
- **Respaldo:** se respalda junto con el dump de MySQL. Las contraseñas van cifradas; para restaurarlas hace falta el `CONFIG_SECRET_KEY`, que se guarda aparte (gestor de contraseñas de Alexis).

### 3.3 Forma del archivo

```json
{
  "version": 1,
  "email": {
    "enabled": false,
    "smtp": {
      "host": "smtp.hostinger.com",
      "port": 587,
      "security": "starttls",
      "user": "hola@<dominio>",
      "passwordEnc": "v1:gcm:base64iv:base64tag:base64data"
    },
    "imap": {
      "enabled": true,
      "host": "imap.hostinger.com",
      "port": 993,
      "security": "ssl",
      "user": "hola@<dominio>",
      "passwordEnc": null,
      "useSmtpPassword": true,
      "folder": "INBOX",
      "syncEveryMinutes": 5,
      "deleteOnServerWhenEmptied": false
    },
    "from": { "name": "Areli · Photos By Areliii", "address": "hola@<dominio>" },
    "replyTo": "hola@<dominio>",
    "adminNotifyEmail": "hello@example.com",
    "dailyLimit": 800,
    "copyToSentFolder": true,
    "templates": {
      "booking.request_received": { "enabled": true },
      "booking.accepted_pay_deposit": { "enabled": true },
      "...": { "enabled": true }
    },
    "inbox": { "retentionDays": null, "autoEmptyAtPercentUsed": 90 }
  }
}
```

- Las contraseñas solo existen como `passwordEnc`: AES-256-GCM con `CONFIG_SECRET_KEY` y un IV nuevo en cada guardado.
- **La API nunca devuelve una contraseña.** `GET` responde `"passwordSet": true`. El campo del formulario aparece vacío con el texto "Saved — type to replace". Si se envía vacío, se conserva la actual.
- `SUPPORT_EMAIL` no está en el archivo: no se puede cambiar desde el admin.

### 3.4 Interruptores de envío

- **General apagado** (`email.enabled = false`): todo lo que se encola queda como **SKIPPED** en el outbox, con el motivo "Email sending is off". **No se pierde**: Areli lo ve en Sent y puede pulsar "Send now" en cada uno cuando lo vuelva a encender. Los correos **No apagables** (14, 15, 16, 24 y 25) **sí** se envían aunque el general esté apagado: sin ellos un cliente no podría recuperar su cuenta ni Alexis enterarse de un disco lleno. Esto se explica junto al interruptor.
- **Plantilla apagada:** igual, SKIPPED con el motivo "Template turned off".
- **Aviso** al apagar 2, 4, 13, 17 o 20: un diálogo explica la consecuencia antes de guardar.
- **No apagable:** el interruptor aparece deshabilitado, con el texto "Required for account security" o "Required for support alerts".

---

## 4. Plantillas editables

### 4.1 Editor

- **GrapesJS** con el plugin **grapesjs-mjml**, cargado solo en la pantalla del editor (import dinámico, unos 1 MB). Ofrece arrastrar y soltar secciones, columnas, texto, botón, imagen, separador y espaciador, con estilos, deshacer y rehacer, y vista previa de escritorio y de móvil.
- **Bloques propios** con el estilo del sistema de diseño: cabecera con logo PBA, pie con el contacto del negocio, botón negro, caja de "detalles de la reserva" y caja de "credenciales" (contraseña temporal y PIN).
- Fuente: EB Garamond con Georgia de respaldo. Blanco y negro.
- **Panel de variables:** muestra **solo** las variables de esa plantilla (§4.3). Al hacer clic se inserta `{{ booking.code }}`.
- **Asunto:** campo de texto aparte, que también acepta variables.
- **Pestañas EN / ES:** cada idioma es una plantilla aparte.
- **Imágenes:** solo las de una pequeña biblioteca subida al servidor (el logo y alguna foto), servidas desde `/email-assets/`, que es público. **No** se permiten fotos de galerías de clientes.
- **Probar compatibilidad:** antes de elegir la versión, comprobar que grapesjs-mjml está mantenido y funciona con la versión de GrapesJS que se instale. Si no, la alternativa es GrapesJS con `grapesjs-preset-newsletter` (HTML con tablas en lugar de MJML).

### 4.2 Guardado, versiones y publicación

- **Borrador y publicada:** "Save draft" guarda sin afectar a lo que se envía. **"Publish"** reemplaza la versión que usan los envíos reales.
- Cada publicación crea una fila en `EmailTemplateVersion`. Se guardan las últimas 20 y se puede **volver a una anterior**.
- **"Restore default"** vuelve a la plantilla original del repositorio (`Backend/emails/defaults/<clave>.<locale>.mjml`). Esos archivos se cargan en la base con el seed y sirven de respaldo si la plantilla de la base falta o está corrupta.
- **Validación antes de publicar:**
  - el MJML compila sin errores (`mjml(..., { validationLevel: 'strict' })`);
  - la plantilla renderiza con datos de ejemplo sin variables desconocidas (Liquid en modo `strictVariables`);
  - **contiene las variables obligatorias.** Si faltan, no se puede publicar y se dice cuál falta:

| Plantilla | Debe contener |
|---|---|
| `account.password_reset` | `{{ reset.url }}` |
| `account.invite` | `{{ login.email }}`, `{{ login.tempPassword }}`, `{{ login.url }}` |
| `gallery.delivered` | `{{ gallery.url }}`, `{{ gallery.pin }}` si el PIN está activo; `{{ login.tempPassword }}` si es su primer login |
| `gallery.expiry_warning` | `{{ gallery.url }}`, `{{ gallery.deleteDate }}` |
| `booking.accepted_pay_deposit` | `{{ booking.depositAmount }}`, `{{ booking.depositDueDate }}`, `{{ payment.zelle }}` o `{{ payment.cashApp }}` |

- **Versión de texto plano:** se genera sola desde el HTML con `html-to-text`.

### 4.3 Variables disponibles

Siempre:
- `business.*`: nombre, teléfono, Instagram y email, desde `site.js`;
- `client.firstName` y `client.displayName`;
- `app.url`.

Además, cada plantilla declara las suyas en `Backend/emails/registry.js` (por ejemplo, `booking.*`, `gallery.*`, `payment.*`, `login.*`, `reset.*`). El editor muestra esa lista y los datos de ejemplo salen de `Backend/emails/fixtures/<clave>.js`.

Las fechas que reciben las plantillas (`booking.date`, `gallery.deleteDate`…) ya vienen formateadas con **Luxon** en `America/Phoenix` y dicen "Arizona time"; los teléfonos, con **libphonenumber-js** (regla en `/CLAUDE.md`).

### 4.4 Seguridad de las plantillas

- Liquid **escapa** toda variable. Un nombre de cliente como `<script>` sale como texto.
- Al publicar, el HTML compilado pasa por un sanitizador con lista de permitidos (sin `<script>`, `on*=` ni `javascript:`).
- Solo el ADMIN puede editar, probar y publicar.

---

## 5. Envío: outbox y worker

### 5.1 Flujo

```
Acción de negocio ── misma transacción ──► fila EmailOutbox (PENDING)
                                             │
Worker cada 5 s (SELECT … FOR UPDATE SKIP LOCKED, hasta 10)
  1. ¿Interruptor general o de plantilla apagado? → SKIPPED (salvo No apagables)
  2. guard(): ¿todavía tiene sentido? (p. ej. prep_reminder: ¿sigue CONFIRMED, misma fecha?) no → CANCELLED
  3. Datos frescos de la base + plantilla PUBLICADA → Liquid → MJML → HTML + texto
  4. Nodemailer → smtp.hostinger.com:587 STARTTLS
       Message-ID fijo: <outbox-{id}@<dominio>>
  5. OK  → SENT, messageId, sentAt, secretsEnc = null, copia .eml en la bandeja (§7),
           (opcional) APPEND a la carpeta "Sent" del buzón por IMAP, ActivityEvent
     Error temporal (red, 421, 45x) → PENDING, reintento: 1 min, 5 min, 30 min, 2 h, 6 h, 24 h
     Error permanente (55x, dirección inválida) o 6 intentos → FAILED + aviso #25
```

- **Duplicados:** SMTP no tiene idempotencia. Si el proceso muere entre enviar y marcar SENT, al reintentar puede salir dos veces. Para reducirlo, la fila se marca SENT justo después del `250 OK`, y el `Message-ID` fijo hace que muchos clientes de correo agrupen el duplicado. Se acepta este riesgo, que es raro.
- Las filas atascadas en SENDING más de 10 min vuelven a PENDING.

### 5.2 Tabla `EmailOutbox` (en `database/schema.draft.prisma`)

`key`, `templateVersionId`, `toEmail`, `toName`, `locale`, `data` (Json, **sin secretos**), `secretsEnc` (contraseña temporal y PIN; se ponen en null al enviar), `subject`, `dedupeKey` (unique), `status` (PENDING, SENDING, SENT, FAILED, CANCELLED o SKIPPED), `skipReason`, `isTest`, `sendAfter`, `attempts`, `nextAttemptAt`, `lastError`, `messageId` (unique), `emlPath`, `sizeBytes`, `bouncedAt`, `clientId`, `bookingId`, `galleryId`, `createdAt`, `sentAt`.

### 5.3 Transporte

```js
// Backend/services/email/transport.js
// Se crea desde settings.json; se recrea cuando Areli guarda la configuración.
nodemailer.createTransport({
  host, port,
  secure: security === 'ssl',          // 465
  requireTLS: security === 'starttls', // 587
  auth: { user, pass: decrypt(passwordEnc) },
  pool: true, maxConnections: 2, maxMessages: 50,
  tls: { minVersion: 'TLSv1.2' },
});
```

- En desarrollo (`NODE_ENV !== 'production'`) el transporte **siempre** es Mailpit, ignore lo que diga el archivo, salvo `EMAIL_DEV_REAL_SMTP=true`. En ese caso solo se envía a direcciones de `EMAIL_DEV_ALLOWLIST`.

### 5.4 Límites

- Como mucho `dailyLimit` (800) en 24 h móviles; lo que sobra espera y los correos del cliente van primero.
- Como mucho 1 correo por segundo.
- Los **tests** cuentan para el límite y tienen además su propio tope (§6).

### 5.5 Programados (cada hora)

| Correo | Condición | `dedupeKey` |
|---|---|---|
| #3 | AWAITING_DEPOSIT, `depositDueAt` en ≤ 12 h, sin depósito completo | `deposit:<bookingId>:<depositDueAt>` |
| #5 | CONFIRMED, `startsAt` en ≤ 48 h | `prep:<bookingId>:<startsAt>` |
| #20 | DELIVERED, `expiresAt` en ≤ 48 h, fotos sin borrar | `expiry:<galleryId>:<expiresAt>` |
| #22 | 7:00 AM Phoenix, con algo que reportar | `digest:<fecha>` |

Si la fecha ya pasó, no se encola.

---

## 6. Envío de prueba

- En el editor, cada plantilla tiene **"Send test"**: un campo **To** (por defecto, el último email usado por ese admin), el idioma y un selector de **datos**:
  - **Sample data** (por defecto): datos inventados de `fixtures/` ("Emily Tran", `PBA-0000`, PIN `0000`, contraseña temporal `test-1234`). **Nunca** credenciales reales.
  - **A real booking/gallery** (opcional): elegir una reserva o galería real para ver sus datos. En este modo los secretos se **enmascaran** (`••••`) y no se genera ningún PIN ni contraseña nueva.
- Usa el **borrador** (lo que está en el editor sin publicar), así Areli prueba antes de publicar.
- El asunto lleva el prefijo **`[TEST]`**.
- Pasa por el outbox con `isTest = true` (aparece en Sent con la etiqueta TEST) y por el mismo SMTP real. Así la prueba también comprueba que la configuración de Hostinger funciona.
- Se envía **aunque** el interruptor general o el de la plantilla estén apagados: es justo lo que hay que poder probar.
- **Tope:** 20 tests por hora, para que un error no queme el límite diario.
- **"Send all as test"** en la lista de plantillas: manda las 25 en un idioma al email indicado, con 5 s entre cada una. Sirve para revisar todo el catálogo de una vez.
- En **Settings → Email** hay además **"Test connection"** (`transporter.verify()` y login IMAP), que responde en lenguaje claro: "Wrong password", "Port 465 blocked — use 587", "Connected".

---

## 7. Bandeja: Sent e Inbox

### 7.1 Qué muestra

| Pestaña | Origen | Contenido |
|---|---|---|
| **Sent** | `EmailOutbox` | Todo lo que mandó el sistema: estado (Sent, Failed, Skipped o Test), destinatario, asunto, fecha, cliente o reserva enlazados. Acciones: ver, "Send now" (Skipped o Failed), "Resend". |
| **Inbox** | IMAP → `EmailInbound` | Lo que llega al buzón: respuestas de clientes, rebotes y cualquier otro correo. De, asunto, fecha y extracto. Si el remitente coincide con un `Client` (por email), se enlaza a su ficha. Leído o no leído. Adjuntos descargables. |

**Fuera de alcance por ahora:** redactar y responder desde el admin. Areli responde desde su correo de Hostinger, webmail o la app del teléfono. Se puede agregar después.

### 7.2 Sincronización IMAP

- Cada `syncEveryMinutes` (5) el worker se conecta con ImapFlow y descarga los mensajes con UID mayor al último guardado (`uidValidity` + `uid`).
- Guarda el `.eml` en disco (§7.5) y los metadatos en `EmailInbound`. **No** borra nada del servidor de Hostinger al sincronizar.
- Si la carpeta de correo local está **llena**, se pausa la sincronización (los correos siguen en Hostinger, no se pierden) y la bandeja muestra el aviso. **El envío nunca se bloquea** porque la bandeja esté llena: si no cabe la copia `.eml` de un enviado, se guarda solo la fila sin el cuerpo.

### 7.3 Ver un correo recibido (seguridad)

Un correo recibido es **contenido no confiable**: cualquiera puede escribirle al buzón.
- El HTML se sanitiza en el servidor (DOMPurify con jsdom) y se muestra en un `<iframe sandbox>` **sin** `allow-scripts` ni `allow-same-origin`.
- Las **imágenes remotas están bloqueadas por defecto** (pueden ser píxeles de rastreo), con un botón "Show images".
- Los adjuntos se descargan con `Content-Disposition: attachment`, nunca se abren en línea. Se rechazan ejecutables.

### 7.4 Rebotes

Si llega un aviso de no entrega (`multipart/report; report-type=delivery-status`):
1. Se lee el `Original-Message-ID` y se busca el `EmailOutbox` correspondiente.
2. Si es un error permanente (5.x.x), se marca `EmailOutbox.bouncedAt` y `Client.emailBouncedAt`.
3. Se encola el #23 para Areli, y la ficha del cliente muestra "Email bounced — check the address".

### 7.5 Almacenamiento y "Vaciar"

- Carpeta: `MAIL_STORAGE_PATH=/app/mail`, en **su propio sistema de archivos de tamaño fijo** (`/srv/pba/mail.img`, §8). Así la bandeja nunca llena el disco de fotos ni el del servidor.
- Estructura: `sent/<yyyy>/<mm>/<outboxId>.eml` y `inbox/<yyyy>/<mm>/<inboundId>.eml`.
- **Barra de espacio** en la parte de arriba de la bandeja, con los **mismos colores** que la de fotos (verde con más de 60% libre, amarillo de 30% a 60%, rojo con menos de 30%; `docs/almacenamiento-fotos.md` §4.2).
- **Vaciar**, por pestaña:
  - "Empty Inbox" / "Empty Sent", con opción **"older than 30 / 90 / 365 days"** o **"everything"**. Confirmación escribiendo `EMPTY`.
  - Borra los `.eml` del disco y las filas. En Sent, las filas de reservas y galerías siguen en el historial del cliente como `ActivityEvent` ("Email sent: Booking confirmed"), así que **el historial del negocio no se pierde**, solo el cuerpo del correo.
  - **No** se pueden vaciar los PENDING ni SENDING.
  - `deleteOnServerWhenEmptied` (apagado por defecto): si está encendido, vaciar Inbox también borra esos mensajes del buzón de Hostinger por IMAP y libera su cuota. Va con su propio aviso.
- **Limpieza automática** opcional: `inbox.retentionDays` (borra lo más viejo que N días) y `autoEmptyAtPercentUsed` (al 90% usado borra lo más viejo hasta bajar al 70%; primero Sent de tests y luego lo más antiguo). Cada limpieza deja un `ActivityEvent`.

---

## 8. Docker: espacio asignado a cada parte

El tamaño de cada parte se decide **al crear el servidor**, en `deploy/.env` (archivo del despliegue, no el del backend):

```bash
# deploy/.env
PHOTOS_SIZE=48G
MYSQL_SIZE=10G
MAIL_SIZE=2G
```

`deploy/setup-storage.sh` (lo corre Alexis una vez, como root) crea un archivo-disco de tamaño fijo para cada uno, con el mismo procedimiento que `docs/almacenamiento-fotos.md` §2.2, y los monta:

| Archivo-disco | Montado en el host | En el contenedor | Uso |
|---|---|---|---|
| `/srv/pba/photos.img` | `/srv/pba/photos` | `api:/app/storage` | Fotos de galería |
| `/srv/pba/mysql.img` | `/srv/pba/mysql` | `mysql:/var/lib/mysql` | Base de datos |
| `/srv/pba/mail.img` | `/srv/pba/mail` | `api:/app/mail` | Bandeja (.eml de Sent e Inbox) |
| — (carpeta normal) | `/srv/pba/config` | `api:/app/config` | `settings.json` (KB) |

Para ampliar cualquiera más adelante se usa el procedimiento de §2.4 de `docs/almacenamiento-fotos.md`, con su `.img`.

**Reparto en un servidor de 80 GB:**

| Parte | Tamaño |
|---|---|
| Sistema, Docker y logs | 15 GB |
| MySQL | 10 GB |
| Fotos | **48 GB** |
| Correo | **2 GB** |
| Margen | 5 GB |

Con 2 GB caben unos 20 000 correos de ~100 KB. Un correo con adjuntos pesados ocupa más; para eso está la barra.

```yaml
# docker-compose.yml (además de lo de docs/almacenamiento-fotos.md §2.6)
  api:
    environment:
      CONFIG_PATH: /app/config/settings.json
      CONFIG_SECRET_KEY: ${CONFIG_SECRET_KEY}
      MAIL_STORAGE_PATH: /app/mail
    volumes:
      - /srv/pba/photos:/app/storage
      - /srv/pba/mail:/app/mail
      - /srv/pba/config:/app/config
  mailpit:                       # solo en docker-compose.dev.yml
    image: axllent/mailpit
    ports: ["8025:8025", "1025:1025"]
```

El indicador de almacenamiento del sidebar (fotos) se queda como está. El de la bandeja aparece en la pantalla de la bandeja y en Settings → Email. Los avisos a soporte (#24) cubren los dos.

---

## 9. Pantallas del admin (diseño pendiente en el lienzo)

1. **Settings → Email**
   - Interruptor general.
   - Servidor de salida (SMTP): host, puerto, seguridad, usuario y contraseña.
   - Servidor de entrada (IMAP): igual, más la opción "Use the same password".
   - Remitente y Reply-To, y email de avisos para Areli.
   - Límite diario.
   - Botones **Test connection** y **Save**.
2. **Settings → Email templates:** lista de las 25 agrupadas como en la §2, cada una con su interruptor (o su candado), el estado (Published, Draft changes, Default) y la fecha de la última edición. Botón "Send all as test".
3. **Editor de plantilla:** GrapesJS a pantalla completa, con el asunto arriba, las pestañas EN/ES, el panel de variables, la vista de escritorio y de móvil, y los botones **Send test** (campo de email), **Save draft**, **Publish**, **History** y **Restore default**. Funciona en desktop y en tablet; en móvil solo se puede ver y enviar la prueba, no editar.
4. **Mail** (nueva entrada del sidebar): pestañas Inbox y Sent, búsqueda, barra de espacio, botón **Empty…**, y la vista del correo.

---

## 10. Seguridad (resumen)

- Las contraseñas SMTP e IMAP se guardan cifradas en `settings.json`, nunca se devuelven por la API ni van en los logs.
- La contraseña temporal y el PIN se guardan cifrados en el outbox y se borran al enviar. La contraseña temporal es de un solo uso: si se reenvía, se genera otra.
- Los correos recibidos se sanitizan, se muestran en un iframe sin scripts y sin imágenes remotas por defecto.
- Las plantillas pasan por Liquid con escape y luego por un sanitizador.
- "Forgot password" responde igual exista o no la cuenta.
- Todas las rutas de configuración, plantillas, tests y bandeja son **solo ADMIN**, y cada cambio deja un `ActivityEvent`.

---

## 11. Pruebas que debe pasar

1. Arrancar sin `settings.json`: se crea con los valores por defecto y el envío apagado. Reiniciar el contenedor: el archivo y los cambios siguen.
2. Guardar la configuración desde el admin: el archivo cambia; en él la contraseña está cifrada, y `GET` no la devuelve.
3. Un `settings.json` con JSON roto: el backend arranca, no lo sobrescribe y el admin muestra el aviso.
4. Puerto 465 bloqueado (simulado): "Test connection" sugiere 587.
5. Con el interruptor general apagado, confirmar una reserva da SKIPPED. "Send now" lo envía. El reset de contraseña sale igual.
6. Plantilla `booking.prep_reminder` apagada: SKIPPED con su motivo.
7. Publicar `account.password_reset` sin `{{ reset.url }}`: bloqueado y se dice qué falta.
8. "Send test" con el borrador: llega con `[TEST]` y datos de ejemplo, aunque el envío esté apagado. El test número 21 de la hora se rechaza.
9. Un nombre de cliente `<img src=x onerror=alert(1)>`: aparece como texto en el correo.
10. Un correo recibido con `<script>` y una imagen remota: no se ejecuta y la imagen no se carga hasta pulsar "Show images".
11. Un rebote 550 recibido: marca el outbox y el cliente, y avisa a Areli.
12. Llenar el archivo-disco de correo (prueba con 50 MB): la sincronización se pausa, **el envío sigue funcionando** y la barra está en rojo.
13. "Empty Sent · older than 30 days": borra los `.eml` y las filas viejas; el historial (`ActivityEvent`) de la reserva sigue ahí.
14. En desarrollo, todos los correos llegan a Mailpit y ninguno sale a internet.

---

## 12. Pendiente de decidir con el usuario

1. **Dominio** de Areli (¿`areliphotos…`? ¿`photosbyareliii.com`?) y el **plan de Hostinger** (Starter, 1 000 al día, alcanza).
2. Reseñas: Google, Instagram u otro (`reviewUrl`).
3. ¿Recibo por email al registrar el pago del balance (#26)?
4. ¿Resumen diario (#22) o solo el aviso de cada solicitud nueva (#21)?
5. ¿Responder desde el admin (§7.1)? Por ahora fuera de alcance.
