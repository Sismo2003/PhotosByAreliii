---
tema: correos
estado: activo
---

# Correos

Todo lo que el sistema envía y recibe por email: 25 correos, envío por SMTP de Hostinger,
plantillas que Areli edita en el admin, bandeja Sent/Inbox y configuración en un archivo.

## Estado actual

- **Fase 1 (envío) implementada** el 2026-10-24: catálogo de plantillas EN/ES editables en el admin,
  outbox con reintentos, recordatorios programados y `settings.json` persistente en
  `$DATA_DIR/config`. Falta desplegarla y probarla con Hostinger real.
- Correos sin disparador todavía, y fase 2 (bandeja IMAP): ver [[2026-10-24-modulo-correos-implementado]].
- Especificación: `docs/correos.md`. Pendientes con el usuario: §12.

## Entradas de bitácora

- [[2026-10-02-especificacion-correos]] — catálogo de 25 correos, outbox, Hostinger por 587, plantillas editables con GrapesJS, bandeja, `settings.json`
- [[2026-10-24-modulo-correos-implementado]] — fase 1 implementada, volumen `config/` en producción, qué falta conectar

## Decisiones clave

- SMTP del correo de Hostinger, que el usuario ya usa en su empresa, en lugar de Resend — decisión del usuario.
- Plantillas editables en el admin, envío de prueba a un email, interruptor general y por plantilla, bandeja que se puede vaciar y espacio propio en Docker — decisiones del usuario.
- La configuración y las claves van en un archivo persistente que se reescribe desde el admin — decisión del usuario.
- Puerto **587**, porque Hetzner bloquea el 465. Ver [[infraestructura]].
