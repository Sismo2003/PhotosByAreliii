// Business info — the ONE place for contact, social and payment details (skill `site-config`).
// Imported by client/ (`@shared/site`), the Astro landing (Frontend/) and, when needed, Backend/.
// Plain JS with no dependencies so Vite, Astro and Node all read it as is.
// Everything here ends up in the browser bundle: public data only.
// Empty string = not known yet; the UI hides whatever depends on it.
// PUBLIC TEMPLATE with example values (like .env.example). The real file is shared/site.js, which is
// git-ignored: `npm run setup:site` copies this template to shared/site.js if it doesn't exist yet;
// then put the real data there. Keep both files in the same shape.

export const BRAND = {
  name: "Photos By Areliii",
  legalName: "Photos By Areliii LLC",
  owner: "Areli",
  domain: "photosbyareliii.com",
};

export const CONTACT = {
  // E.164 only; show it with formatPhone() and link it with telHref() / sms: (utils/phone.js).
  phoneE164: "+14805550100",
  emails: {
    primary: "hello@example.com",
    alt: "bookings@example.com",
  },
  // No studio address: sessions happen on location.
};

export const SOCIAL = {
  instagramHandle: "photosbyareliii",
  instagram: "https://instagram.com/photosbyareliii",
};

// Payments are manual (no gateway): the client sends the money and Areli records it in the admin.
export const PAYMENTS = {
  zelle: "",
  cashApp: "",
};
