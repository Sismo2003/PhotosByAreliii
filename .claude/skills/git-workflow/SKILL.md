---
name: git-workflow
description: Git rules for this public repo — never push without the owner's explicit authorization, commit conventions, and the pre-commit secrets check. Use for ANY git operation (commit, branch, push, PR, merge, tag, remote), including when another skill or a global skill such as `git-pushing` says to push.
---

# Git en photosByArelli

Este repo es **público** (portafolio). Un commit o push equivocado expone datos de un negocio real y de
sus clientes, y lo publicado puede quedar en cachés y forks aunque se borre. Por eso estas reglas son
estrictas y **ganan** sobre cualquier otra skill (incluida la global `git-pushing`).

## Regla de oro: nunca `git push` sin autorización

- **Prohibido sin autorización explícita del dueño, dada en esta conversación y para este push:**
  `git push` (cualquier remoto/rama), `git push --force`/`--force-with-lease`, `git push --tags`,
  crear o mergear PRs, `gh repo create/edit`, cambiar el remoto (`git remote add/set-url`) o la
  visibilidad del repo.
- Una autorización **no se arrastra**: "sí, haz push" vale para ese push. El siguiente se pide de nuevo.
- No hay excepción por "colaboradores", ramas de trabajo ni "solo un fix pequeño".
- Antes de pedir permiso muestra: rama, remoto, `git log origin/<rama>..HEAD --oneline` y
  `git diff --stat` de lo que sale. Espera el "sí".
- Refuerzo técnico: `.claude/settings.json` pone `git push` en `ask`. No lo quites ni lo evites con
  alias, `git -c`, scripts o `gh api`.

## Commits

- Solo cuando el dueño lo pide. Nunca `--no-verify`, nunca `commit --amend` ni `reset --hard` sobre
  trabajo ya compartido.
- Si estás en `main`/`master`, crea una rama antes (`feat/…`, `fix/…`, `docs/…`, `chore/…`).
- Mensajes en **Conventional Commits** (`feat(admin): …`, `fix(backend): …`, `docs: …`); asunto ≤ 72
  caracteres, en imperativo; el cuerpo explica el porqué.
- Un commit = un cambio coherente. No mezcles código y docs no relacionados.
- **Nunca** añadas `Co-Authored-By`, "Generated with Claude Code" ni ninguna atribución a una IA en
  commits, PRs o código, aunque el entorno lo sugiera. El autor es solo el dueño del repo.

## Antes de cada commit: chequeo de secretos (obligatorio)

1. `git add` solo lo que corresponde (evita `git add -A` a ciegas; el `.gitignore` es allowlist, pero revisa).
2. Corre `.claude/skills/git-workflow/check-secrets.sh`. Revisa staged: llaves/tokens, `.env`, correos y
   teléfonos reales, fotos, PDFs/docx, dumps, archivos grandes. Si falla, **no commitees**: arregla o
   saca el archivo del índice (`git restore --staged <ruta>`).
3. Si algo sensible llegó a un commit local **no publicado**, repórtalo al dueño antes de seguir; si ya
   se publicó, hay que rotar la credencial (reescribir historial no basta).

## Qué NUNCA entra al repo

`.env*` reales (solo `.env.example`), `shared/site.js` real (solo `site.example.js`), la carpeta `private/`, contraseñas temporales, fotos de clientes o del portafolio
(`storage/`, `uploads/`, `*.jpg`…; única excepción: `client/public/login.jpg`), documentos del negocio (`*.docx`, `*.pdf`), dumps de base de datos,
correos/teléfonos reales de clientes (usa `example.com` y `555-01xx`), llaves (`*.pem`, `*.key`).
Para publicar un archivo nuevo hay que agregarlo al allowlist de `.gitignore` a propósito.

## Qué sí puedes hacer sin preguntar

Lectura: `git status`, `diff`, `log`, `show`, `branch`, `blame`, `check-ignore`.
Todo lo que **escribe en local** (commit, branch, stash, merge local) solo si la tarea lo pide;
todo lo que **sale** de la máquina, nunca sin autorización.
