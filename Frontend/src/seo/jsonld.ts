// Structured data (JSON-LD) — what search and answer engines read (skill `landing-seo`).
// Everything comes from shared/site.js + shared/services.js; nothing typed by hand. No address
// (sessions are on location) and no ratings until there are real reviews.
import { AREA, BRAND, CONTACT, SERVICES, SOCIAL } from "../data/site";
import { localizePath, useT, type Lang } from "../i18n";
import { SHARED_VARS } from "../data/site";

const abs = (site: URL, path: string) => new URL(path, site).href;
export const businessId = (site: URL) => `${abs(site, "/")}#business`;

const prices = SERVICES.flatMap((s: any) => s.packages.map((p: any) => p.price));

export function businessNode(site: URL, lang: Lang, logoUrl: string, imageUrl: string) {
  const { t } = useT(lang, SHARED_VARS);
  const areaServed = AREA.areaServed.length
    ? AREA.areaServed.map((name: string) => ({ "@type": "City", name, containedInPlace: { "@type": "State", name: AREA.region } }))
    : { "@type": "State", name: AREA.region, containedInPlace: { "@type": "Country", name: AREA.country } };
  return {
    "@type": ["LocalBusiness", "ProfessionalService"],
    "@id": businessId(site),
    name: BRAND.name,
    legalName: BRAND.legalName,
    url: abs(site, "/"),
    logo: logoUrl,
    image: imageUrl,
    description: t("footer.about"),
    telephone: CONTACT.phoneE164 || undefined,
    email: CONTACT.emails?.primary || undefined,
    sameAs: [SOCIAL.instagram].filter(Boolean),
    founder: BRAND.ownerFullName ? { "@type": "Person", name: BRAND.ownerFullName, jobTitle: "Photographer" } : undefined,
    areaServed,
    knowsLanguage: ["en", "es"],
    currenciesAccepted: "USD",
    paymentAccepted: "Cash, Zelle, Cash App",
    priceRange: `$${Math.min(...prices)}–$${Math.max(...prices)}`,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: t("nav.services"),
      itemListElement: SERVICES.map((s: any) => ({
        "@type": "Offer",
        url: abs(site, localizePath(`/services/${s.slug}/`, lang)),
        priceCurrency: "USD",
        price: s.from,
        priceSpecification: { "@type": "PriceSpecification", minPrice: s.from, priceCurrency: "USD" },
        itemOffered: { "@type": "Service", name: t(`services.${s.slug}.name`), serviceType: t(`services.${s.slug}.name`) },
      })),
    },
  };
}

export function serviceNode(site: URL, lang: Lang, slug: string, imageUrl: string) {
  const { t } = useT(lang, SHARED_VARS);
  const service = SERVICES.find((s: any) => s.slug === slug);
  const url = abs(site, localizePath(`/services/${slug}/`, lang));
  return {
    "@type": "Service",
    "@id": `${url}#service`,
    name: t(`services.${slug}.name`),
    serviceType: t(`services.${slug}.name`),
    description: t(`services.${slug}.intro`),
    url,
    image: imageUrl,
    provider: { "@id": businessId(site) },
    areaServed: { "@type": "State", name: AREA.region },
    offers: service.packages.map((p: any) => ({
      "@type": "Offer",
      name: t(`services.${slug}.packages.${p.key}.name`),
      description: t(`services.${slug}.packages.${p.key}.note`),
      price: p.price,
      priceCurrency: "USD",
      priceSpecification: { "@type": "PriceSpecification", minPrice: p.price, priceCurrency: "USD" },
      url,
    })),
  };
}

export function breadcrumbNode(site: URL, items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(site, it.path) })),
  };
}

export function faqNode(items: { q: string; text: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.text } })),
  };
}
