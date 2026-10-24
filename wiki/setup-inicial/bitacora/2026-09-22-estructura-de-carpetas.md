---
tema: setup-inicial
fecha: 2026-09-22
---

# Estructura de carpetas raíz + reubicación de Prisma

## Qué se hizo

- Se crearon las carpetas raíz del proyecto: `Frontend/`, `Backend/`, `docs/`, `database/`
  (con `database/prisma/` ya preparado para el schema).
- Se actualizaron `.claude/skills/db-migrations/SKILL.md`, `.claude/skills/backend/SKILL.md` y
  `.claude/skills/bitacora/SKILL.md` para reflejar que Prisma vive en `database/prisma/`, no en
  `Backend/prisma/` como en `planner`.
- Se actualizó `.claude/skills/bitacora/validar-docs.sh` para reconocer rutas bajo `database/` y
  `docs/` al validar referencias a archivos del repo.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| `Frontend/` y `Backend/` con mayúscula inicial (no `frontend/`/`backend/`) | usuario | Consistencia con rebate/planner y con lo que ya documentaban las 8 skills |
| El schema de Prisma vive en `database/prisma/schema.prisma`, `Backend/` solo importa el cliente generado | usuario | Separa la base de datos del backend como carpeta propia de primer nivel, a diferencia de `planner` donde `prisma/` está anidado dentro de `Backend/` |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Carpetas creadas | `find . -maxdepth 1` tras la creación |
| `validar-docs.sh` sigue pasando tras el cambio de regex | Ejecutado, 0 errores |

**Lo que NO está verificado:** el flujo real de `prisma migrate dev` desde `database/` con el
cliente apuntando a `Backend/` — no existe `schema.prisma` todavía, esto es solo la convención
documentada, no código probado.

## Siguiente paso

Al escribir el primer `database/prisma/schema.prisma`, configurar su `generator client { output
= ... }` apuntando a donde `Backend/config/` lo importa, y confirmar con el usuario si `Gallery`
debe ser muchos-por-cliente (ver [[2026-09-22-skills-y-graphify]]).

---
Relacionado: [[setup-inicial]]
