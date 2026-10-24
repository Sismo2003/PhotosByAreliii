# Seguridad

Este repositorio es público y no contiene datos reales de clientes, fotos ni credenciales.

## Cómo se maneja

- **Secretos** (`JWT_SECRET`, `GALLERY_ENC_KEY`, SMTP, `DATABASE_URL`, tokens de Cloudflare) viven en
  archivos `.env` locales o en variables del servidor. En el repo solo hay `.env.example` sin valores.
- **`.gitignore` es un allowlist**: todo se ignora salvo lo listado, así un archivo nuevo no se publica
  por accidente. Fotos, PDFs/docx, dumps y `storage/` están bloqueados.
- **Chequeo previo al commit:** `.claude/skills/git-workflow/check-secrets.sh` (llaves, `.env`, correos y
  teléfonos reales, fotos, archivos grandes).
- **Contraseñas** con Argon2; sesiones con JWT en cookie; el cliente solo ve sus propias galerías
  (`Backend/middlewares/client-scope.middleware.js`). Ver skill `auth-gallery`.
- Los datos de ejemplo usan `example.com` y teléfonos `(480) 555-01xx`.

## Reportar una vulnerabilidad

Abre un *security advisory* privado en GitHub (pestaña **Security** → **Report a vulnerability**) o escribe
al mantenedor por el correo de su perfil. Por favor no publiques detalles en un issue abierto.
