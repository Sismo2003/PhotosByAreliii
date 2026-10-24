---
name: landing-seo
description: SEO and GEO (local/generative search) conventions for the public Astro landing pages — meta tags, structured data, sitemap, and how to source copy from site-config instead of hardcoding it. Use when creating or editing any page under src/pages/ on the public site, or the shared SEO/Layout component.
---

# Landing SEO/GEO — photosByArelli

This is a local photography business (mobile/on-location sessions). The two audiences to
optimize for: **traditional search** (Google ranking a person searching "photographer near me")
and **GEO** — generative engines (ChatGPT/Perplexity/AI Overviews) that answer "who's a good
photographer for a grad session in [area]" by summarizing structured, factual page content
rather than ranking links.

## 1. Every page ships real meta tags — never rely on defaults

Shared `<SEO />` / `Layout.astro` component takes `title`, `description`, `image`, `canonical`
per page — no page inherits a generic title. Title pattern:
`<Page/Service> | {BRAND.name}` (from **site-config**). Description is unique per page, under
160 characters, mentions the service + a concrete detail (price-from, location flexibility) —
not marketing fluff a crawler can't act on.

## 2. Structured data (JSON-LD) — this is what GEO actually reads

Every page includes a `LocalBusiness` (subtype: photography studio) JSON-LD block in
`<head>`, sourced from `site.js`/`services.json` (**site-config**) — never hand-typed inline:

```html
<script type="application/ld+json" set:html={JSON.stringify({
  "@context": "https://schema.org",
  "@type": "PhotographyBusiness",
  "name": BRAND.name,
  "telephone": CONTACT.phoneRaw,
  "email": CONTACT.emails.primary,
  "sameAs": Object.values(SOCIAL).filter(Boolean),
  "makesOffer": services.map(s => ({
    "@type": "Offer",
    "name": s.name,
    "priceCurrency": "USD",
    "price": s.startingPrice,
  })),
})} />
```

- On the services page/section, also add `Offer`/`Product` structured data per service (already
  shown above via `makesOffer` — expand to a full `Offer` block per service on a dedicated
  `/services` page if one exists).
- On a reviews/testimonials section (once real reviews exist), add `Review`/`AggregateRating` —
  never fabricate a rating or review count; if there's no real review data yet, omit the block
  entirely rather than stub it with placeholder numbers.

## 3. GEO-specific: write for extraction, not just for humans

Generative engines lift sentences verbatim into answers. For each service section, include at
least one **self-contained factual sentence** that would make sense quoted out of context:
"Solo/Individual sessions start at $145 and include [X]." — not "Book your solo session today!"
Vague CTA copy is fine for humans but gives an AI answer engine nothing to extract.

- Keep the pricing table's numbers matching `services.json` exactly — GEO engines cross-check
  page text against structured data; a mismatch (page says $150, JSON-LD says $145) reads as
  unreliable and gets deprioritized.
- Answer likely questions directly and locatable by a heading: "How much does a maternity
  session cost?" as an actual `<h3>` (or FAQ schema entry) beats implying the answer in prose.

## 4. Technical SEO baseline

- `@astrojs/sitemap` wired in `astro.config.mjs`, every public route included, nothing behind
  auth (admin/client portal) ever appears in the sitemap or gets crawled — add those routes to
  `robots.txt` disallow.
- Images via `astro:assets` (`<Image />`) for automatic `width`/`height`/`loading="lazy"` and
  format optimization — never a raw `<img src="/big-photo.jpg">` for portfolio/gallery images.
- One `<h1>` per page. Heading hierarchy follows document structure, not visual size — style
  with CSS, not by skipping heading levels.
- `alt` text on every portfolio image describes the actual shot (session type + setting), not
  "photo1.jpg" or a generic "photography" — this doubles as GEO signal and accessibility.

## 5. Open Graph / social preview

`og:title`, `og:description`, `og:image` (real photo, not the placeholder logo) on every page
that's likely to be shared — homepage, services, each portfolio/gallery category if public
galleries exist. `og:image` dimensions 1200×630.

## 6. Don't block on the rebrand

Brand name/logo are placeholders (**site-config**) — SEO copy should reference `BRAND.name` via
the variable, never the literal string, so the entire site's metadata updates in one place the
day the real brand lands.
