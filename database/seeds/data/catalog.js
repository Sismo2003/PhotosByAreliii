// Real catalog (Photos By Areliii LLC.pdf, 2026-09-28) with the durations from the design canvas. Starting prices, in dollars here and
// stored as cents. Every photo is delivered edited, so no package has a photo count.

export const services = [
  {
    slug: 'graduation',
    name: 'Graduation',
    packages: [
      { name: 'Graduation session', price: 160, minutes: 120, note: '1–2 hours · every photo edited · extra outfit changes +$15' },
    ],
  },
  {
    slug: 'solos',
    name: 'Solos',
    packages: [
      { name: 'Solo session', price: 145, minutes: 120, note: '1–2 hours · every photo edited · extra outfit changes +$15' },
    ],
  },
  {
    slug: 'family-couples',
    name: 'Family & couples',
    packages: [
      { name: 'Couples', price: 160, minutes: 120, note: 'The two of you · 1–2 hours · every photo edited' },
      { name: 'Family', price: 220, minutes: 120, note: 'The whole family · 1–2 hours · every photo edited' },
    ],
  },
  {
    slug: 'maternity',
    name: 'Maternity',
    packages: [
      { name: 'Maternity session', price: 170, minutes: 120, note: '1–2 hours · every photo edited · extra outfit changes +$15' },
    ],
  },
  {
    slug: 'birthdays-parties',
    name: 'Birthdays & parties',
    packages: [
      { name: 'Birthday', price: 180, minutes: 120, note: 'Portrait session · studio or location · every photo edited' },
      { name: 'Party', price: 185, minutes: 90, note: '90 min at your party · photos with guests and hosts · +$50 every extra 30 min' },
    ],
  },
  {
    slug: 'branding',
    name: 'Branding',
    packages: [
      { name: 'Branding session', price: 180, minutes: 120, note: 'Portraits and product shots · 1–2 hours · every photo edited' },
    ],
  },
];

// `services: null` = offered on every service.
export const extras = [
  { name: 'Extra outfit change', price: 15, services: null },
  { name: 'Extra 30 minutes (party sessions)', price: 50, minutes: 30, services: ['birthdays-parties'] },
];

// /book step 2, from BookingDate.dc.html: Tuesday, Saturday and Sunday. Placeholder until Areli
// confirms her real hours (handoff §4.11 / D5). Times are America/Phoenix.
const SLOTS = [
  { startTime: '08:00', label: 'soft morning' },
  { startTime: '10:00' },
  { startTime: '16:30' },
  { startTime: '17:15', label: 'golden hour' },
];
export const availability = [0, 2, 6].flatMap((weekday) => SLOTS.map((slot) => ({ weekday, ...slot })));
