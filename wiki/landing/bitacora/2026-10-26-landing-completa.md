---
fecha: 2026-10-26
tema: landing
tipo: implementacion
---

# Landing completa (EN/ES, SEO, póliza)

Parte de [[landing]]. Pedido de Alexis: construir la landing del lienzo de diseño, un solo login para
admin y clientes, SEO "sí o sí", conexión segura al backend, póliza, i18n con detección de idioma,
`/book` simple (lo termina otro agente) y un único archivo con los datos del negocio.

## Qué se hizo

| Pieza | Dónde |
|---|---|
| Rutas EN + ES (`/`, `/services/`, `/services/<slug>/`, `/book/`, `/policies/`, `/privacy/`, `/terms/`, 404) | `Frontend/src/pages/`, `Frontend/src/pages/es/`; cada página es una vista de `Frontend/src/views/` con `lang` |
| Textos | `Frontend/src/i18n/en.json`, `Frontend/src/i18n/es.json`; helpers en `Frontend/src/i18n/index.ts` |
| Datos del negocio | `shared/site.js` (nuevo: `AREA`, `BRAND.ownerFullName`) y `shared/services.js` (nuevo: precios, paquetes, extras, números de la póliza) |
| SEO | `Frontend/src/layouts/Layout.astro` (canonical, hreflang, OG 1200×630, robots), `Frontend/src/seo/jsonld.ts` (LocalBusiness + Service + Offer + BreadcrumbList + FAQPage), sitemap con hreflang, `robots.txt` |
| Fotos | `Frontend/scripts/prepare-photos.mjs` → `Frontend/src/assets/photos/`; alt EN/ES y ubicación en `Frontend/src/data/photos.ts` |
| Sesión | `Frontend/src/components/site/AccountLink.astro`: `GET /api/auth/me` (cookie httpOnly, mismo origen) cambia "Client login" por "My galleries" o "Admin" |
| Idioma | `Frontend/public/lang.js` (redirige a `/es/` si el navegador está en español o se eligió antes) |
| Seguridad | `Frontend/nginx.conf`: CSP `script-src 'self'`, `connect-src 'self'`, `frame-ancestors 'self'`, Permissions-Policy |

## Decisiones

- **Fotos en el repo** (Alexis, 2026-10-26): 48 copias web (lado mayor ≤ 2000 px), **sin EXIF/GPS**, solo
  `Copyright` y `Artist`. Excepción en `.gitignore` y en `check-secrets.sh`; ver `docs/derechos-imagenes.md`.
- **`/book` simple** (Alexis): nada se guarda; los botones arman el mensaje. `INTEGRATION(booking)` en
  `Frontend/src/views/BookView.astro`.
- **Idiomas `/` y `/es/`** (Alexis): dos versiones estáticas indexables.
- **Sin React en la landing** (agente): el plan decía islas React, pero Astro mete scripts inline de
  hidratación y eso rompe una CSP estricta. Moments, filtro del portafolio, AccountLink y /book son
  `<script>` de Astro (archivos en `/_astro/`, `vite.build.assetsInlineLimit: 0`).
- **`@type` LocalBusiness + ProfessionalService**: `PhotographyBusiness` (lo que había) no existe en
  schema.org.
- **WebP y no AVIF**: con la calidad usada, el AVIF salía más pesado que el WebP.
- **La póliza publica el texto del PDF** ("el depósito pasa a la nueva fecha una vez"), aunque el admin no
  limita los cambios de fecha. Pendiente de confirmar con Areli.

## Trampas

- `shared/site.js` se importa como **namespace** en `Frontend/src/data/site.ts`: si el `site.js` del
  secreto `SITE_JS_B64` de CI no tiene `AREA`, un `import { AREA }` rompe el build (Rollup
  `MISSING_EXPORT`). Así usa valores por defecto. Conviene igual volver a codificar el secreto.
- `shared/services.js` repite los precios de `database/seeds/data/catalog.js`: cambiar los dos juntos.
- El script de fotos se corre solo en la máquina del dueño (las originales no están en git).
- En desarrollo, `astro dev` hace proxy de `/api` a `http://localhost:4000` (`API_ORIGIN`).

## Verificación

| Qué | Cómo | Resultado |
|---|---|---|
| Compila | `npm run build` en `Frontend/` | 25 páginas, sin errores |
| Un `<h1>`, `lang`, hreflang, canonical | revisión de `dist/*.html` | OK en las páginas revisadas |
| JSON-LD | `json.loads` del bloque en `dist/` | válido; nodos esperados por página |
| Sin JS inline (CSP) | `grep '<script'` en `dist/` | solo archivos de `/_astro/`, `/lang.js`, y bloques JSON |
| Metadatos de fotos | `sharp().metadata()` | solo Copyright + Artist |
| Archivos prohibidos | `check-secrets.sh --all` | sin avisos de la landing |

**No verificado:** vista en el navegador (390 / 834 / 1280), Lighthouse, Rich Results Test, el cambio
de "Client login" con una sesión real, el redirect de idioma en un navegador en español, la imagen
Docker con las fotos.

## Dudas abiertas

1. Consentimiento de las personas que salen en las fotos publicadas (Areli).
2. Reagendar: ¿una vez (PDF) o sin límite (admin)?
3. Zona de servicio exacta para SEO local (`AREA.areaServed`, hoy vacío → "Arizona").
4. Privacidad y términos son un borrador en lenguaje simple; que Areli los revise.
