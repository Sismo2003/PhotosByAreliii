---
tema: base-de-datos
fecha: 2026-10-02
---

# Prisma 7 y MySQL en Docker (desarrollo local)

## Qué se hizo

- `database/schema.draft.prisma` pasó a `database/prisma/schema.prisma` (el schema viejo se
  reemplazó y el borrador se borró, como pedía `database/handoff.md` §8).
- `database/prisma.config.ts`: la URL sale de `DATABASE_URL` (Prisma 7 ya no la acepta en el schema).
- `database/docker-compose.yml` (proyecto `pba-dev`), **solo para desarrollo**:
  - `mysql` (8.4) en el puerto 3306, usuario `pba`, datos en el volumen `mysql-data`;
  - `prisma` (imagen de `database/Dockerfile`): al arrancar corre `prisma generate` y
    `prisma migrate deploy`, y deja Prisma Studio en `http://localhost:5555`.
- Primera migración: `database/prisma/migrations/` con `init_schema` (23 tablas).
- `Backend/config/db.js` usa `@prisma/adapter-mariadb` e importa el cliente de
  `database/generated/prisma/client.ts`. `database/generated/` va en `.gitignore`.

## Uso

```bash
cd database
docker compose up -d --build                     # MySQL + Studio
docker compose run --rm prisma npx prisma migrate dev --name <cambio>
docker compose up -d --build -V                  # después de cambiar database/package.json
docker compose down                              # -v borra también la base
```

Desde la Mac, la URL es la de `database/.env` (`localhost:3306`); dentro de Docker, compose usa
`mysql:3306`.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Prisma en Docker solo para desarrollo local; `deploy/` no se tocó | usuario | — |
| Arreglar la base de Prisma 7 en la misma tarea | usuario | Sin eso el contenedor no podía hacer nada |
| `socat` reenvía 5555 → 5556 dentro del contenedor | agente | Studio escucha fijo en `127.0.0.1` (no tiene `--hostname`) |
| El usuario `pba` tiene `ALL ON *.*` (`database/docker/mysql-init/`) | agente | `migrate dev` crea y borra una base sombra |
| `node_modules` del contenedor en un volumen anónimo | agente | Los binarios de Prisma de la Mac no sirven en Linux |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Schema | `prisma validate` |
| Compose | `docker compose up -d --build`: MySQL sano, `migrate deploy` sin errores |
| Migración | `migrate dev --name init_schema` en el contenedor; `SHOW TABLES` lista 23 tablas |
| Studio | `curl http://localhost:5555/` responde 200 |
| `Backend/config/db.js` | `prisma.client.count()` desde la Mac con Node 24 → 0 |

**No verificado:** Studio no se abrió en el navegador; no hay seed; el Backend sigue sin
`server.js`, y `Backend/models/*.js` todavía usan los nombres del schema viejo.

## Trampas descubiertas

- El cliente de Prisma 7 se genera en **TypeScript** (`.ts`, con imports `.ts`). El Backend en JS
  lo importa gracias a que Node 24 quita los tipos; con Node < 22.18 no funcionaría.
- El adapter de MySQL de Prisma 7 se llama `@prisma/adapter-mariadb` (`PrismaMariaDb`); no existe
  `@prisma/adapter-mysql`.
- Prisma Studio en Prisma 7 escucha en `127.0.0.1`: publicar el puerto sin reenvío no funciona.
- El CLI avisa de Prisma 8 (RC); no se actualizó.

## Siguiente paso

Seed en `database/seeds/` (§8 paso 5) y actualizar `Backend/models/*.js` a los nombres nuevos.

---
Relacionado: [[base-de-datos]] · [[infraestructura]]
