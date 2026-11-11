# Handoff — Landing pública (`Frontend/`)

Última actualización: **2026-11-10** (`/book` real: 5 pasos contra `/api/public/*`, ver `docs/landing-book-integracion.md`). Para el siguiente agente que trabaje en el sitio público, en `/book`
o en el SEO. Bitácora: `wiki/landing/bitacora/2026-10-26-landing-completa.md` · tema `wiki/landing/README.md`.

## 0. Lee primero (en este orden)

1. `CLAUDE.md` (raíz): fechas siempre con **Luxon** (`America/Phoenix`) y teléfonos siempre con **libphonenumber-js**.
2. `handoff.md` (raíz): estado general del proyecto.
3. Skills: `frontend`, `landing-seo`, `site-config` y `git-workflow`.
4. Este archivo.

**Preferencias de Alexis (usuario):** pregunta **antes** de usar el navegador (Claude in Chrome), incluso en
localhost. No hagas commit ni push sin permiso. "Menos es más": no repitas texto en la misma pantalla. Landing y
portal en EN + ES; el admin solo en inglés.

## 1. Qué se pidió

> Crear toda la landing en `Frontend/` siguiendo el diseño de Claude Design; un solo login para `client/` y
> `admin/`; optimizada para SEO sí o sí; conectar con el backend de forma segura; crear la póliza; i18n
> con detección del idioma del usuario; `/book` simple (lo termina otro agente); reutilizar lo que sirva de
> `REACT-COMPONETS` con nuestra UI; un solo archivo con teléfono, Areli, etc.

Decisiones que tomó Alexis durante el plan (2026-10-26):

| Pregunta | Respuesta |
|---|---|
| ¿Cómo llegan las fotos al sitio? (repo público, originales ignoradas) | **Copias web en el repo**, con excepción en `.gitignore` |
| ¿Qué dejo en `/book`? | **Página de contacto**: SMS / correo / Instagram con el mensaje prellenado, sin escribir en la BD |
| ¿Cómo manejo los idiomas? | **`/` en inglés y `/es/` en español**, con hreflang y detección en la primera visita |

Plan aprobado: `~/.claude/plans/wondrous-sparking-sundae.md` (local, fuera del repo).

## 2. Cómo levantarlo

```bash
cd Frontend
npm run dev        # http://localhost:4321  (hace proxy de /api → http://localhost:4000, cambiable con API_ORIGIN)
npm run build      # dist/ — 25 páginas
npx astro preview  # sirve dist/
```

- `PUBLIC_SITE_URL` (al compilar): dominio para canonical, hreflang, OG y sitemap. Por defecto
  `http://localhost:4321`; en Docker/CI `https://areli.grid.nimbuscloud.mx`.
- `PUBLIC_INDEXABLE=true` (al compilar): abre el sitio a buscadores. **Hoy `false`**: `noindex` y
  `robots.txt` con `Disallow: /`, hasta que el dominio oficial esté activo.
- Para ver el cambio de "Client login" a "My galleries"/"Admin": Backend en `:4000` + iniciar sesión en
  `http://localhost:5175/login` (`client/`); la cookie vale para cualquier puerto de localhost.

## 3. Rutas

Cada página de `src/pages/` (EN) y `src/pages/es/` (ES) solo envuelve una vista de `src/views/` con `lang`.

| EN | ES | Vista | Pantalla del lienzo |
|---|---|---|---|
| `/` | `/es/` | `HomeView.astro` | `Main` + `LandingMobile` |
| `/services/` | `/es/services/` | `ServicesView.astro` | `Services` |
| `/services/<slug>/` ×6 | `/es/services/<slug>/` | `ServiceView.astro` | `ServiceGraduation`, `ServiceSolos`, `ServiceFamily`, `ServiceMaternity`, `ServiceQuince`, `ServiceBranding` |
| `/book/` | `/es/book/` | `BookView.astro` + `views/book/*.ts` | `Booking`, `BookingDate`, `BookingLocation`, `BookingDetails`, `BookingReview`, `BookingConfirmed` |
| `/policies/` | `/es/policies/` | `PoliciesView.astro` | la póliza (PDF del negocio + bloque "Policies" de `Services`) |
| `/privacy/`, `/terms/` | `/es/…` | `LegalView.astro` (`doc`) | no estaban en el lienzo; borrador nuevo |
| `404` | — | `NotFoundView.astro` | — |

Slugs = los del catálogo: `graduation`, `solos`, `family-couples`, `maternity`, `birthdays-parties`, `branding`.

