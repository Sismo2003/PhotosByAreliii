---
name: site-config
description: Convention for shared/site.js (brand/contact/social/payments, repo root) and services.json (pricing/services) — the single source of truth for business info, consumed by both the public landing and the admin/client portal. Use whenever creating or editing business info, contact details, social links, or pricing anywhere in the app, or when scaffolding these files for the first time.
---

# site-config — business data, one source of truth

Every page (landing, admin, emails, SEO metadata, structured data) reads business info from
**one place**. Never hardcode a phone number, price, or social link inline in a component —
import it from here.

## Files

```
shared/                 # repo root — ONE copy for client/, Frontend/ (Astro landing) and Backend/
  package.json          # { "type": "module" } so Node reads it as ESM
  site.js               # BRAND, CONTACT, SOCIAL, PAYMENTS — plain JS, no dependencies
  services.json         # pricing/services (when it is created, it goes here too)
```

Decided by Alexis (2026-10-19): phone, Instagram, Zelle and Cash App live in this file, not in
`StudioSettings` (those two columns stay unused) and not in a per-app `src/data/site.js`.
Changing a value = edit `shared/site.js` + deploy.

**Public repo:** `shared/site.js` holds the REAL business data and is git-ignored (like `.env`). The
tracked template is `shared/site.example.js` (example values, same shape). When you add or rename a
key, update **both** files. A fresh clone runs `npm run setup:site` to create `shared/site.js` from
the template. Never put real data in `site.example.js`.

## `shared/site.js` shape (read the file for current values)

- `BRAND` — `name`, `legalName`, `owner` ("Areli"), `domain`.
- `CONTACT` — `phoneE164` only (`"+14805550100"`); display it with `formatPhone()` and link it with
  `telHref()` / `sms:` from each app's `utils/phone.js` (project rule: libphonenumber-js). `emails`.
  No studio address, ever.
- `SOCIAL` — `instagramHandle`, `instagram` (full URL).
- `PAYMENTS` — `zelle`, `cashApp`. `""` = unknown → the UI hides that method; never invent one.

Everything in it ends up in a browser bundle: **public data only** (no keys, no internal emails).

## Importing it

| App | How |
|---|---|
| `client/` | `import { CONTACT } from "@shared/site"` — alias in `vite.config.js` (`resolve.alias` + `server.fs.allow`) and `jsconfig.json` `paths`. |
| `Frontend/` (Astro) | Same alias in `astro.config.mjs` → `vite: { resolve: { alias: { "@shared": fileURLToPath(new URL("../shared", import.meta.url)) } }, server: { fs: { allow: [".", "../shared"] } } }` + `tsconfig`/`jsconfig` `paths`. Works in `.astro` frontmatter and in React islands alike (Vite bundles it either way). |
| `Backend/` | Relative import: `import { BRAND } from '../../shared/site.js'` (e.g. `services/ics.js`). |

**Docker:** every image that imports it is built with the repo root as context
(`deploy/docker-compose.yml`: `context: ..`, `dockerfile: <app>/Dockerfile`) and a
`<app>/Dockerfile.dockerignore` that only lets `<app>/` and `shared/` through — see `client/`.
`COPY shared /repo/shared` next to the app at `/repo/<app>` so `../shared` resolves.

## `services.json` shape

One entry per session type, straight from the client's pricing sheet. Prices are **starting
prices** — the sheet has explicit caveats (location fee, add-ons, party pricing scales with
guest count/time) that must travel with the data, not get lost in translation to JSON:

```json
{
  "currency": "USD",
  "pricingNotes": [
    "Pricing may change if location requires a fee",
    "Price may change for add-on services"
  ],
  "services": [
    { "slug": "solo", "name": "Solo/Individual Sessions", "startingPrice": 145 },
    { "slug": "grad", "name": "Grad Sessions", "startingPrice": 160 },
    { "slug": "maternity", "name": "Maternity Sessions", "startingPrice": 160 },
    { "slug": "branding", "name": "Branding Sessions", "startingPrice": 180 },
    { "slug": "birthday", "name": "Birthday Sessions", "startingPrice": 180 },
    {
      "slug": "party",
      "name": "Party Sessions",
      "startingPrice": 185,
      "duration": "1h30",
      "notes": [
        "Photos with guests and hosts",
        "Price may change depending on party size",
        "Every 30 minutes added is +$50"
      ]
    }
  ]
}
```

- `slug` is stable and used for routing/anchors (`/services#grad`) — never rename an existing
  slug without grepping for every usage first.
- New services get appended, not inserted mid-array (keeps diffs small and slugs stable).
- This file is the source for: pricing section on the landing, SEO copy per service (see
  **landing-seo**), and — later — whatever an admin pricing-editor screen writes back to.

## Rule

Any component, email template, SEO meta tag, or structured-data block that needs a phone
number, price, social link or payment handle imports from `shared/site.js` / `services.json`. If you find yourself
typing a literal `"(480) 555-0100"` or `"$145"` anywhere else, stop and import instead.
