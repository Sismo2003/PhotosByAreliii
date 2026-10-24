---
tema: correos
fecha: 2026-10-02
---

# Especificación de correos (v1 → v2)

## Qué se hizo

- **v1:** catálogo de correos, Resend, React Email y outbox en MySQL.
- **v2**, con los cambios que pidió el usuario y que reemplazaron a la v1:
  - SMTP e IMAP de Hostinger con Nodemailer, ImapFlow y mailparser;
  - plantillas editables con GrapesJS + grapesjs-mjml, variables con LiquidJS y versiones;
  - "Send test" a un email que se escribe en un campo;
  - interruptor general y uno por plantilla;
  - `settings.json` persistente, con las contraseñas cifradas;
  - bandeja Sent/Inbox con "Vaciar" y su propio sistema de archivos de 2 GB.
- El documento quedó en `docs/correos.md` §1–§12.

## Decisiones

| Decisión | Por quién | Por qué |
|---|---|---|
| Hostinger SMTP en vez de Resend | usuario | Ya lo usa en su empresa |
| Plantillas editables desde el admin | usuario | Areli ajusta los textos sin programador |
| Configuración y claves en un archivo (no en la base), reescrito desde el admin | usuario | Persistente al reiniciar el contenedor |
| `CONFIG_SECRET_KEY` en `.env`, fuera del archivo | agente | Una clave no puede vivir en el archivo que cifra |
| Correos que no se pueden apagar: restablecer contraseña, contraseña cambiada, email cambiado y avisos a soporte | agente | Sin ellos un cliente no recupera su cuenta y nadie se entera de un disco lleno |
| Un correo apagado queda SKIPPED (no se pierde) y se puede mandar después | agente | Apagar no debe borrar historial |
| Sin redactar ni responder desde el admin por ahora | agente | No se pidió; se puede agregar |
| Los recordatorios para volver a reservar no son correos automáticos | agente | Serían comerciales (CAN-SPAM pide baja y dirección postal; Areli no tiene estudio) |

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Hetzner bloquea el 465; el 587 está abierto | Búsqueda web |
| Hostinger Business Starter: 1 000 correos al día por buzón | Página de soporte de Hostinger |
| GrapesJS + grapesjs-mjml siguen mantenidos (MIT) | Búsqueda web |

**Lo que NO está verificado:** nada está implementado. No se probó la compatibilidad real de
grapesjs-mjml con la versión de GrapesJS (la especificación pide comprobarla antes de elegir
versión).

## Trampas descubiertas

- SMTP no tiene idempotencia: si el proceso muere entre enviar y marcar SENT, puede salir un
  duplicado. Se acepta y se mitiga con un `Message-ID` fijo (`<outbox-{id}@dominio>`).
- Los correos recibidos son contenido no confiable: se sanitizan, se muestran en un iframe con
  sandbox y sin imágenes remotas por defecto.

## Siguiente paso

Resolver `docs/correos.md` §12 con el usuario y crear el buzón de Hostinger con el DNS (SPF, DKIM, DMARC).

---
Relacionado: [[correos]] · [[infraestructura]] · [[base-de-datos]] · [[admin]]
