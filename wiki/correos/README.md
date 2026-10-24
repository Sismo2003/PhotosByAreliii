---
tema: correos
estado: activo
---

# Correos

Todo lo que el sistema envía y recibe por email: 25 correos, envío por SMTP de Hostinger,
plantillas que Areli edita en el admin, bandeja Sent/Inbox y configuración en un archivo.

## Estado actual

- Especificación v2: `docs/correos.md`. Nada implementado.
- Tablas en el schema (`database/prisma/schema.prisma`): `EmailOutbox`, `EmailTemplate`,
  `EmailTemplateVersion` y `EmailInbound`.
- Pendientes con el usuario: los 5 puntos de `docs/correos.md` §12 (dominio de Areli, plan de
  Hostinger, reseñas, recibo del balance, resumen diario).

## Entradas de bitácora

- [[2026-10-02-especificacion-correos]] — catálogo de 25 correos, outbox, Hostinger por 587, plantillas editables con GrapesJS, bandeja, `settings.json`

## Decisiones clave

- SMTP del correo de Hostinger, que el usuario ya usa en su empresa, en lugar de Resend — decisión del usuario.
- Plantillas editables en el admin, envío de prueba a un email, interruptor general y por plantilla, bandeja que se puede vaciar y espacio propio en Docker — decisiones del usuario.
- La configuración y las claves van en un archivo persistente que se reescribe desde el admin — decisión del usuario.
- Puerto **587**, porque Hetzner bloquea el 465. Ver [[infraestructura]].
