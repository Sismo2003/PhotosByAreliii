# Handoff — construir la base de datos de photosByArelli

Fecha: 2026-09-22 · actualizado 2026-10-02 con la información real del negocio (PDF, logo, contacto). Para el agente que va a diseñar y crear la base de datos (Prisma 7 + MySQL).
Lee todo antes de tocar `schema.prisma`. El handoff general del proyecto está en `../handoff.md`.

**Tu trabajo:** convertir el diseño aprobado (el lienzo de pantallas) en un schema Prisma, las
migraciones y un seed. **No** es tu trabajo hacer endpoints, frontend ni emails.

**Decisiones:** todas resueltas el 2026-10-02 (§7).

---

## 1. Fuentes de verdad

| Qué | Dónde |
|---|---|
| Pantallas (fuente de verdad de los campos) | Lienzo https://claude.ai/artifact/6q8sY1zKxH3zMTBRoyj1dQ, un archivo `project/<Nombre>.dc.html` por pantalla. Se lee con la herramienta `Artifact` (`action: "read"`, `path`). |
| Datos de ejemplo realistas | El `state = {...}` de los scripts de `AdminBookings.dc.html`, `AdminClients.dc.html`, `GalleryEditor.dc.html` y `ClientGallery.dc.html` |
| Reglas del negocio | `../handoff.md` §3 y la memoria del proyecto: confirmación manual, pagos fuera del sitio |
| Convenciones | Skills `db-migrations`, `backend`, `auth-gallery`, `site-config` en `.claude/skills/` |
| Schema (validado, migrado) | `database/prisma/schema.prisma` (antes `schema.draft.prisma`; el Anexo A es una copia de esa versión) |
| Diagrama | `database/schema.dbml` — el mismo borrador en DBML; se pega en https://dbdiagram.io/d. Se edita **a mano**: si cambias `prisma/schema.prisma`, actualízalo y valídalo con `@dbml/core` (`new Parser().parse(texto, "dbmlv2")`). |

Pantallas revisadas para este documento, todas las del lienzo:

- Landing y servicios: `Main`, `LandingMobile`, `Services`, `ServiceGraduation`, `ServiceQuince`, `ServiceMaternity`, `ServiceFamily`.
- Flujo `/book`: `Booking`, `BookingDate`, `BookingLocation`, `BookingDetails`, `BookingReview`, `BookingConfirmed`.
- Admin: `AdminDashboard`, `AdminBookings*` (12 variantes con la misma lógica), `AdminClients`.
- Galería admin: `Gallery*` (Create, Upload, Editor, Cover, Settings, Deliver, Delivered, Activity, más tablet y móvil).
- Acceso y galería del cliente: `Login*`, `ClientGallery*`.

Las variantes tablet/móvil de Bookings y Gallery tienen **exactamente los mismos campos** que las de desktop; se verificó comparando sus formularios.

---

## 2. Estado actual y trampas (léelo primero)

1. **El `schema.prisma` actual no pasa la validación de Prisma 7.10.** `npx prisma validate` falla con el error P1012: *"The datasource property `url` is no longer supported in schema files"*. En Prisma 7:
   - la URL va en `database/prisma.config.ts`;
   - el generador es `provider = "prisma-client"` con `output` obligatorio;
   - `PrismaClient` necesita un driver adapter para MySQL.

   Confirma los nombres exactos de los paquetes en la guía oficial de Prisma 7 antes de instalarlos. El borrador del Anexo A ya usa el formato nuevo.
2. `Backend/config/db.js` hace `new PrismaClient()` sin adapter, así que también hay que actualizarlo. Hoy importa de `@prisma/client`; con `output` personalizado debe importar de la ruta generada.
3. `Backend/models/*.js` y `Backend/controllers/*.js` ya usan `User`, `Gallery` y `Photo`. Por ejemplo, `Gallery.clientId → User.id` y `Photo.filename`.
   - Si cambias esas relaciones (la §4 propone que la galería apunte a `Client`, no a `User`), **actualiza esos modelos** o déjalos anotados para el agente de backend.
   - Todavía no hay `server.js` ni rutas montadas.
4. **No existe `database/prisma/migrations/`** ni una base creada. Puedes rehacer el schema desde cero sin migraciones de datos.
5. El skill `db-migrations` pedía confirmar si `Gallery` es 1:1 o muchas por cliente. **El diseño ya lo decide: muchas por cliente.** El cliente ve "My galleries", y Mía Castillo tiene dos sesiones en años distintos.
6. El skill `site-config` define `services.json` con servicios y precios **distintos** a los del diseño. Ver la decisión abierta D1.

---

## 3. Modelo conceptual

```
Client ──1:0..1── User (login; ADMIN users have no Client)
  │
  ├──< Booking >── Service / Package, and Extras via BookingExtra
  │       ├──< Payment            (deposit, balance, refund; entered by hand)
  │       └──0..1 Gallery
  ├──< Gallery ──< GallerySet ──< Photo ──< Favorite >── Client
  ├──< RebookReminder
  └──< ActivityEvent               (also points to Booking / Gallery)
StudioSettings (1 row) · AvailabilitySlot · BlockedDate · Service · Package · Extra
```

