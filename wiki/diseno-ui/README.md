---
tema: diseno-ui
estado: activo
---

# Diseño UI

Diseño visual y de flujos de todo el producto (sitio público, reservas, panel de admin,
galerías y acceso de clientes), hecho como prototipo navegable **antes** de escribir código en
`Frontend/`. Vive en dos Artifacts de claude.ai, no en el repo.

## Dónde está el diseño

| Qué | Dónde | Notas |
|---|---|---|
| Sistema de diseño (tokens, componentes, guía de marca) | Artifact "PhotosByAreli" (tipo Design System) — `https://claude.ai/artifact/WFQTGdkRUQkFJL97hSUSKq` | Privado del usuario |
| Lienzo tipo Figma con todas las pantallas | Artifact "PhotosByAreli — Pantallas" (tipo Design) — `https://claude.ai/artifact/6q8sY1zKxH3zMTBRoyj1dQ` | Privado; cada pantalla es un `project/*.dc.html`; botón **Play** para navegar |

Para leerlos en otra sesión: herramienta `Artifact` con `action: "read"` y `path`
(p. ej. `project/canvas.json`, `project/Main.dc.html`). No usar WebFetch.

## Estado actual

Diseño **completo a nivel prototipo** (desktop + tablet + móvil en lo principal). Nada de esto
está implementado en código todavía: `Frontend/` sigue teniendo solo `package.json`.

## Entradas de bitácora

- [[2026-09-22-sistema-de-diseno]] — primer estilo rechazado, segundo estilo (blanco, EB Garamond, ref. juliaandgil.com) aprobado
- [[2026-09-22-sitio-publico-y-reservas]] — landing, efecto "Moments", `/services` + sub-landings, footer, flujo `/book` de 5 pasos
- [[2026-09-22-admin-galerias-y-acceso]] — panel Bookings (pagos manuales, expirado, seguimiento), editor de galería, login compartido, galería del cliente con PIN

## Decisiones clave (del usuario — no cambiar sin preguntarle)

- Estilo: **súper simple, directo al grano**, blanco/negro, referencia `juliaandgil.com`. Ver [[2026-09-22-sistema-de-diseno]].
- Areli **confirma cada reserva a mano**; el cliente solo envía una solicitud. Ver [[2026-09-22-sitio-publico-y-reservas]].
- Pagos **fuera del sitio** (Zelle, Cash App, efectivo); Areli los registra con "Mark as paid". Sin Stripe por ahora.
- Panel admin: **desktop y tablet primero**, móvil responsivo y funcional.
- Botón ES/EN en el nav **sin traducción** implementada todavía.
- Al enviar una galería se generan **automáticamente** la contraseña temporal del cliente y el PIN de descarga. Ver [[2026-09-22-admin-galerias-y-acceso]].

## Handoff

El resumen para el siguiente agente está en `handoff.md` en la raíz del repo.
