---
tema: portal-cliente
fecha: 2026-10-19
---

# Auditoría de `client/`: qué falta del lado del cliente

Parte de [[portal-cliente]]. Revisión pedida por Alexis el 2026-10-19: comparar el código real de `client/` y
`/api/client/*` contra `client/handoff.md` (última actualización 2026-10-10) y `docs/portal-cliente-plan.md`.
**No se cambió código**; solo se leyó.

## Qué está hecho (confirmado en el código)

- Login único `/login`, `/client/welcome` (primera contraseña), Galleries, Gallery con visor completo
  (zoom, compare, rotar/resize para la descarga, info), favorito único, descargas web / original / ZIP,
  Profile de solo lectura, EN/ES. Rutas en `client/src/app/router.jsx`.
- API montada en `Backend/routes/client-portal.routes.js`: `me`, `galleries`, `photos`, `favorite`, `download`,
  `download-edited`, `download.zip`, `downloads`, `info`. Nada de bookings, payments, prefill ni `PATCH /me`.
- `Backend/middlewares/client-scope.middleware.js` ya acepta `X-Preview-Client` (solo GET/HEAD).

## Qué falta

**Pantallas inexistentes** (`TABS` en `client/src/app/layout/AppShell.jsx` solo tiene Galleries y Profile):
1. **Bookings**: línea de tiempo, próxima sesión con cuenta regresiva, Add to calendar (.ics). Falta `GET /api/client/bookings`.
2. **Payments**: anillo pagado/total, recibo, instrucciones Zelle/Cash App. Falta `GET /api/client/payments`.
3. **Contacto**: "Text Areli" (`sms:` + E.164) e Instagram (P14).
4. **Book again**: botón + `GET /api/client/me/booking-prefill` (plan §8).
   Según el plan §1.3, las pantallas de Bookings/Payments se diseñan primero en el lienzo ([[diseno-ui]]) para que Alexis las apruebe.

**Perfil** (`client/src/app/pages/profile/index.jsx`):
5. Editable con `PATCH /api/client/me` (nombre, teléfono con libphonenumber-js capturando `P2002`, Instagram),
   guardar idioma en `Client.locale`, y **pantalla para cambiar contraseña** (el backend ya la acepta pidiendo la actual).
6. Defensa CSRF de §6.5 (comprobar `Origin` + `Content-Type: application/json` en escrituras): no se encontró en el Backend.

**Preview as client** (plan §5):
7. Admin: `previewAsClient.ready` sigue apagado en `admin/src/app/pages/galleries/integrations.js`.
   Cliente: leer `?preview=` en `client/src/app/guards.jsx` (marcador `INTEGRATION(preview-as-client)`), mandar
   `X-Preview-Client` desde `client/src/utils/axios.js`, banda "Previewing as…", corazón deshabilitado, galerías en DRAFT.

**Cuentas y correos:**
8. Restablecer contraseña: el login solo dice "Text or message Areli" (`PENDING(password-reset)` en `client/src/app/pages/auth/SignIn.jsx`).
9. "Create login" en el admin para reemplazar `Backend/scripts/dev-client-login.js`.
10. Correo de entrega first / returning (P7, plan §7).

**Descargas pendientes:**
11. "Save to Photos" en iPhone (`navigator.share({ files })` en lotes de ~20), probado en dispositivo real.
12. Errores del ZIP (429 `ZIP_BUSY`, 403) no se muestran: la descarga va por un iframe oculto.
13. Botón propio "ZIP de favoritas" (la API ya acepta `favorites=1`; no se revisó si `client/src/components/DownloadMenu.jsx` ya lo ofrece).

**Deuda y verificación:**
14. `shared/` **no existe**: el visor del cliente sigue siendo copia del admin (`ZoomStage`, `useEditedPreview`, `viewerEdits`, `explain`).
15. No existen `docs/paridad-admin-cliente.md` ni `Backend/scripts/test-client-isolation.js` (ambos son trabajo futuro del plan §9–§10).
16. Casi nada visto en el navegador con sesión real de cliente (favoritos, descargas, cambio de contraseña, doble toque, modo oscuro).
17. Dockerfile/nginx de `client/` sin probar; la imagen de producción necesita `perl` para `exiftool`.
18. Opcional: PWA (manifest + ícono); hoy solo hay metas de Apple en `client/index.html`.

**Fuera del portal pero ligado:** galerías PASSWORD / PUBLIC_LINK (`/g/<slug>`), página pública `/book` con el prefill,
texto `USAGE_TERMS` de `Backend/services/photo-rights.js`.

## Verificado vs. no verificado

| Pieza | Prueba |
|---|---|
| Rutas y pestañas del portal | lectura de `client/src/app/router.jsx` y `AppShell.jsx` |
| Endpoints existentes | lectura de `Backend/routes/client-portal.routes.js` |
| `shared/`, doc de paridad, script de aislamiento | `ls` → no existen |
| Marcadores pendientes | `grep` de `INTEGRATION` / `PENDING` en `client/src` |

**Lo que NO está verificado:** nada se ejecutó ni se abrió en el navegador; no se corrió eslint ni build (ver trampa).

## Trampas descubiertas

- **`client/` no tiene `node_modules`** (2026-10-19): `npx eslint src` falla con `Cannot find package '@eslint/js'` y
  `npm run dev` tampoco arrancará. Correr `npm install` en `client/` antes de cualquier cosa.
- `client/handoff.md` §4 todavía lista como pendiente "original sin GPS", pero la decisión vigente de Alexis es
  **conservar GPS** (§5 del mismo handoff). Lo que sigue pendiente es solo lo de la lista de arriba.

## Siguiente paso

Orden sugerido a Alexis (sin respuesta todavía): `npm install` + revisión en el navegador (preguntar antes de usar Chrome)
→ Profile editable + cambiar contraseña → Bookings y Payments (diseño primero) → Preview as client → `shared/`,
reset de contraseña y correos.

---
Relacionado: [[portal-cliente]] · [[2026-10-09-portal-cliente-primer-corte]] · [[2026-10-09-galeria-seleccion-favoritos-descargas]] · [[admin]]
