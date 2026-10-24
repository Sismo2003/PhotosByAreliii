---
tema: setup-inicial
fecha: 2026-09-22
---

# Skills de proyecto, graphify, y vault de Obsidian

## Qué se hizo

- Se revisaron los proyectos hermanos (`rebate`, `sharkids-system`, `planner`) para extraer
  convenciones reutilizables: `rebate/landing/src/data/site.js` (patrón BRAND/CONTACT/SOCIAL),
  `planner/Backend` (Express + Prisma + JWT en cookie httpOnly + Multer para uploads —
  `middlewares/auth.middleware.js`, `config/uploads.js`), y
  `sharkids-system/.claude/skills/documentar-trabajo` (patrón de documentación por temas +
  bitácora + validador, adaptado aquí a formato Obsidian con wikilinks).
- Se creó `.claude/skills/` con 8 skills: `workflow`, `site-config`, `landing-seo`,
  `auth-gallery`, `backend`, `frontend`, `db-migrations`, `bitacora` (esta última con
  `plantillas/` y `validar-docs.sh`).
- Se instaló graphify a nivel de proyecto: `cp -r ~/.claude/skills/graphify
  .claude/skills/graphify` (ya estaba disponible globalmente; se copia localmente para replicar
  el patrón usado en `rebate`).
- Se creó este vault (`wiki/`) con índice maestro y el tema `setup-inicial`.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Backend en Express (no Fastify/Next.js) | usuario | El cuello de botella de este proyecto es manejo de fotos, no el framework HTTP; se prioriza consistencia con rebate/sharkids/planner sobre rendimiento marginal |
| Prisma en vez de SQL manual numerado | agente, no objetado | `planner` mezcla `migrations/*.sql` legado y `prisma/migrations/` — la coexistencia genera confusión sobre cuál es la fuente de verdad; para un proyecto nuevo se usa solo Prisma migrate |
| Nombre/logo de marca = placeholder | usuario | Cliente en proceso de rebranding, aún sin logo ni nombre final |
| Servicios/precios en `services.json` | usuario | Pedido explícito; datos tomados de `Screenshot 2026-09-22 at 16.05.15.png` (pendiente de borrar una vez `services.json` exista de verdad) |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Estructura de carpetas creada (`.claude/skills/*`, `wiki/*`) | `find`/`ls` tras cada creación |
| `validar-docs.sh` | No ejecutado todavía — no hay wikilinks suficientes para una prueba real hasta que exista una segunda nota |
| Copia de graphify | `ls .claude/skills/graphify` confirma `SKILL.md`, `references/`, `.graphify_version` presentes |

**Lo que NO está verificado:** nada de código — no existe todavía `Backend/` ni `Frontend/`, así
que ninguna convención descrita en las skills se ha probado contra código real.

## Trampas descubiertas

- `planner/Backend` tiene dos sistemas de migración conviviendo (`migrations/*.sql` a mano y
  `prisma/migrations/` generado) — para este proyecto se decidió no repetir eso, ver
  `.claude/skills/db-migrations/SKILL.md`.
- El schema `Gallery` 1:1 por cliente en `db-migrations` es un borrador, no decisión cerrada —
  este negocio probablemente necesita múltiples galerías por cliente (una por sesión). Confirmar
  con el usuario antes de generar la primera migración real.

## Siguiente paso

Scaffolding real del proyecto (Astro + Express + Prisma) — pendiente, el usuario dijo que
seguiría con "otras cosas" después de tener las skills listas.

---
Relacionado: [[setup-inicial]]
