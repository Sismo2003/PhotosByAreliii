// Services and starting prices shown on the public site (skill `site-config`, `landing-seo`).
// Public data, tracked in git. Prices are in whole dollars and are STARTING prices.
// Same values as database/seeds/data/catalog.js (what the booking flow charges) — change both together.
// Marketing copy per service (titles, intros, "before your session"…) lives in Frontend/src/i18n/.

export const CURRENCY = "USD";

// Order = order on the site. `slug` is stable: it is the URL (/services/<slug>/) and the key the
// admin catalog uses. Never rename one without grepping every usage.
export const SERVICES = [
  {
    slug: "graduation",
    from: 160,
    packages: [{ key: "graduation", price: 160, minutes: 120 }],
  },
  {
    slug: "solos",
    from: 145,
    packages: [{ key: "solo", price: 145, minutes: 120 }],
  },
  {
    slug: "family-couples",
    from: 160,
    packages: [
      { key: "couples", price: 160, minutes: 120 },
      { key: "family", price: 220, minutes: 120 },
    ],
  },
  {
    slug: "maternity",
    from: 170,
    packages: [{ key: "maternity", price: 170, minutes: 120 }],
  },
  {
    slug: "birthdays-parties",
    from: 180,
    packages: [
      { key: "birthday", price: 180, minutes: 120 },
      { key: "party", price: 185, minutes: 90 },
    ],
  },
  {
    slug: "branding",
    from: 180,
    packages: [{ key: "branding", price: 180, minutes: 120 }],
  },
];

// `services: null` = offered on every service.
export const EXTRAS = [
  { key: "outfit", price: 15, services: null },
  { key: "extra30", price: 50, minutes: 30, services: ["birthdays-parties"] },
];

// Booking policy numbers (the wording is in the i18n files). Change here and every page follows.
export const POLICY = {
  depositPercent: 50,
  cancelNoticeHours: 48,
  lateGraceMinutes: 30,
  minorAge: 18,
};

export const serviceBySlug = (slug) => SERVICES.find((s) => s.slug === slug);
