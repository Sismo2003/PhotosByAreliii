---
tipo: indice-maestro
---

# photosByArelli — índice

Vault de Obsidian con la documentación de todo lo que los agentes hacen en este repo: qué se
creó, qué se editó, decisiones tomadas y por qué. Ábrelo directamente en la app de Obsidian
(`Open folder as vault` → esta carpeta) para navegar por el grafo y los backlinks.

Ver la skill `bitacora` (`.claude/skills/bitacora/SKILL.md`) para cómo y cuándo se escribe aquí.

## Temas

- [[setup-inicial]] — estructura de skills, instalación de graphify, y este mismo vault
- [[diseno-ui]] — prototipo completo en Artifacts (sistema de diseño + lienzo con todas las pantallas), decisiones del cliente e implicaciones para el backend
- [[base-de-datos]] — borrador del schema Prisma, decisiones D1–D16, cliente que vuelve por teléfono, diagrama DBML
- [[infraestructura]] — Hetzner + Docker + nginx, almacenamiento de fotos con límite de disco y barra del admin
- [[correos]] — 25 correos, SMTP de Hostinger (puerto 587), plantillas editables, bandeja y configuración en archivo
- [[admin]] — app `admin/` a partir del template Tailux, adaptada al diseño; dos layouts, Display, login real también en desarrollo (el bypass se eliminó)
- [[portal-cliente]] — app `client/` (portal del cliente) y el login único `/login` para admin y clientes