**Decisión clave: `Client` separado de `User`.** Un cliente existe **antes** de tener login:

- leads que solo mandaron una solicitud;
- clientes añadidos a mano por Instagram;
- estados de login "No login yet", "Invite sent" y "Active" en la pantalla Clients.

`User` es solo la credencial. Areli es un `User` con `role = ADMIN` y sin `Client`.

---

## 4. Entidades y campos (verificados contra las pantallas)

En cada tabla, la columna **Origen** dice en qué pantalla aparece el campo. Convenciones:

- **Dinero:** en centavos (`Int`). Nunca `Float`.
- **Fechas y horas:** en UTC. El estudio está en **America/Phoenix**, que no tiene horario de verano.
- **Solo fecha:** `@db.Date`.
- **Placeholders:** lo que el diseño muestra `[entre corchetes]` es un placeholder. Va a `StudioSettings` o al catálogo, nunca fijo en el código.

### 4.1 Client (perfil / CRM)

| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| displayName | String | Clients, Bookings | "The Ortega family", "Marco & Lucía": no siempre es nombre + apellido |
| firstName, lastName | String? | `/book` paso 4 (First name / Last name) | Para saludos: "Request sent, Daniela.", "Hi Emily,", "Welcome, Emily" |
| email | String **unique** | `/book` paso 4, Clients | **También es su login** ("This email becomes your login"). Si cambia, cambia el login (texto en *Edit details*). |
| phone | String? | `/book` paso 4, Clients | Tal como se escribió: "(480) 555-0100" |
| phoneE164 | String? **unique** | — | Normalizado a E.164 ("+14805550100"), con `libphonenumber-js` y país por defecto US. **Segundo identificador**, después del email (decisión del usuario, 2026-10-02). Si dos personas comparten teléfono, quedan como un solo cliente (p. ej. "The Ortega family"). |
| instagram | String? | Clients (Add / Edit) | "@handle" |
| heardFrom | enum? | `/book` ("How did you find me?"), Clients ("Found me via") | Opciones de `/book`: Instagram, A friend, Google, Other. Clients añade TikTok y Returning client. Hay que unir las dos listas (§7 D10). |
| privateNotes | Text? | Clients → "Private notes" | Solo Areli |
| locale | String | Nav ES/EN | Opcional; para el idioma futuro de los emails |
| createdAt | DateTime | Clients: "Client since Aug 2025" | Fecha del primer contacto |
| deletedAt | DateTime? | Clients → Delete client | **Soft delete** (2026-10-04): oculta al cliente en Clients y en el buscador de New booking y bloquea su login. No toca reservas, pagos ni galerías; email y teléfono siguen ocupados. |

**Calculado en consulta, no guardar:**

- sesiones realizadas;
- "Returning" (dos o más reservas activas o pasadas);
- total recibido;
- balance pendiente;
- segmento (Upcoming, Follow-up, Past clients, Leads);
- estado del login;
- última y próxima sesión.

La lógica exacta está en la §5.3.

### 4.2 User (login)

| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| email | String unique | Login | Igual a `Client.email` para los clientes. Mantenerlos sincronizados al editar. |
| passwordHash | String | Login | argon2 (ya está en el backend) |
| role | ADMIN \| CLIENT | Login ("One login for clients and for Areli", redirige por rol) | |
| clientId | Int? unique | — | Nulo para ADMIN |
| mustChangePassword | Boolean | LoginFirstTime | Primer ingreso con contraseña temporal. Regla: mínimo 8 caracteres. |
| invitedAt | DateTime? | Clients: "Invite sent Sep 8" | |
| lastLoginAt | DateTime? | Clients: "Last signed in Sep 21" | |

Estado del login mostrado en Clients:

- **No login yet:** no hay `User`.
- **Invite sent:** existe `User` con `mustChangePassword = true` y `lastLoginAt` nulo.
- **Active:** ya inició sesión.

**PasswordResetToken:** `tokenHash`, `expiresAt` (1 hora; texto: "It works for 1 hour"), `usedAt`. El texto de LoginMobileForgot no revela si la cuenta existe.

### 4.3 Catálogo: Service, Package, Extra

> **Actualización 2026-10-05 (Services solo operativo).** El módulo Services es el catálogo de lo que Areli ofrece y alimenta
> New booking y `/book`; ya **no** tiene nada que ver con la landing. Se quitaron de `Service` `cardLine`, `intro`,
> `includesLine`, `ctaWord` y `fromPackageId`, y se agregó `Extra.minutes` (minutos por unidad: "every 30 mins added is +$50").
> Las pestañas Page content / Photos / Preview del diseño se eliminan. Contrato: `docs/api-services.md`.

Pantalla admin: `AdminServices.dc.html` (pestañas Details, Packages, Page content, Photos, Preview y la lista "Add-ons"). Se añadió al lienzo después de la primera versión de este documento; revisada el 2026-10-02.

