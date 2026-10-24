---
tema: base-de-datos
fecha: 2026-10-02
---

# Modelo de datos: decisiones y cliente que vuelve

## Qué se hizo

- Se partió del plan que otro agente había dejado (`database/handoff.md`, `database/schema.draft.prisma`)
  en vez de rehacerlo.
- Se revisó el lienzo y apareció una pantalla que el plan no cubría: `AdminServices.dc.html`
  (Details, Packages, Page content, Photos, Add-ons). Se actualizó el catálogo:
  - `Service` con `status`, `cardLine`, `intro`, `includesLine`, `ctaWord` y `fromPackageId`;
  - `Package` con `outfits`, `hidden` y `customDescription`;
  - `ExtraService`, la tabla puente entre extras y servicios;
  - `onDelete: Restrict` para que un servicio o paquete con reservas solo se pueda ocultar.
- Cliente que vuelve: `Client.phoneE164` único y, en `Booking`, los campos `contact*`,
  `clientMatchedBy` y `matchReviewedAt`. Reglas en `database/handoff.md` §4.4.
- Se agregaron al borrador:
  - `Gallery.photosDeletedAt` y `Client.emailBouncedAt`;
  - en `StudioSettings`: horas de los recordatorios, `storageAlert*` y `mailStorageAlert*`;
  - las tablas de correo `EmailOutbox`, `EmailTemplate`, `EmailTemplateVersion` y `EmailInbound` (ver [[correos]]).
- Se creó `database/schema.dbml` para dbdiagram.io.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| PIN y contraseña de galería cifrados (AES-256-GCM), no hash (D3) | usuario | Areli los vuelve a ver en Settings |
| Favoritos solo con login (D4) | usuario | Con contraseña o link abierto no se sabe quién mira |
| REQUEST, AWAITING_DEPOSIT y CONFIRMED bloquean el horario (D5) | usuario | Evita dos solicitudes a la misma hora |
| Fotos del sitio y textos de "Page content" fijos en el frontend (D8, D13) | usuario | No quiere esa función en el admin |
| Fotos borradas al vencer la galería + email 48 h antes (D9) | usuario | Liberar disco; ver [[infraestructura]] |
| El teléfono identifica al cliente (D14) | usuario | Clientes que vuelven con otro email |
| El formulario público nunca sobrescribe la ficha del cliente | agente | `/book` no pide login; cualquiera puede escribir el email o el teléfono de otra persona |
| Si el email apunta a A y el teléfono a B, gana el email (CONFLICT) | agente | El email es el login |
| Paquete de dos sesiones = una reserva con `sessionCount` (D6) | agente | El catálogo real no tiene paquetes de dos sesiones |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| `schema.draft.prisma` | `prisma format` + `prisma validate` (Prisma 7.10) después de cada cambio |
| `schema.dbml` | Parser oficial `@dbml/core` (23 tablas, 32 relaciones) |

**Lo que NO está verificado:** no se creó ninguna base ni se corrió `migrate`; no se probó ninguna
consulta; el diagrama no se abrió en dbdiagram.io.

## Trampas descubiertas

- `schema.dbml` **no se genera solo**: se escribió a mano a partir del borrador. Si cambias el
  Prisma, actualiza el DBML y valídalo.
- `phoneE164` único implica que dos personas que comparten teléfono (mamá e hija) quedan como **un**
  cliente. El usuario lo sabe; si se quiere separar, se quita el `@unique` y la coincidencia por
  teléfono pasa a ser solo una sugerencia.
- `ServiceQuince.dc.html` en el lienzo es en realidad "Birthdays & parties" (slug `birthdays-parties`).

## Siguiente paso

Seguir `database/handoff.md` §8: `prisma.config.ts`, el adapter de MySQL, pasar el borrador a
`database/prisma/schema.prisma`, migración `init_schema` contra MySQL **local** y seed.

---
Relacionado: [[base-de-datos]] · [[correos]] · [[infraestructura]] · [[diseno-ui]]
