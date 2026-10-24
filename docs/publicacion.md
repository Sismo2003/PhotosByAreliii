# Qué se publica en GitHub y qué se queda local

El repo es público (portafolio). El `.gitignore` es un **allowlist**: todo se ignora salvo lo listado.
Nada sale de la máquina hasta que el dueño autoriza un `git push` (skill `git-workflow`).

## Se publica

| Qué | Dónde | Nota |
|---|---|---|
| Código | `Backend/`, `Frontend/`, `admin/`, `client/`, `database/`, `deploy/` | sin `.env`, `dist/`, `node_modules/` |
| Plantillas de configuración | `*/.env.example`, `shared/site.example.js` | solo valores de ejemplo |
| Documentación técnica | `docs/`, `handoff.md`, `*/handoff.md`, `CLAUDE.md`, `README.md`, `SECURITY.md` | datos de ejemplo |
| **Bitácora de agentes** | `wiki/` | **sí se publica**: decisiones y contexto, sin datos reales |
| Una imagen | `client/public/login.jpg` (fondo del login) | © Photos By Areliii LLC, sin GPS ni datos de cámara; ver `derechos-imagenes.md` |
| Skills del proyecto | `.claude/skills/<las listadas en .gitignore>`, `.claude/settings.json` | no incluye `graphify` |

## Se queda local (ignorado)

| Qué | Dónde |
|---|---|
| Secretos y configuración real | `.env`, `Backend/.env`, `database/.env` |
| Datos reales del negocio | `shared/site.js` |
| Fotos, PDFs, docx del negocio | `storage/`, `Photos By Areliii LLC/`, `views/`, `*.jpg` (salvo el login), `*.pdf`, `*.docx` |
| Notas con datos reales | `private/` (misma estructura que `wiki/`) |
| Scratch y dependencias | `Backend/_t*.mjs`, `node_modules/`, `dist/`, `graphify-out/` |

## Cuando un agente documenta

1. Escribe en `wiki/<tema>/bitacora/` (skill `bitacora`): **queda en el repo y se publicará** en el
   siguiente push autorizado. Por eso solo lleva datos de ejemplo (`example.com`, `(480) 555-0100`).
2. Si la nota necesita datos reales, la escribe en `private/<tema>/` (local, no se sube) y deja en `wiki/`
   una nota genérica con un wikilink de contexto.
3. Antes de cada commit: `.claude/skills/git-workflow/check-secrets.sh`.
4. Escribir un archivo **no** lo publica: solo `commit` + `push` autorizado lo hacen.

## Clonar y empezar

`npm run setup:site` crea `shared/site.js` desde la plantilla; copia los `.env.example` a `.env`.
Ver el `README.md` de la raíz.

## Añadir algo nuevo al repo

Agrégalo a propósito al allowlist de `.gitignore` y corre `check-secrets.sh --all`.