| Entidad | Campos | Origen |
|---|---|---|
| Service | slug, name, status (LIVE, HIDDEN o DRAFT), cardLine, intro, includesLine, ctaWord ("Ready for your ___ photos?"), fromPackageId (el precio "desde"; normalmente el paquete más reservado, no el más barato), position | AdminServices → Details y orden de la lista |
| Package | service, name, price, durationMinutes (de 30 min a "Full day" = 480), photoCount (nulo), outfits, maxPeople, sessionCount (1 o 2), customDescription (reemplaza la línea automática), isFeatured ("Most booked"), hidden, position | AdminServices → Packages |
| Extra + ExtraService | name, price, active; en qué servicios aparece (tabla puente) | AdminServices → Add-ons; `/book` paso 1: Extra outfit change **+$15** (todos), Extra 30 minutes **+$50** (solo Birthdays & parties) |

- **Borrado:** un servicio o paquete con reservas no se puede borrar, solo ocultar (`onDelete: Restrict`). Así lo dice la pantalla: "N bookings use this service, so it can be hidden but not deleted".
- "N booked in 2026" y "used by N bookings" se calculan.
- **Fuera de la base de datos (decisión del usuario, 2026-10-02):**
  - los textos de la pestaña Page content ("What's included", los 3 consejos de "Before your session" y las FAQ);
  - todas las fotos del sitio: foto principal, las 6 de "Recent sessions" y el portafolio de la landing.

  Todo eso va fijo en el código del frontend. Las pestañas **Page content** y **Photos** de AdminServices no tienen backend; hay que quitarlas o marcarlas como "solo código" en el diseño.
- El servicio que en el lienzo se llama `ServiceQuince.dc.html` ahora es **Birthdays & parties**, con slug `birthdays-parties`. Quinceañera se quitó.

**Catálogo real** (fuente: `Photos By Areliii LLC/Photos By Areliii LLC.pdf`, 28 sep 2026; ya aplicado en el lienzo el 2026-10-02). Son *precios de inicio*:

| Servicio en el sitio | Paquetes | Notas del PDF |
|---|---|---|
| Graduation | Graduation session $160 | — |
| Solos | Solo session $145 | Página nueva `ServiceSolos.dc.html` |
| Family & couples | Couples $160 · Family $220 | Couples y Family van juntos (decisión del usuario) |
| Maternity | Maternity session $170 | La captura vieja decía $160; manda el PDF |
| Birthdays & parties | Birthday $180 · Party $185 | Party: 90 min, fotos con invitados y anfitriones, +$50 por cada 30 min extra, el precio puede cambiar según el tamaño de la fiesta |
| Branding | Branding session $180 | Página nueva `ServiceBranding.dc.html` |

Reglas generales del PDF: el precio puede cambiar si el lugar cobra entrada o por servicios añadidos; +$15 por cada cambio de outfit; la mayoría de sesiones duran 1–2 h; se entregan **todas** las fotos editadas. No hay paquetes con número fijo de fotos: no inventar `photoCount`.


"What's included", "Before your session" y las FAQ quedan estáticos en el frontend (decisión del usuario, ver arriba).

### 4.4 Booking (reserva)

**Número y origen**

| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| code | String unique | "Request no. PBA-0142", "Booking PBA-0151", galería "Booking PBA-0139" | Secuencial y legible. Generarlo a partir del id con `PBA-` + 4 dígitos, o con un contador. |
| clientId | FK | — | Ver "Cliente que vuelve" abajo. |
| contactFirstName, contactLastName, contactEmail, contactPhone | String? | `/book` paso 4 | Lo que se escribió en esta solicitud. **El formulario público nunca sobrescribe `Client`.** |
| clientMatchedBy, matchReviewedAt | enum + DateTime? | — | Cómo se encontró al cliente y cuándo Areli lo revisó |
| source | WEBSITE \| MANUAL | Bookings "New booking" (manual); historial "Added manually by Areli" | La reserva manual nace ya aceptada, en AWAITING_DEPOSIT. |
| status | enum | Ver §5.1 | |

**Cliente que vuelve (decisión del usuario, 2026-10-02)**

Al recibir una solicitud de `/book`, el servidor busca al cliente por **email** y por **teléfono normalizado**:

| Email coincide con | Teléfono coincide con | Resultado | `clientMatchedBy` | ¿Areli revisa? |
|---|---|---|---|---|
| — | — | `Client` nuevo | NEW | No |
| Cliente A | — o A | Se une a A | EMAIL o BOTH | No |
| — | Cliente A | Se une a A (usó otro email) | PHONE | **Sí** |
| Cliente A | Cliente B | Se une a A (gana el email, porque es el login) | CONFLICT | **Sí** |

- Las coincidencias PHONE y CONFLICT muestran un aviso en Bookings ("Matched by phone — check it's the same person"). "Looks right" llena `matchReviewedAt`; "Not the same person" mueve la reserva a un `Client` nuevo.
- Si los datos de contacto de la reserva son distintos de la ficha (otro email, teléfono o nombre), Bookings muestra "Details changed" con "Update client" o "Keep". Nunca se actualiza solo: `/book` no pide login y cualquiera podría escribir el email o el teléfono de otra persona.
- El cliente que vuelve paga **un depósito nuevo**: los pagos van por reserva. El depósito solo pasa de una fecha a otra en una reprogramación.
- Su `User` y su contraseña no cambian; la nueva galería aparece en "My galleries".
- Al crear o editar un cliente a mano en Clients, un `phoneE164` repetido da error "This phone belongs to <cliente>", con la opción de abrir esa ficha.

