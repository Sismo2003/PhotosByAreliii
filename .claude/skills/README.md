# Skills del proyecto

Instrucciones que los agentes de código cargan según el área en la que trabajan. Cada skill vive en
`.claude/skills/<nombre>/SKILL.md` (frontmatter `name` + `description`). Carga la de proceso más la del
área que toques.

| Categoría | Skill | Úsala para |
|---|---|---|
| **Proceso** | [`workflow`](workflow/SKILL.md) | Cualquier tarea no trivial: entender → planear → editar mínimo → verificar |
| | [`git-workflow`](git-workflow/SKILL.md) | **Todo lo de git.** Nunca `push` sin autorización; commits; chequeo de secretos |
| | [`deploy`](deploy/SKILL.md) | CI/CD, Docker, nginx y el servidor `grid`: despliegue, cambio de dominio y de servidor |
| | [`bitacora`](bitacora/SKILL.md) | Documentar el trabajo terminado en `wiki/` (y validarlo con `validar-docs.sh`) |
| **Backend y datos** | [`backend`](backend/SKILL.md) | `Backend/`: Express, Prisma, envelope de respuestas, controller/model |
| | [`db-migrations`](db-migrations/SKILL.md) | Cambios de schema con `prisma migrate` |
| | [`auth-gallery`](auth-gallery/SKILL.md) | Login, JWT, roles, subida y acceso a fotos privadas |
| **Interfaz** | [`frontend`](frontend/SKILL.md) | Landing pública en Astro + islas React |
| | [`landing-seo`](landing-seo/SKILL.md) | SEO/GEO de las páginas públicas |
| | [`admin-tables`](admin-tables/SKILL.md) | Estructura obligatoria de tablas y *skeletons* en `admin/` |
| | [`client-portal`](client-portal/SKILL.md) | Portal del cliente (`client/`), `/login`, `/api/client/*` |
| **Configuración** | [`site-config`](site-config/SKILL.md) | `shared/site.js`: contacto, redes, pagos y precios |

Skill **global** (no vive en el repo): `~/.claude/skills/grid-deploy` — el patrón de despliegue al servidor `grid`
compartido por todos tus proyectos; la skill `deploy` de aquí es su aplicación a este repo.

Reglas globales del repo (fechas con Luxon, teléfonos con libphonenumber-js, tablas del admin):
[`CLAUDE.md`](../../CLAUDE.md).

## Convenciones para añadir o editar una skill

- Una carpeta por skill; el nombre en `kebab-case` igual al `name` del frontmatter.
- `description`: **cuándo** usarla (disparadores concretos), no solo qué hace.
- `SKILL.md` ≤ ~120 líneas; lo largo va en archivos de apoyo dentro de la misma carpeta.
- Sin datos reales (clientes, contactos, llaves) en ningún ejemplo: `example.com`, `(480) 555-0100`.
- Si la skill se publica, añádela a la tabla de arriba **y** al allowlist del `.gitignore`.