`/login`, `/client/`, `/admin/` y `/api/` **no** son de este contenedor (los enruta el nginx de borde).

## 4. Mapa de archivos

### Datos (una sola fuente)

| Archivo | Qué tiene |
|---|---|
| `shared/site.js` (git-ignorado, datos reales) + `shared/site.example.js` (plantilla) | `BRAND` (+ **`ownerFullName`**, nuevo), `CONTACT`, `SOCIAL`, **`AREA`** (nuevo: región y ciudades para SEO local), `PAYMENTS`. Es "el archivo con teléfono, Areli, etc." que pidió Alexis. |
| `shared/services.js` (**nuevo**, en git) | `SERVICES` (slug, precio "desde", paquetes), `EXTRAS` (+$15 outfit, +$50/30 min), `POLICY` (50 %, 48 h, 30 min, 18 años). **Mismos precios que `database/seeds/data/catalog.js`: cambiar los dos.** |
| `src/data/site.ts` | Importa `shared/site.js` como **namespace** (con valores por defecto) y arma `SHARED_VARS`: las variables que usan todos los textos (`{brand}`, `{region}`, `{outfit}`, `{deposit}`, precios…). `LEGAL_UPDATED` = fecha de los textos legales. |
| `src/data/photos.ts` | Las 48 fotos: alt EN/ES, servicio, foco; y dónde sale cada una (`HERO`, `OG_PHOTO`, `MOMENTS`, `PORTFOLIO`, `SERVICE_PHOTOS`). |

### Textos e idioma

| Archivo | Qué hace |
|---|---|
| `src/i18n/en.json`, `src/i18n/es.json` | Todo el texto del sitio, mismas claves en los dos. Lleva `{variables}`; algunas cadenas llevan `<em>` y se pintan con `set:html`. |
| `src/i18n/index.ts` | `useT(lang, vars)` → `t()` (cadenas) y `tl()` (listas/objetos); `localizePath`, `stripLang`, `HTML_LANG`, `LANG_STORAGE_KEY`. |
| `public/lang.js` | Script clásico en `<head>`: en una página en inglés, si se eligió español antes o el navegador está en español → `/es/…`. Una URL `/es/` siempre se respeta. El switch guarda la elección en `pba-client-lang`, **la misma clave que usa el portal** (`client/src/i18n/config.js`). |

### Layout, SEO y componentes

| Archivo | Qué hace |
|---|---|
| `src/layouts/Layout.astro` | `<head>`: título, descripción, canonical, hreflang en/es/x-default, robots, OG 1200×630 (generada de la foto), Twitter, JSON-LD; skip link, Header, Footer. |
| `src/seo/jsonld.ts` | `businessNode` (`LocalBusiness` + `ProfessionalService`, sin dirección, `areaServed`, `priceRange`, catálogo de ofertas, fundadora), `serviceNode` (Service + Offer por paquete), `breadcrumbNode`, `faqNode`. |
| `src/pages/robots.txt.ts` | Bloquea `/admin/`, `/client/`, `/login` y `/api/` (o todo, si no es indexable). |
| `astro.config.mjs` | `i18n` de Astro, sitemap con hreflang (sin 404), `trailingSlash: "always"`, alias `@shared`, `assetsInlineLimit: 0`, proxy `/api` en dev. Se quitó la integración de React. |
| `src/styles.css` | Tokens del sistema de diseño en `@theme` (ink `#151515`, muted `#6e6e6e`, line `#e7e5e1`, soft `#f6f5f3`), EB Garamond **self-hosted** (`@fontsource`), clases `.eyebrow`, `.btn`, `.btn-primary`, `.btn-outline`, `.link-line`, `.print-frame`, `.page-x` (16/32/48 px), `.container-site` (1280 px). |
| `src/components/site/Header.astro` | Marca, nav, `LanguageSwitch`; en móvil "Menu" con `<details>` (sin JS). |
| `src/components/site/Footer.astro` | Logo, contacto (teléfono con libphonenumber-js), páginas, servicios, privacidad/términos, año con Luxon. |
| `src/components/site/AccountLink.astro` | "Client login" → `/login`. Con sesión, `GET /api/auth/me` lo cambia a "My galleries" (`/client/`) o "Admin" (`/admin/`). Una sola petición por página. |
| `src/components/site/Photo.astro` | `<Picture>` WebP con `widths`/`sizes`, `width`/`height` reales, lazy salvo `priority`, alt por idioma, gris opcional. |
| `src/components/site/ServiceRows.astro` | Lista de servicios con precio (grid de 3 en escritorio o filas). |
| `src/components/site/LanguageSwitch.astro` | ES / EN. |
| `src/components/home/Hero.astro`, `Moments.astro`, `Portfolio.astro` | Hero; tira de fotos que avanza con el scroll y un temporizador (Pause/Play, ←/→, respeta `prefers-reduced-motion`; 10 frames en escritorio, 6 en móvil); portafolio en columnas con filtro por servicio. |
| `src/components/service/PolicyList.astro` | Las políticas como lista de definiciones (en `/services/` y `/policies/`). |
| `src/utils/phone.ts`, `date.ts`, `money.ts` | `formatPhone`/`telHref`/`smsHref` (libphonenumber-js, igual que `client/`), `studioNow`/`formatLongDate` (Luxon), `money()` ("$160"). |