**Qué se reservó**

| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| serviceId, packageId | FK | `/book` paso 1, Bookings ("Graduation — Classic") | |
| serviceNameSnapshot, packageNameSnapshot, packagePriceCents, durationMinutes | copia | — | **Congelar** el precio y el nombre al reservar; el catálogo puede cambiar después. |
| extras | BookingExtra (nombre y precio **de una unidad** congelados + `quantity`: varios cambios de ropa = una fila con `quantity` 3; ver `docs/formulario-publico-booking.md`) | `/book` paso 1, Bookings "Extras" | |

**Cuándo y dónde**

| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| startsAt | DateTime | `/book` paso 2 (día + hora), Reschedule | Horas del diseño: 8:00 AM, 10:00 AM, 4:30 PM, 5:15 PM, 5:30 PM, 6:00 PM, etc. |
| locationKind, locationName, locationAddress | enum + texto | `/book` paso 3: Lost Dutchman, Campus, Studio o "Somewhere else" con "Place or address" | Nuevo booking manual: campo libre "Studio, park, campus…" |

**Dinero**

| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| travelFeeCents, adjustmentCents | Int | `/book` paso 3: "farther adds [$1 per mile]" | Cargo de traslado y ajustes manuales |
| totalCents | Int | "Total [$205]" | paquete + extras + traslado + ajuste. Guardarlo; no depender del catálogo. |
| depositCents | Int | "50% deposit after I confirm" | **50% del total** (`StudioSettings.depositPercent`). Puede tener centavos ($87.50). |

**Datos del cliente para esta sesión**

| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| partySize | enum | `/book` paso 4 "How many people?": Just me, 2, 3–5, 6–8 | En Bookings se muestra como "People" |
| schoolAndColors | String? | `/book` paso 4, Bookings "School & colors" | Solo tiene sentido para graduaciones |
| clientNotes | Text? | `/book` "Anything I should know?", Bookings "Their notes" | |
| privateNotes | Text? | Bookings → "Private notes" | Solo Areli, separado de las notas del cliente |
| inspo | Text? | `/book` paso 4 "Inspo · links or ideas" | Del PDF ("Inspo") |
| photosNeededBy | Date? | `/book` paso 4 "When do you need your photos?" | Del PDF ("When they would like photos back") |
| sharePermission, doNotPostNotes | enum + Text? | `/book` paso 4 "Can I share your photos?" (Yes / Yes, but not everything / No) y "Anything you don’t want posted?" | Del PDF (permiso para redes y qué no publicar, p. ej. caras de niños) |
| minorConsentAt | DateTime? | `/book` paso 4, casilla de padre/tutor | Del PDF: menores necesitan consentimiento |
| policyAcceptedAt | DateTime? | `/book` paso 5, casilla de la política | Si la política cambia, guardar también su versión (ver `StudioSettings.bookingPolicyVersion`). |

**Aceptación, cancelación y vencimiento**

| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| confirmedAt, depositDueAt | DateTime? | Confirm: `depositDueAt` = ahora + 48 h ("due within [48 hours]") | Bookings marca "Deposit overdue" si pasa `depositDueAt` y no se ha pagado. |
| declinedAt | DateTime? | Bookings "Decline" | Ver D11 |
| cancelledAt, cancelReason, depositRefunded | | Bookings: formulario Cancel | Motivos: Client asked to cancel, Weather, Areli unavailable, No deposit received, **No-show (más de 30 min tarde)**. El depósito **no es reembolsable** (PDF); "Refund anyway" queda como excepción manual. Depósito: Keep o Refund. |
| expiredAt | DateTime? | "Mark as expired" | Libera la fecha. "Reopen booking" vuelve a AWAITING_DEPOSIT con un nuevo `depositDueAt`. |
| rescheduleCount | Int | Política del PDF: se puede reprogramar **una vez** y el depósito pasa a la nueva fecha; si se cancela la reprogramada, hay que reservar de nuevo | La fecha anterior va al evento, no a una columna. |

**Seguimiento después de la sesión**

| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| thanksSentAt | DateTime? | Follow-up "Thank-you" | |
| reviewStatus, reviewRequestedAt, reviewReceivedAt | | Follow-up "Review": Not asked, Asked Sep 21, Received | "Remind" reinicia `reviewRequestedAt` y registra un evento. |
| archivedAt | DateTime? | "Archive — all done" y "Move back to follow-up" | Con valor, la reserva está en Done; nulo, en Follow-up. |

**Lo que se calcula y no se guarda:**

- pagado y balance (desde `Payment`);
- "Deposit overdue";
- "Date overlap": otra reserva activa el mismo día;
- pestaña y etiqueta de estado;
- estado de la galería;
- "Next step" de Follow-up.

### 4.5 Payment (registro manual; no hay pasarela)

| Campo | Tipo | Origen |
|---|---|---|
| bookingId | FK | |
| kind | DEPOSIT \| BALANCE \| REFUND | "Record deposit", "Mark as paid", cancelación con "Refund deposit" |
| method | ZELLE \| CASH_APP \| CASH | Botones "Paid with" |
| amountCents | Int (positivo) | "Amount received ($)" |
| receivedAt | DateTime | Historial "Sep 11 · $50 received · Zelle" |
| note, recordedById | opcionales | Auditoría |

