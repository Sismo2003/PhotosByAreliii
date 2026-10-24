---
tipo: bitacora
tema: setup-inicial
fecha: 2026-10-24
---

# Repo público: .gitignore allowlist, skill git-workflow y `obsidian/` → `wiki/`

Parte de [[setup-inicial]]. El repo se publica como portafolio, así que se publica solo lo mínimo para clonar y arrancar.

## Qué se hizo
- `.gitignore` pasó a **allowlist**: se ignora todo salvo carpetas de código, `docs/`, `wiki/` y las skills necesarias. Fotos, PDFs/docx, `.env`, dumps y `storage/` quedan siempre fuera.
- Skill **`git-workflow`**: nunca `git push` sin autorización explícita (refuerzo en `.claude/settings.json` con `ask`), commits convencionales y `check-secrets.sh` antes de commitear.
- `obsidian/` se renombró a `wiki/` y se actualizaron todas las referencias.
- Datos de ejemplo (`example.com`, `(480) 555-0100`) en lugar de contactos reales. Mismo patrón que `.env`: `shared/site.js` (datos reales, **ignorado**) y `shared/site.example.js` (plantilla pública); `npm run setup:site` crea el primero desde la plantilla. `OWNER_EMAIL` pasó a variable de entorno (`Backend/.env.example`).
- Política de publicación documentada en `docs/publicacion.md` (la bitácora de `wiki/` **sí se publica**; lo sensible va a `private/`, que se queda local).
- Nuevos índices: `README.md`, `SECURITY.md`, `docs/README.md`, `.claude/skills/README.md`.

## Decisiones
- `graphify` no se publica (skill global de terceros).
- `client/public/login.jpg` (foto de sesión real) no se publica; el README explica cómo poner otra imagen.

## Pendiente
- Rotar la contraseña temporal que estaba en `pass-temp.txt` (ignorado, pero ya apareció en una sesión).
- El primer commit y el `push` los autoriza el dueño.