### Fotos

- `scripts/prepare-photos.mjs` (correr desde `Frontend/`, **solo en la máquina del dueño**, nunca en CI):
  `node scripts/prepare-photos.mjs ["../Photos By Areliii LLC"]`. Gira, reduce a ≤ 2000 px, **borra todos los
  metadatos** y escribe solo `Copyright` + `Artist`. La lista de fotos está en el script.
- Salida: `src/assets/photos/*.jpg` (48, ~13 MB). Astro hace las versiones WebP al compilar.
- Para **agregar o cambiar una foto**: añadirla a `PHOTOS` en el script, correrlo, añadir su entrada en
  `META` de `src/data/photos.ts` (alt EN/ES y servicio) y ponerla donde corresponda (`PORTFOLIO`, `SERVICE_PHOTOS`…).
  `photos.ts` falla al compilar si falta un archivo.

### Seguridad

- `nginx.conf`: `Content-Security-Policy` con `script-src 'self'` (el sitio no lleva JS inline; los bloques
  JSON-LD/JSON no se ejecutan), `style-src 'self' 'unsafe-inline'` (hay estilos inline de `object-position` y
  `flex`), `connect-src 'self'`, `frame-ancestors 'self'`, `object-src 'none'`; `Permissions-Policy`;
  `error_page 404 /404.html`; caché inmutable para `/_astro/`.
- La landing no lleva secretos ni tokens; la sesión es la cookie httpOnly del mismo origen.
- Contacto con la API: `GET /api/auth/me` (header) y, desde el 2026-11-10, `/api/public/catalog`, `/availability` y
  `POST /api/public/bookings` en `/book` (mismo origen, sin cookie: `credentials: "omit"`). Límites en nginx y Express
  (`docs/api-public-booking.md`).

### Fuera de `Frontend/`

| Archivo | Cambio |
|---|---|
| `.gitignore` | `!Frontend/src/assets/photos/*.jpg` (las originales siguen ignoradas) |
| `.claude/skills/git-workflow/check-secrets.sh` | permite `Frontend/src/assets/photos/<nombre>.jpg` |
| `docs/derechos-imagenes.md`, `docs/publicacion.md` | las fotos de la landing como imágenes publicadas a propósito |
| `docs/landing-book-integracion.md` (nuevo) | qué falta en `/book` y el contrato propuesto |
| `handoff.md` (raíz) | fila de `Frontend/` y siguiente trabajo |
| skills `frontend`, `landing-seo`, `site-config` | idioma decidido, landing sin React, tipo de JSON-LD, `AREA`, `services.js` |
| `wiki/landing/` (tema nuevo) + `wiki/README.md` | bitácora |
| `Frontend/package.json` | + `luxon`, `libphonenumber-js`, `@fontsource/eb-garamond`, `sharp` |

## 5. Decisiones del agente (y por qué)

- **Sin React en la landing.** El plan decía islas React, pero Astro inyecta scripts inline para hidratarlas y
  eso rompe una CSP con `script-src 'self'`. Todo lo interactivo son `<script>` de Astro empaquetados a
  `/_astro/*.js` (`vite.build.assetsInlineLimit: 0`). Las dependencias React antiguas siguen en `package.json`
  sin usarse; se pueden quitar.
- **De `REACT-COMPONETS` no se copió nada**: sus componentes son del template Tailux (React). Se reutilizaron
  los helpers de `client/` (teléfono, patrón de fecha, clave de idioma) y la UI es la del lienzo.
- **`LocalBusiness` + `ProfessionalService`**: `PhotographyBusiness`, que usaba la versión anterior, no existe en schema.org.
- **WebP, no AVIF**: con la calidad usada, el AVIF salía más pesado que el WebP.
- **`h1` del inicio**: el diseño no tiene un título visible; el `h1` es la línea "Portrait photographer · Arizona" con
  el nombre de la marca solo para lectores de pantalla.
