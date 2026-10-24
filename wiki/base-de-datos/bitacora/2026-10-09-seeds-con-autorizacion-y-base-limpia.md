---
tema: base-de-datos
fecha: 2026-10-09
---

# Seeds solo con autorización y base de desarrollo limpia

Petición del usuario: los seeds hacían que la base no fuera confiable (volvían a crear el catálogo,
el dev seed borraba y rellenaba con datos falsos). Quiere que **ningún seed se aplique sin su
autorización** y que se vacíen todas las tablas **menos `users`**, para conservar su login.

## Qué se hizo

- `database/seeds/guard.js` (nuevo): todo seed llama a `requireSeedConfirmation` al empezar. Sin
  `CONFIRM_SEED=yes` en el comando, imprime qué haría y sale con error sin tocar la base.
  El dev seed (destructivo) además se niega si `NODE_ENV=production` o si el host de `DATABASE_URL`
  no es `localhost`, `127.0.0.1` o `mysql` (cierra S4 de `docs/auditoria-2026-10-09.md`).
- `database/seeds/seed.js` y `database/seeds/dev-seed.js`: llaman a la guarda antes de conectarse.
- `database/prisma.config.ts`: se **quitó** `migrations.seed`. Así `prisma db seed` ya no hace nada
  ("No seed command configured") y ningún flujo de Prisma puede sembrar por su cuenta.
- `database/package.json`: `prisma:seed` ahora es `node seeds/seed.js` (con la guarda).
- Base de desarrollo (MySQL de Docker, `localhost:3306`): `TRUNCATE` de las 22 tablas que no son
  `users` ni `_prisma_migrations`, y borrado de usuarios que no fueran ADMIN (no había ninguno).
  Quedó `users` con 1 fila (el admin, `admin@example.com`) y `_prisma_migrations` intacta (9).
- `handoff.md` §1.1 y `docs/auditoria-2026-10-09.md` actualizados.

Cómo correr un seed a propósito, desde `database/`:
```bash
CONFIRM_SEED=yes node seeds/seed.js        # base: admin, ajustes, catálogo, horarios (idempotente)
CONFIRM_SEED=yes node seeds/dev-seed.js    # datos de prueba; BORRA y rellena (solo base local)
```

## Catálogo insertado (autorizado por el usuario, 2026-10-09)

Tras vaciar la base, el usuario pidió insertar **solo los servicios** del PDF
`Photos By Areliii LLC/Photos By Areliii LLC.pdf`. Se agregó `SEED_ONLY` a `database/seeds/seed.js`
(`admin,settings,catalog,availability`) y se corrió `CONFIRM_SEED=yes SEED_ONLY=catalog node seeds/seed.js`.
Datos en `database/seeds/data/catalog.js`, que ya coincidía con el PDF: 6 servicios LIVE y 8 paquetes
(Graduation 160, Solos 145, Couples 160, Family 220, Maternity 170, Birthday 180, Party 185 de 90 min,
Branding 180; las demás sesiones de 120 min) y 2 add-ons (outfit +$15 en todos; +30 min $50 solo en Birthdays & parties).
No se insertaron admin, ajustes ni horarios: `availability_slots` sigue vacío (los horarios del seed eran
provisionales, hay que fijarlos con Areli) y `studio_settings` usa los valores por defecto del backend.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Vaciar todo salvo `users` (también catálogo, ajustes, plantillas de correo y horarios) | usuario | quiere una base sin datos sembrados; lo que haga falta lo captura Areli en el admin |
| Quitar `seed` de `prisma.config.ts` en vez de solo proteger el script | agente | en Prisma 7 el seed no corre solo tras `migrate`, pero así tampoco puede dispararse con `prisma db seed` por error |
| Confirmación por variable de entorno `CONFIRM_SEED=yes` | agente | funciona igual en Mac y en Docker, sin preguntas interactivas |
| Se conservan solo los usuarios ADMIN | agente | `users.clientId` apunta a `clients`; un usuario de cliente sin su cliente quedaría huérfano |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Guarda | `node seeds/seed.js` y `node seeds/dev-seed.js` sin la variable: salen con código 1 sin conectarse. Con `CONFIRM_SEED=yes` y host `db.example.com`, el dev seed se niega |
| `prisma db seed` | responde "No seed command configured" |
| Vaciado | conteos reales: bookings, clients, services, photos y studio_settings en 0; users 1; `_prisma_migrations` 9 |

**Lo que NO está verificado:** que `CONFIRM_SEED=yes node seeds/seed.js` siga funcionando con la guarda
(no se corrió a propósito para no sembrar la base recién vaciada).

## Trampas descubiertas

- `information_schema.tables.table_rows` es una **estimación** en InnoDB y no baja tras un `TRUNCATE`;
  hay que contar con `count(*)`.
- Sin la fila de `studio_settings` el backend usa valores por defecto (`withSettingsFallback`), pero el
  catálogo vacío deja la pantalla de nueva reserva sin servicios hasta que Areli los cree en Services.
- **Falló "Nueva reserva" con la base vacía** (`depositCents: NaN`, Prisma: "Argument `client` is missing"):
  `SETTINGS_FALLBACK` en `Backend/services/booking-derive.js` solo traía 3 valores y le faltaba
  `depositPercent`. Corregido: ahora trae todos los valores por defecto de `StudioSettings` (mantenerlos
  iguales a `database/prisma/schema.prisma`). Con la fila de ajustes ausente, el depósito sale 50 %.
- Las fotos en `Backend/storage/galleries/` no se borraron: las galerías ya no existen en la base y la
  tarea de limpieza elimina esas carpetas huérfanas al arrancar la API.
- Antes de vaciar se hizo un respaldo en la carpeta temporal de la sesión (`photosbyarelli-before-truncate-2026-10-09.sql`,
  con los datos de prueba de antes); esa carpeta es temporal y puede desaparecer.
- La base de desarrollo publica el puerto 3306 en toda la red (S5 de la auditoría sigue abierto).

---
Relacionado: [[base-de-datos]] · [[2026-10-02-prisma-en-docker]]
