---
name: frontend
description: Astro + React-islands conventions for the site — public landing pages, admin dashboard, and client gallery views. Use when reading or editing anything under Frontend/src/ — pages, components, stores, forms.
---

# Frontend — photosByArelli

Astro (static/SSR pages) with React islands (`@astrojs/react`) for anything interactive —
same pattern as `planner/Frontend`. Tailwind CSS for styling, Zustand for client-side state,
`react-hook-form` + Yup for forms, axios for the backend client.

## Layout

```
Frontend/src/
├── pages/              # Astro routes — public landing pages + /login, /admin/*, /gallery/*
├── layouts/             # shared page chrome (Layout.astro — SEO head, nav, footer)
├── components/
│   ├── landing/          # hero, services section, testimonials — mostly static .astro
│   ├── auth/              # LoginForm, PasswordChangeForm — React islands
│   ├── admin/              # client list, upload dropzone, gallery manager — React islands
│   └── gallery/            # photo grid, lightbox, download button — React islands
├── stores/               # Zustand: authStore.js, galleryStore.js
├── backend/               # axios client + API call wrappers (connection.js, api_model.js)
├── data/                 # site.js, services.json — see site-config skill
├── hooks/, utils/, styles/
```

## When to use `.astro` vs a React island

- Static content with no client-side interaction (landing sections, footer, SEO head) → plain
  `.astro` component. Cheapest to ship — zero JS to the client.
- Anything with state, forms, or auth-gated behavior (login, upload dropzone, photo grid with
  lightbox/download, admin tables) → a React component, mounted as an island
  (`client:load`/`client:visible` — pick the narrowest hydration directive that still works;
  `client:visible` for below-the-fold interactive sections like a testimonials carousel,
  `client:load` for anything above the fold or auth-critical like the login form).
- Don't reach for a React island by default — check whether the interactivity is real state or
  just a CSS `:hover`/transition first.

## State (Zustand)

One store per concern: `authStore` (current user, login/logout actions, calls the auth API),
`galleryStore` (loaded photos, selection state for bulk download). Components read via the
store hook, never prop-drill auth state through multiple layers.

## Forms

`react-hook-form` + Yup schema via `@hookform/resolvers`. Co-locate the schema next to the form
component (`LoginForm/schema.js`) when the form is non-trivial (client creation, photo upload
metadata).

## Dates and phone numbers (project rule — see /CLAUDE.md)

- Dates: **Luxon** only. Store/return UTC; compute and display in `America/Phoenix`. No `dayjs`,
  `moment`, `Date` arithmetic or hand-rolled `Intl`. Only call `toJSDate()` where a library needs
  a `Date` (Prisma).
- Phones: **libphonenumber-js** only, default country US. Save `phone` as typed and `phoneE164`
  normalized; match returning clients on `phoneE164`. Re-validate with `isValid()` server-side.

## Dark mode: contraste de estados seleccionados (project rule)

En el admin, en modo oscuro `primary` es casi blanco (`--pba-primary-500: #f2f2f0`). Todo elemento que use
`bg-primary-*` / `bg-this` / `bg-this-light` como fondo de "seleccionado" o "activo" **no puede llevar
`text-white`** (ni un SVG blanco) en dark: el texto/palomita desaparece.

- Usa texto oscuro en dark (`dark:text-gray-900`, o `fill`/SVG `#151515`).
- Declara color **y** fondo explícitos para cada estado (reposo, hover, focus), no solo en hover. Un estado
  sin `background` en reposo deja texto oscuro sobre fondo oscuro.
- Casos ya corregidos (úsalos de referencia): `components/ui/Pagination/PaginationControl.jsx` (página
  activa), `styles/app/forms/checkbox.css` (palomita/guion), `styles/app/vendors/datepicker.css`
  (fechas seleccionadas / inicio y fin de rango).
- **Si un agente ve esta discrepancia** (texto o ícono invisible por contraste en dark o light, en tablas,
  filtros, selects, calendarios, tabs, badges, etc.), **debe corregirla en el momento**, aunque no sea lo que
  se le pidió, y revisar los demás componentes que usan el mismo patrón.

## Admin: soportar las dos opciones de "Sections" (project rule)

El Customizer tiene **Sections → Hairlines | Shadow** (`theme.cardSkin`: `bordered` | `shadow-sm`). Todo diseño
nuevo o rediseñado del admin debe implementar **ambas**:

- Envuelve las secciones en `<Section>` y usa `useSectionSkin()` (`isShadow`) — en
  `admin/src/components/shared/layout/`.
- Hairlines: plano, separado por líneas `border-line`. Shadow: tarjeta suave (`rounded-xl bg-paper shadow-soft`,
  en dark `ring-1 ring-line` porque la sombra no se ve), sin líneas alrededor.
- Referencia: `app/pages/bookings/index.jsx` (tabs + contenido) y `StatRow.jsx`.
- Revisa las dos opciones en claro y oscuro antes de dar el trabajo por terminado.

## Dependencias de módulos que aún no existen (project rule)

Si una función depende de otro módulo no construido (Correos, Galleries…): no la finjas ni la omitas.
Déjala como interruptor (`ready: false`) con la acción deshabilitada y una nota, márcala en el código con
`INTEGRATION(nombre)` y documéntala para el siguiente agente (contrato propuesto, dónde se conecta, qué cambia
al activarla) **declarando las dudas abiertas**. Patrón: `admin/src/app/pages/bookings/booking/integrations.js` y
`docs/bookings-page-integraciones.md`. Anótalo también en `wiki/` (skill `bitacora`).

## Gallery/upload UI specifics

- Photo grid: lazy-load thumbnails (`astro:assets` `<Image />` where static, native
  `loading="lazy"` where dynamic from the API) — client galleries can have 100+ photos.
- Lightbox for full-size preview before download — never force a download to preview a photo.
- Upload (admin): drag-and-drop + multi-file select, per-file progress, and a clear
  success/failure state per file (a batch upload of 50 photos should show which ones failed, not
  just "upload complete" or a single opaque error).
- Every async view (gallery loading, client list loading) ships a skeleton/loading state — never
  a blank screen or spinner-only for list/grid content.

## Language

Public landing copy matches whatever language the client's business operates in (currently
English, per the pricing sheet) — admin/client portal UI text should match. If the project later
goes bilingual (en/es), that's a deliberate decision to make with the user, not something to
half-introduce by mixing languages in new components.