- **Frase citable por servicio** (`services.<slug>.fact`): sirve de meta description y aparece en "Pricing";
  es la que pueden citar Google o un motor de IA.
- (2026-11-10, reemplaza la nota de abajo) **`/book` sí lleva libphonenumber-js, yup y Luxon en el navegador** (~250 KB sin
  comprimir, solo en esa página): el formulario valida el teléfono con `isValid()` como pide `CLAUDE.md`.
- ~~**`/book` sin libphonenumber en el navegador**~~: el enlace `sms:` se arma al compilar; el bundle de la página
  solo lleva Luxon (~23 KB gzip).
- **"View full portfolio"** apunta a `/services/` (no hay una página de portafolio aparte), como en el lienzo móvil.
- **Privacidad y términos** son textos nuevos, cortos y en lenguaje simple, basados en cómo funciona el sistema
  (cookie de sesión, galerías privadas, borrado al vencer, pagos fuera del sitio). No son asesoría legal.

## 6. Trampas

- **CI y `shared/site.js`**: en CI ese archivo sale del secreto `SITE_JS_B64`. `src/data/site.ts` lo importa
  como namespace con valores por defecto, para que un `site.js` sin `AREA`/`ownerFullName` **no rompa el build**
  (un `import { AREA }` daría `MISSING_EXPORT`). Aun así hay que **volver a codificar el secreto** para que
  producción muestre la fundadora y la zona.
- Si importas algo de `shared/services.js` en un `.astro`, pásalo por `src/data/site.ts` (ahí se reexporta).
- Los textos de `es.json`/`en.json` deben tener las **mismas claves**; `t()` cae al inglés si falta una y lanza
  error si la clave no es una cadena.
- Un precio cambia en **`shared/services.js` y en `database/seeds/data/catalog.js`** (el admin cobra lo de la BD).
- Al cambiar los textos legales, actualiza `LEGAL_UPDATED` en `src/data/site.ts`.
- Las fotos con `gray: true` se ven en blanco y negro solo por CSS (la foto es a color).

## 7. Qué se verificó y qué no

| Qué | Cómo | Resultado |
|---|---|---|
| Compila | `npm run build` | 25 páginas, sin errores |
| Rutas | `astro preview` + `curl` a 11 rutas | 200; ruta inexistente → 404 |
| Un `h1`, `lang`, canonical, hreflang | revisión de `dist/` | OK en inicio, servicio ES y `/book` |
| JSON-LD | parseo de `dist/` | válido; nodos esperados por página |
| Sin JS inline | `grep '<script'` en `dist/` | solo `/_astro/*.js`, `/lang.js` y bloques JSON |
| Metadatos de las fotos | `sharp().metadata()` | solo Copyright + Artist |
| Archivos prohibidos | `check-secrets.sh --all` | nada de la landing (los avisos que salen son de `Backend/emails` y `admin/settings`, ya existían) |

**Sin verificar:**
- La vista en un navegador real (390 / 834 / 1280) y la fidelidad visual con el lienzo. Pedir permiso a Alexis antes.
- Lighthouse y Rich Results Test.
- El cambio de "Client login" con una sesión real.
- La redirección de idioma en un navegador en español.
- La imagen Docker (`Frontend/Dockerfile`) con las fotos y `sharp` en Alpine.
- La CSP servida por el nginx real.

## 8. Pendientes

**Siguiente agente**
1. ~~Flujo real de `/book` con la API~~ **hecho 2026-11-10** (`docs/landing-book-integracion.md`). Mantener `?service=&package=`.
2. Revisar en el navegador y ajustar los espaciados contra el lienzo (con permiso).
3. ~~Quitar las dependencias sin uso~~ **hecho 2026-11-10**: fuera `@astrojs/react`, `react`, `react-dom`, `axios`, `zustand`,
   `react-hook-form`, `@hookform/resolvers` y la config JSX de `tsconfig.json`; `yup` se queda (valida `/book`).

**Alexis / Areli**
1. Consentimiento de las personas que aparecen en las fotos publicadas (hay menores).
2. Reagendar: la póliza dice "una vez" (PDF); el admin no tiene límite. ¿Cuál vale?
3. Ciudades para el SEO local (`AREA.areaServed` en `shared/site.js`; hoy solo "Arizona").
4. Revisar privacidad y términos.
5. Volver a codificar `SITE_JS_B64` y, con el dominio oficial, compilar con `PUBLIC_INDEXABLE=true`.
6. Usuarios de Zelle y Cash App (`PAYMENTS`), si se quieren mostrar.