Reglas:

- pagado = DEPOSIT + BALANCE − REFUND.
- Al registrar un pago en AWAITING_DEPOSIT, si pagado ≥ depósito, la reserva pasa a CONFIRMED.
- El pago no puede superar el total (el prototipo lo limita con `Math.min`).
- En una cancelación, "Keep deposit" deja el pago como está; "Refund" crea un REFUND.

### 4.6 RebookReminder

| Campo | Origen | Notas |
|---|---|---|
| clientId, bookingId? | Bookings (por reserva) y Clients (por cliente) | Ver D7 |
| kind + label | Opciones: "In 6 months · family update", "In 1 year · anniversary or birthday", "Next spring · graduation season", "When baby arrives · newborn session" | Añadir CUSTOM por si acaso |
| dueOn | Clients: "around Nov 20, 2026" | Métrica "Reach out soon" (≤ 60 días) |
| doneAt | — | Para cerrarlo sin borrarlo |

### 4.7 Gallery

**Identidad y estado**

| Campo | Origen | Notas |
|---|---|---|
| slug unique | "Copy gallery link: photosbyareli.com/g/emily-tran" | Único. Si se repite, añadir un sufijo. |
| title | GalleryCreate "Gallery name" ("Emily Tran — Graduation") | |
| clientId, bookingId? (unique) | "Create from booking" | Una galería por reserva. Ver D6 para el paquete de dos sesiones. |
| status DRAFT \| DELIVERED | "Draft · not shared", "Delivered · Sep 22" | "Editing" en Bookings = DRAFT. "Expired" = `expiresAt` < hoy (calculado). |
| deliveredAt, expiresAt | Settings: "Gallery available until", "Extend 30 days", "Reopen 30 days" | Por defecto, 90 días desde la entrega |
| expiryReminderSentAt, photosDeletedAt | "Clients get a reminder 48 hours before" (D9) | Al vencer se borran las fotos del disco. Correos: `docs/correos.md`. |

**Portada**

| Campo | Origen | Notas |
|---|---|---|
| coverPhotoId, coverLayout | Pestaña Cover: layouts Full, Split, Minimal | |

**Descargas y privacidad**

| Campo | Origen | Notas |
|---|---|---|
| downloadMode | "High-res + web", "Web only", "Off" | |
| pinRequired, downloadPinEnc | "Require download PIN". El PIN de 4 dígitos se genera al entregar y se conserva al reenviar, salvo que se active "Create a new download PIN". | **Areli lo vuelve a ver** ("PIN: 4821" en Settings, "You can always find the PIN in Settings"), así que el hash no sirve. Ver D3. |
| privacy, accessPasswordEnc | "Who can view": Client login, Password, Anyone with link. Campo "Gallery password". | La contraseña se muestra y se edita, así que también debe ser reversible (D3). |

**Experiencia del cliente**

| Campo | Origen | Notas |
|---|---|---|
| favoritesEnabled, favoritesLimit | "Favorites limit": Up to 10, 20 o 40, o No limit | `null` = sin límite. Se aplica al marcar favorito. |
| watermark, socialSharing | Interruptores en Settings | |

**Entrega**

| Campo | Origen | Notas |
|---|---|---|
| deliverySubject, deliveryMessage, deliveredToEmail | Modal "Deliver gallery": To, Subject, Message | Guarda el último envío |

**Calculado:** número de fotos y sets, fotos ocultas, "Views", "Downloads", "Favorites" y "Last visit" (desde `ActivityEvent` y `Favorite`).

**GallerySet:** name (único dentro de la galería) y position.

- Sets por defecto al crear: Highlights, Portraits, With family, Details, Getting ready.
- "All photos" es una vista, no un set.

### 4.8 Photo

| Campo | Origen | Notas |
|---|---|---|
| originalFilename | "ET_0401.jpg" | Mostrado al cliente y a Areli. **No** se usa para la ruta en disco (regla PII de `auth-gallery`). |
| mimeType, sizeBytes, width, height | Subida: "JPG, PNG or HEIC up to 50 MB each"; tamaño estimado del zip | HEIC hay que convertirlo para la versión web |
| originalPath, webPath, thumbnailPath | "Originals are kept in full resolution; web-size copies are made for you"; descarga "High resolution" o "Web size" | Tres archivos por foto. Nunca se sirven de forma estática. |
| setId | "Move to set" | |
| position | Orden "Upload order" o "File name" | |
| hidden | "Hide / show" ("hidden from client") | |

El `bw` del prototipo es solo un filtro de demostración; **no** es un campo.

**Favorite:** clave `(clientId, photoId)` con `createdAt`. Es **el único favorito** de la foto, compartido: lo marca el cliente en `/client` o Areli en el admin (el `clientId` es el de la galería). `Photo.keep` quedó **obsoleta** (sin lectura ni escritura desde 2026-10-09; la columna sigue en la base, sin migrar). Ocultar una foto borra su favorito.

### 4.9 ActivityEvent (historial unificado)

