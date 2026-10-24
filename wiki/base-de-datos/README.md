---
tema: base-de-datos
estado: activo
---

# Base de datos

Modelo de datos (Prisma 7 + MySQL) derivado de las pantallas del lienzo de [[diseno-ui]]. Hay una
base **local** en Docker con la primera migración; falta el seed.

## Estado actual

- Schema: `database/prisma/schema.prisma` (Prisma 7, valida) + `database/prisma.config.ts`.
- Primera migración `init_schema` en `database/prisma/migrations/`.
- Desarrollo local: `database/docker-compose.yml` levanta MySQL y Prisma Studio. Ver
  [[2026-10-02-prisma-en-docker]].
- Diagrama: `database/schema.dbml` (se pega en dbdiagram.io).
- Documento maestro con cada campo, su pantalla de origen y las decisiones D1–D16:
  `database/handoff.md`.
- Falta: seed, y pasar `Backend/models/*.js` a los nombres nuevos.

## Entradas de bitácora

- [[2026-10-02-modelo-de-datos]] — revisión del lienzo (pantalla AdminServices nueva), decisiones D1–D16, cliente que vuelve por teléfono, diagrama DBML
- [[2026-10-09-seeds-con-autorizacion-y-base-limpia]] — los seeds ya no corren solos (`CONFIRM_SEED=yes`) y se vaciaron todas las tablas menos `users`
- [[2026-10-02-prisma-en-docker]] — base de Prisma 7, MySQL + Studio en Docker para desarrollo, migración `init_schema`, adapter en el Backend
## Decisiones clave

- Las decisiones D1–D16 están cerradas, salvo detalles de D9; la tabla completa está en `database/handoff.md` §7. Ver [[2026-10-02-modelo-de-datos]].
- El teléfono también identifica al cliente (`Client.phoneE164` único) — decisión del usuario.
- Los textos y fotos de las páginas de servicio van en el código, no en la base — decisión del usuario.
- Las fotos se borran al vencer la galería, con aviso al cliente 48 h antes — decisión del usuario. Ver [[infraestructura]] y [[correos]].
