---
tema: landing
estado: activo
---

# Landing (sitio público)

Sitio público en `Frontend/` (Astro estático, servido en la raíz del dominio): inicio, servicios, una
página por servicio, `/book` (solicitud en 5 pasos), políticas, privacidad y términos, en inglés (`/`) y español
(`/es/`). Diseño: pantallas `Main`, `LandingMobile`, `Services` y `Service*` del lienzo ([[diseno-ui]]).
Login: enlaza al login único de [[portal-cliente]]. Handoff detallado: `Frontend/handoff.md`.

## Estado actual

- Todas las páginas construidas y compilando (25 HTML). **Sin revisar en el navegador.**
- `/book` crea solicitudes reales (`REQUEST`, `WEBSITE`) por `/api/public/*` desde el 2026-11-10
  (`docs/landing-book-integracion.md`, `docs/api-public-booking.md`). Si la API no responde, ofrece SMS / correo / Instagram.
- `PUBLIC_INDEXABLE=false` hasta que el dominio oficial esté activo (robots `noindex`).

## Entradas de bitácora

- [[2026-10-26-landing-completa]] — landing EN/ES, SEO/GEO, fotos web en el repo, CSP, póliza
- [[2026-11-10-book-flujo-real]] — `/book` de 5 pasos, API pública, cliente que vuelve, correos, sin React

## Decisiones clave

- Fotos: copias web en el repo (decisión de Alexis, 2026-10-26), preparadas por
  `Frontend/scripts/prepare-photos.mjs`. Ver [[2026-10-26-landing-completa]].
- Idiomas: `/` inglés y `/es/` español con hreflang; detección del idioma del navegador en la primera
  visita; la preferencia se comparte con el portal (misma clave de `localStorage`).
- Sin framework de UI en la landing (sin React): scripts pequeños empaquetados, para una CSP estricta.