Alimenta:

- el "History" de Bookings y de Clients;
- la pestaña "Activity" de la galería;
- los contadores Views, Downloads y Last visit;
- el orden "Recent activity" de Clients.

Campos: `type`, `actorType` (ADMIN, CLIENT o SYSTEM), `actorId`, `clientId?`, `bookingId?`, `galleryId?`, `message` (la línea que se muestra) y `metadata` (JSON).

Tipos que el diseño necesita, por dominio:

- **Reservas:**
  - `booking.requested`, `booking.created_manual`, `booking.confirmed`, `booking.declined`
  - `booking.rescheduled` (metadata: fecha anterior y nueva), `booking.cancelled` (metadata: motivo y qué pasó con el depósito)
  - `booking.expired`, `booking.reopened`, `booking.archived`, `booking.unarchived`
  - `booking.prep_reminder_sent`
- **Pagos:** `payment.recorded`, `payment.instructions_resent`, `payment.reminder_sent`.
- **Seguimiento:** `followup.thanks_sent`, `followup.review_requested`, `followup.review_reminder_sent`, `followup.review_received`.
- **Recordatorios:** `rebook.set`, `rebook.removed`.
- **Clientes y cuentas:**
  - `client.created`, `client.updated`, `client.email_changed`
  - `account.invited`, `account.invite_resent`, `account.password_reset_sent`, `account.password_set`, `account.login`
- **Galerías:**
  - `gallery.created`, `gallery.photos_uploaded`, `gallery.delivered`, `gallery.resent`
  - `gallery.extended`, `gallery.link_resent`, `gallery.expiry_reminder_sent`, `gallery.expired`
  - `gallery.viewed`: una por visita; alimenta "Views" y "Last visit". La primera de ese cliente en esa galería lleva `metadata.first = true` y dice "… opened the gallery for the first time".
  - `gallery.favorited` / `gallery.unfavorited`: el cliente dio o quitó el like ("Alexis liked IMG_01.jpg"). `metadata.photoId`. Las marcas de Areli desde el admin no generan evento.
  - `gallery.downloaded`: **un evento por acción de descarga**, no por archivo ("Alexis downloaded 12 photos", `metadata { count, quality: web|original, zip }`). Diseño original: metadata con qué se bajó (all, fav o one), el tamaño (high o web), el número de fotos y los bytes. Ejemplo del diseño: "downloaded all photos (high-res, 1.1 GB)".
  - `gallery.favorited`: se pueden agrupar ("favorited 7 photos").

`type` es un `String` en el borrador para no migrar cada vez que se añada uno. Documenta la lista en el código.

### 4.10 StudioSettings (una sola fila)

Todo lo que el diseño muestra entre corchetes y que usa la lógica:

- **Reservas:** depósito **50%** del total, no reembolsable; plazo del depósito [48 h] (no está en el PDF, confirmar); aviso de cancelación 48 h; tolerancia de retraso 30 min; respuesta en [24 h].
- **Galerías:** entrega en 2 semanas (14 días); duración 90 días; aviso 7 días antes; extensión de 30 días.
- **Traslado:** 25 millas incluidas; $1 por milla adicional.
- **Pagos:** usuarios de Zelle y Cash App (se muestran en el email de confirmación).
- **Valores por defecto de una galería nueva** (GalleryCreate: "Your default settings will be used"): descargas high-res, PIN activado, login del cliente, favoritos con límite de 20, sin marca de agua, sin compartir.
- **Política:** el texto de la política de reserva y su versión.

La pantalla admin **Settings no está diseñada**; que la tabla exista igual y se llene con el seed. Los datos de contacto y la marca siguen en `site.js` (skill `site-config`), no aquí.

### 4.11 Disponibilidad para `/book` paso 2

El diseño muestra:

- días tachados (no disponibles);
- horarios por día con etiqueta ("soft morning", "golden hour");
- un horario tachado (ya reservado);
- la hora del atardecer ("Sunset is at [6:12 PM]").

Propuesta mínima:

- `AvailabilitySlot`: día de la semana, hora y etiqueta.
- `BlockedDate`: días libres.
- Un horario está ocupado si hay una reserva que lo bloquea (ver D5).
- El atardecer **se calcula**, no se guarda.

No hay pantalla admin para editar la disponibilidad; confírmalo con el usuario (D5).

---

## 5. Reglas y consultas que el schema debe soportar

### 5.1 Estados de Booking

Transiciones:

- **Desde la web:** REQUEST → Confirm → AWAITING_DEPOSIT → pago ≥ depósito → CONFIRMED.
- **Manual:** la reserva nace en AWAITING_DEPOSIT.
- **Rechazo:** REQUEST → Decline → DECLINED. El prototipo usa CANCELLED; ver D11.
- **Cancelación:** AWAITING_DEPOSIT o CONFIRMED → Cancel → CANCELLED.
- **Vencimiento:** AWAITING_DEPOSIT → Mark as expired → EXPIRED → Reopen → AWAITING_DEPOSIT.

Pestañas de Bookings (se calculan; `hoy` es la fecha en America/Phoenix):

