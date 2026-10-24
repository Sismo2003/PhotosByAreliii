---
tema: setup-inicial
estado: activo
---

# Setup inicial

Preparación del proyecto antes de escribir código: qué skills existen, qué convenciones asumen,
y qué decisiones de stack ya están tomadas vs. pendientes.

## Estado actual

Stack instalado (npm workspaces, `npm install` corrido en la raíz) y parte de `Backend/`
escrita (config/middlewares/models/controllers de auth+clientes+galerías) — pero **sin base de
datos real todavía**: no hay `server.js`, no hay rutas montadas, no se ha corrido `prisma
generate`. `Frontend/` solo tiene `package.json`, sin `astro.config.mjs` ni páginas. Ver
[[2026-09-22-instalacion-stack]] para el detalle exacto de qué falta y por qué se detuvo ahí.

## Entradas de bitácora

- [[2026-09-22-skills-y-graphify]] — creación de las 8 skills de proyecto, instalación de
  graphify, y creación de este vault de Obsidian
- [[2026-09-22-estructura-de-carpetas]] — carpetas raíz (`Frontend/`, `Backend/`, `docs/`,
  `database/`) y reubicación de Prisma a `database/prisma/`
- [[2026-09-22-instalacion-stack]] — npm workspaces, instalación de dependencias, y qué quedó
  a medio construir en `Backend/` a propósito (sin base de datos todavía)

## Decisiones clave

- Stack: Astro + islas de React + Express + Prisma/MySQL + JWT en cookie httpOnly. Ver
  [[2026-09-22-skills-y-graphify]] para el porqué de Express sobre alternativas.
- Nombre/logo de marca: **placeholder por ahora** — el cliente está en proceso de rebranding.
  Ver `.claude/skills/site-config/SKILL.md`.
- Galerías privadas: `Photo`/`Gallery` nunca se sirven por ruta estática pública — solo por
  endpoint autenticado. Ver `.claude/skills/auth-gallery/SKILL.md`.

- [[2026-10-24-repo-publico-y-git-workflow]] — repo público: allowlist, git-workflow, wiki/
- [[2026-10-24-despliegue-grid]] — despliegue en grid: CI/CD por Tailscale, dominio y servidor como variables
