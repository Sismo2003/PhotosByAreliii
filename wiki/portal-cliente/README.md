---
tema: portal-cliente
estado: activo
---

# Portal del cliente

App `client/` en `photosbyareliii.com/client/` y **la única página de login** (`/login`) para Areli y
sus clientes. Plan completo y decisiones P1–P17: `docs/portal-cliente-plan.md`. Reglas: skill
`client-portal`. Diseño: el mismo de [[admin]] y [[diseno-ui]].

## Estado actual

- Primer corte hecho (login único, primera contraseña, galerías disponibles, galería + visor simple,
  perfil de solo lectura, EN/ES, API `/api/client/*`, nginx + Docker). **Sin ver en el navegador.**
  Ver [[2026-10-09-portal-cliente-primer-corte]].
- Galería con selección múltiple (recuadro azul), favorito único compartido con el admin, descargas web e historial con nombre del cliente. Ver [[2026-10-09-galeria-seleccion-favoritos-descargas]].
- Handoff para el siguiente agente: `client/handoff.md` (hecho, sin verificar, pendientes en orden).
- **2026-10-19:** auditoría de lo que falta (Bookings, Payments, perfil editable, Preview, reset, `shared/`…). Ver [[2026-10-19-auditoria-pendientes]].
- **2026-10-19:** pestañas Bookings y Payments, contacto (Text Areli / Instagram) y `.ics`; datos del estudio en `shared/site.js`. Sin ver en el navegador. Ver [[2026-10-19-bookings-payments-contacto]].
- Siguiente: revisión en el navegador, perfil editable, Preview as client, Book again (cuando exista `/book`).

## Bitácora

- [[2026-10-09-portal-cliente-primer-corte]]
- [[2026-10-09-galeria-seleccion-favoritos-descargas]]
- [[2026-10-19-auditoria-pendientes]]
- [[2026-10-19-bookings-payments-contacto]]