- **Requests:** status = REQUEST.
- **Upcoming:** AWAITING_DEPOSIT o CONFIRMED, con fecha ≥ hoy.
- **Follow-up:** AWAITING_DEPOSIT o CONFIRMED, con fecha < hoy y `archivedAt` nulo.
- **Done:** igual que Follow-up pero con `archivedAt`.
- **Expired / Cancelled:** por su estado.

"Next step" de Follow-up, en este orden:

1. cobrar el balance;
2. crear la galería;
3. entregarla ("overdue" si pasaron los días de entrega);
4. enviar el agradecimiento;
5. pedir reseña;
6. esperar la reseña;
7. poner un recordatorio para volver a reservar;
8. archivar.

**Archivar** requiere balance 0 y la galería entregada.

### 5.2 Métricas y listas (índices necesarios)

| Pantalla | Métrica o consulta |
|---|---|
| Dashboard | Sessions this week (reservas activas con fecha en los próximos 7 días) · Galleries to deliver · Deposits pending ($) · Upcoming sessions · últimas galerías |
| Bookings | Requests to confirm · Sessions this week · Payments pending: suma de (total − pagado) si la sesión ya pasó, o (depósito − pagado) si es futura · Follow-ups due · búsqueda por nombre o email · filtro por servicio · calendario del mes · choque de fechas |
| Clients | Total · Returning · Received in [año]: suma de pagos del año, por `receivedAt` · Reach out soon: recordatorios en ≤ 60 días sin sesión próxima · búsqueda por nombre, email o teléfono · orden por actividad reciente, nombre o total recibido |
| Galería admin | Views, Downloads, Favorites, Last visit, eventos |
| Portal del cliente | "My galleries": solo sus galerías DELIVERED y no vencidas · fotos no ocultas, por set · sus favoritos y el límite |

Índices del borrador:

- `bookings(status, startsAt)`, `bookings(clientId)`
- `payments(receivedAt)`
- `activity_events(clientId|bookingId|galleryId, createdAt)`
- `rebook_reminders(dueOn)`
- `galleries(status, expiresAt)`
- `photos(galleryId, setId, position)`

### 5.3 Segmento del cliente (Clients)

- **Upcoming:** tiene una reserva activa futura.
- **Follow-up:** si no, tiene una reserva activa pasada sin archivar.
- **Past clients:** si no, tiene alguna sesión pasada.
- **Leads:** el resto (solo solicitudes, canceladas o vencidas).

---

## 6. Seguridad (no negociable)

- Contraseñas de usuario y tokens de reset: **solo hash** (argon2 y sha256 del token, respectivamente).
- La contraseña temporal se genera al entregar la galería o al invitar. Se muestra **una vez** en "Gallery sent" y en el email, y después solo se guarda su hash.
- El PIN de descarga y la contraseña de galería **no pueden ser hash**, porque Areli los vuelve a ver (D3). Propuesta: cifrado AES-256-GCM con la clave en `.env`, en columnas `*Enc`. Nunca en logs ni en respuestas a clientes.
- Rutas de fotos: ids y claves opacas; nunca el nombre del cliente en la ruta. Originales fuera de cualquier carpeta pública (skill `auth-gallery`).
- Cada consulta del cliente se filtra por su `clientId` en el servidor.

---

## 7. Decisiones (todas resueltas el 2026-10-02)

| # | Tema | Decisión |
|---|---|---|
| D1 | Catálogo y precios | Tablas `Service`, `Package`, `Extra` y `ExtraService`, con seed desde la tabla de la §4.3. Se editan en AdminServices (Details, Packages, Add-ons). También hay que actualizar `services.json` del skill `site-config`. |
| D2 | ¿Cuándo se crea el login del cliente? | El schema soporta los tres casos (`User` opcional). El comportamiento por defecto y el texto del Login se deciden cuando se haga la autenticación. |
| D3 | PIN y contraseña de galería | **Cifrado reversible** AES-256-GCM, con la clave en `.env`, en columnas `*Enc`. Areli los vuelve a ver en Settings. |
| D4 | Favoritos sin login | **Solo con login** (`privacy = CLIENT_LOGIN`). Con Password o Anyone with link se ocultan. |
| D5 | Disponibilidad | **REQUEST, AWAITING_DEPOSIT y CONFIRMED bloquean** el horario. DECLINED, CANCELLED y EXPIRED lo liberan. Horarios y días libres con seed hasta que exista la pantalla. |
| D6 | Paquete de dos sesiones | Solo `Package.sessionCount`; es **una** reserva, sin `parentBookingId`. El catálogo real no tiene paquetes de dos sesiones. |
| D7 | Recordatorio de nueva reserva | `RebookReminder` con `clientId` obligatorio y `bookingId` opcional. |
| D8 | Portafolio y fotos del sitio | **Fijos en el frontend.** No hay tabla de fotos del sitio. |
| D9 | Retención de fotos | **Las fotos se borran del disco cuando vence la galería** (`expiresAt`), y se avisa al cliente por email **48 h antes** (decisión del usuario, 2026-10-02). La fila de la galería se queda, con `photosDeletedAt`. Cambios de diseño: quitar "Reopen 30 days" (ya no hay fotos que reabrir; "Extend 30 days" **antes** de vencer sigue); el texto "Clients get a reminder 7 days before" pasa a "48 hours before". |
| D10 | "Cómo me conoció" | Un solo enum: INSTAGRAM, FRIEND, GOOGLE, TIKTOK, RETURNING_CLIENT, OTHER. |
| D11 | Decline | Estado propio `DECLINED`. |
| D12 | Varias personas en una reserva | Una reserva = un cliente de contacto. |
| D13 | Contenido de las páginas de servicio | **Fijo en el código** (What's included, consejos y FAQ). Sin columnas `Json`. |
| D14 | Cliente que vuelve con otro email | **El teléfono también identifica** (`Client.phoneE164` único). Reglas en la §4.4 "Cliente que vuelve". |
| D15 | Dónde se guardan las fotos de galería | **Disco del servidor (VPS)**, no R2 (decisión del usuario, 2026-10-02: no quiere pagar almacenamiento aparte). Carpeta privada `Backend/storage/galleries/<galleryId>/<photoId>/{original,web,thumb}.jpg`, nunca servida como estática. Borrar una foto o galería borra la fila **y** la carpeta. Respaldar solo la base de datos, no la carpeta de fotos, para que el borrado sea real. Todo acceso a disco en un solo módulo `storage.js`, para poder pasar a R2 después. **Especificación completa (límite de disco en Docker, barra del admin, bloqueo con 500 MB): `docs/almacenamiento-fotos.md`.** Las fotos de la landing van en `Frontend/src/assets/`. El borrado automático ocurre al vencer la galería (D9). |
| D16 | Correos | **SMTP de Hostinger por el puerto 587 STARTTLS** (Hetzner bloquea el 465), Nodemailer. Plantillas editables en el admin (GrapesJS + MJML + Liquid) con prueba a un email, interruptores general y por plantilla, configuración en `settings.json` persistente (secretos cifrados), bandeja Sent/Inbox por IMAP con vaciado y un sistema de archivos propio de 2 GB. Todo en **`docs/correos.md`** (v2). Tablas `EmailOutbox`, `EmailTemplate`, `EmailTemplateVersion` y `EmailInbound` ya en el borrador. |

## 8. Plan de trabajo sugerido

1. Lee el skill `db-migrations` y este documento. Las decisiones de la §7 ya están resueltas.
2. Arregla la base de Prisma 7:
   - crea `database/prisma.config.ts` con la URL de `DATABASE_URL`;
   - generador `prisma-client` con `output`;
   - driver adapter de MySQL;
   - actualiza `Backend/config/db.js`.
3. Reemplaza `database/prisma/schema.prisma` partiendo de `database/schema.draft.prisma`, ajustado a las decisiones. Borra el borrador cuando termines.
4. `npx prisma validate`, y después `npx prisma migrate dev --name init_schema` contra una base **local**. Nunca contra producción.
5. Seed en `database/seeds/`:
   - el usuario admin: email desde `.env` y contraseña **generada**, nunca en el repo;
   - una fila de `StudioSettings`;
   - el catálogo;
   - los horarios.
   - Opcional, **solo en desarrollo:** los clientes y reservas de ejemplo del estado de `AdminClients.dc.html` y `AdminBookings.dc.html`.
6. Actualiza `Backend/models/*.js` a los nombres nuevos (`Gallery.clientId → Client`, `Photo.originalFilename`, etc.) o deja la lista de cambios para el agente de backend.
7. Documenta en `wiki/` (skill `bitacora`) y actualiza `../handoff.md` §1.

**Hecho cuando:**

- `prisma validate` y `migrate dev` pasan;
- el seed corre dos veces sin duplicar nada;
- cada consulta de la §5.2 se puede escribir con Prisma sin SQL crudo;
- las decisiones de la §7 están anotadas con quién las tomó.

---

## 9. Qué se verificó al escribir esto

- Se leyeron los campos, las opciones de los `<select>` y el estado de ejemplo de **todas** las pantallas del lienzo (versión 1790128717). Las variantes tablet y móvil se compararon contra desktop.
- `npx prisma validate` con Prisma 7.10.0:
  - el schema **actual** falla (P1012, `url` en `datasource`);
  - el **borrador** (`database/schema.draft.prisma`) es válido.
- **No verificado:**
  - no se corrió `prisma generate` ni `migrate` (no hay base local);
  - no se probó ninguna consulta de la §5.2;
  - no se confirmaron los nombres exactos del adapter MySQL de Prisma 7.

---

## Anexo A — borrador del schema

Hoy vive en `database/prisma/schema.prisma` (el borrador se movió ahí el 2026-10-02): el archivo completo, validado con Prisma 7.10.0.

Ya incluye las decisiones de la §7 (2026-10-02) y se volvió a validar con `prisma validate`. Está listo para copiarlo a `database/prisma/schema.prisma`.

Resumen de modelos:

- `Service`, `Package`, `Extra`, `ExtraService`
- `Client`, `User`, `PasswordResetToken`
- `Booking`, `BookingExtra`, `Payment`, `RebookReminder`
- `Gallery`, `GallerySet`, `Photo`, `Favorite`
- `ActivityEvent`, `StudioSettings`, `AvailabilitySlot`, `BlockedDate`
