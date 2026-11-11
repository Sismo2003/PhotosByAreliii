// The site's photos (web copies made by scripts/prepare-photos.mjs; © Photos By Areliii LLC —
// docs/derechos-imagenes.md). The key is the file name in src/assets/photos/.
// `service` = slug in shared/services.js (portfolio filter + service page gallery).
// `alt` describes the actual shot (session type + setting): it doubles as SEO/GEO text.
import type { ImageMetadata } from "astro";
import type { Lang } from "../i18n";

const files = import.meta.glob<{ default: ImageMetadata }>("../assets/photos/*.jpg", { eager: true });

export type Photo = {
  key: string;
  src: ImageMetadata;
  service: string;
  alt: Record<Lang, string>;
  /** Show it in black and white, like the design does with some frames. */
  gray?: boolean;
  /** CSS object-position when the crop needs help ("50% 30%"). */
  focus?: string;
};

type Meta = Omit<Photo, "key" | "src">;

const META: Record<string, Meta> = {
  "graduation-serape-class-of-2025": { service: "graduation", alt: { en: "Graduate holding her Class of 2025 tassel with a serape stole", es: "Graduada con su borla Class of 2025 y una estola de sarape" }, focus: "50% 30%" },
  "graduation-suit-serape-stole": { service: "graduation", alt: { en: "Graduate in a suit with a serape stole", es: "Graduado de traje con estola de sarape" }, focus: "50% 25%" },
  "graduation-red-cap-tree": { service: "graduation", alt: { en: "Graduate in a red cap leaning on a tree by a lake", es: "Graduada con birrete rojo recargada en un árbol junto al lago" } },
  "graduation-bench-gold-stole": { service: "graduation", alt: { en: "Graduate with a gold stole on a bench", es: "Graduada con estola dorada en una banca" } },
  "graduation-cap-golden-hour": { service: "graduation", alt: { en: "Graduate in her cap at golden hour", es: "Graduada con birrete a la hora dorada" } },
  "graduation-gold-stole-doorway": { service: "graduation", alt: { en: "Graduate in a gold stole by a doorway at sunset", es: "Graduada con estola dorada en una entrada al atardecer" } },
  "graduation-saguaro-bw": { service: "graduation", alt: { en: "Graduate in cap and gown among saguaros, black and white", es: "Graduada con toga y birrete entre saguaros, en blanco y negro" } },
  "graduation-walk-bw": { service: "graduation", alt: { en: "Graduate walking down a palm-lined path, black and white", es: "Graduada caminando por un sendero con palmeras, en blanco y negro" } },
  "graduation-golden-field": { service: "graduation", alt: { en: "Woman in a white dress sitting in a golden field", es: "Mujer de vestido blanco sentada en un campo dorado" } },
  "solos-pink-gown": { service: "solos", alt: { en: "Solo portrait in a pink satin gown among palm trees", es: "Retrato individual con vestido de satín rosa entre palmeras" } },
  "solos-pink-gown-full": { service: "solos", alt: { en: "Full-length solo portrait in a pink satin gown", es: "Retrato individual de cuerpo completo con vestido de satín rosa" } },
  "solos-pink-gown-flowers": { service: "solos", alt: { en: "Solo portrait in a pink gown beside a flower bed", es: "Retrato individual con vestido rosa junto a un jardín de flores" } },
  "solos-suit-gate": { service: "solos", alt: { en: "Young man in a navy suit by a golden gate", es: "Joven de traje azul junto a una reja dorada" } },
  "family-superstition-mountains": { service: "family-couples", alt: { en: "Family below the Superstition Mountains", es: "Familia al pie de las Superstition Mountains" } },
  "family-holding-hands-desert": { service: "family-couples", alt: { en: "Family holding hands in the desert below the mountains", es: "Familia tomada de la mano en el desierto, frente a las montañas" } },
  "family-walk-bw": { service: "family-couples", alt: { en: "Family walking hand in hand through the desert, black and white", es: "Familia caminando de la mano por el desierto, en blanco y negro" } },
  "family-siblings-park": { service: "family-couples", alt: { en: "Siblings by a white fence in the park", es: "Hermanos junto a una cerca blanca en el parque" } },
  "family-mom-baby-pink": { service: "family-couples", alt: { en: "Mom with her baby in a pink tutu", es: "Mamá con su bebé en tutú rosa" } },
  "family-siblings-fence-bw": { service: "family-couples", alt: { en: "Siblings on a wooden fence, black and white", es: "Hermanos sentados en una cerca de madera, en blanco y negro" } },
  "family-siblings-hug": { service: "family-couples", alt: { en: "Siblings hugging in the park", es: "Hermanos abrazados en el parque" } },
  "couples-superstition-sunset": { service: "family-couples", alt: { en: "Couple at sunset below the Superstition Mountains", es: "Pareja al atardecer frente a las Superstition Mountains" } },
  "couples-saguaro": { service: "family-couples", alt: { en: "Couple dancing by a saguaro at golden hour", es: "Pareja bailando junto a un saguaro a la hora dorada" } },
  "couples-bench-bw": { service: "family-couples", alt: { en: "Couple laughing on a wooden bench, black and white", es: "Pareja riendo en una banca de madera, en blanco y negro" } },
  "couples-town": { service: "family-couples", alt: { en: "Couple smiling at each other in a small town", es: "Pareja sonriéndose en un pueblo" } },
  "maternity-superstition-couple": { service: "maternity", alt: { en: "Expecting couple hugging in the desert", es: "Pareja esperando bebé abrazada en el desierto" } },
  "maternity-cowboy-hat": { service: "maternity", alt: { en: "Expecting couple resting on a rock at golden hour", es: "Pareja esperando bebé sentada en una roca a la hora dorada" } },
  "maternity-holding-hands-bw": { service: "maternity", alt: { en: "Expecting couple holding hands, black and white", es: "Pareja esperando bebé tomada de la mano, en blanco y negro" } },
  "maternity-desert-walk": { service: "maternity", alt: { en: "Expecting couple in the desert under a blue sky", es: "Pareja esperando bebé en el desierto bajo el cielo azul" } },
  "maternity-mountains-bw": { service: "maternity", alt: { en: "Expecting couple below the mountains, black and white", es: "Pareja esperando bebé frente a las montañas, en blanco y negro" } },
  "maternity-announcement": { service: "maternity", alt: { en: "Parents walking with baby clothes on a line", es: "Futuros papás caminando con ropita de bebé colgada" } },
  "maternity-fence-bw": { service: "maternity", alt: { en: "Expecting couple by a wooden fence, black and white", es: "Pareja esperando bebé junto a una cerca de madera, en blanco y negro" } },
  "birthday-23-cake": { service: "birthdays-parties", alt: { en: "Birthday portrait with a 23 cake and candles", es: "Retrato de cumpleaños con pastel y velas del 23" } },
  "birthday-21-balloons": { service: "birthdays-parties", alt: { en: "21st birthday portrait with gold balloons", es: "Retrato de 21 años con globos dorados" } },
  "birthday-red-dress-lake": { service: "birthdays-parties", alt: { en: "Birthday portrait in a red dress by a lake", es: "Retrato de cumpleaños con vestido rojo junto al lago" } },
  "birthday-red-dress-sunset": { service: "birthdays-parties", alt: { en: "Woman in a red dress at a desert sunset", es: "Mujer de vestido rojo en un atardecer del desierto" } },
  "birthday-gold-studio": { service: "birthdays-parties", alt: { en: "Birthday portrait on a gold studio set with balloons", es: "Retrato de cumpleaños en un set dorado con globos" } },
  "birthday-60-balloons": { service: "birthdays-parties", alt: { en: "60th birthday with gold number balloons", es: "Cumpleaños 60 con globos dorados de número" } },
  "birthday-cake-bw": { service: "birthdays-parties", alt: { en: "Birthday portrait with a cake, black and white", es: "Retrato de cumpleaños con pastel, en blanco y negro" } },
  "party-baby-shower-family": { service: "birthdays-parties", alt: { en: "Family at a baby shower in front of a balloon arch", es: "Familia en un baby shower frente a un arco de globos" } },
  "party-baby-shower-profile": { service: "birthdays-parties", alt: { en: "Mom-to-be at her baby shower by a pink balloon arch", es: "Futura mamá en su baby shower junto a un arco de globos rosa" } },
  "party-baby-shower-bw": { service: "birthdays-parties", alt: { en: "Couple at their baby shower, black and white", es: "Pareja en su baby shower, en blanco y negro" } },
  "branding-studio-chair": { service: "branding", alt: { en: "Headshot in a black suit on a director’s chair", es: "Retrato profesional de traje negro en una silla de director" } },
  "branding-skincare-products": { service: "branding", alt: { en: "Business owner holding her skincare products", es: "Emprendedora sosteniendo sus productos para la piel" } },
  "branding-brushes-bw": { service: "branding", alt: { en: "Holding beauty tools, black and white", es: "Sosteniendo herramientas de belleza, en blanco y negro" } },
  "branding-product-bottle": { service: "branding", alt: { en: "Business owner holding a product bottle", es: "Emprendedora sosteniendo un frasco de su producto" } },
  "branding-seated-portrait": { service: "branding", alt: { en: "Seated business portrait in a black blazer", es: "Retrato profesional sentada con blazer negro" } },
  "branding-sunglasses-phone-bw": { service: "branding", alt: { en: "Business owner with sunglasses and her phone, black and white", es: "Emprendedora con lentes de sol y su celular, en blanco y negro" } },
  "branding-director-chair-bw": { service: "branding", alt: { en: "Full-length business portrait on a director’s chair, black and white", es: "Retrato profesional de cuerpo completo en silla de director, en blanco y negro" } },
};

export const PHOTOS: Record<string, Photo> = Object.fromEntries(
  Object.entries(META).map(([key, meta]) => {
    const file = files[`../assets/photos/${key}.jpg`];
    if (!file) throw new Error(`photos.ts: missing src/assets/photos/${key}.jpg (run scripts/prepare-photos.mjs)`);
    return [key, { key, src: file.default, ...meta }];
  }),
);

export const photo = (key: string, gray = false): Photo => {
  const p = PHOTOS[key];
  if (!p) throw new Error(`photos.ts: unknown photo "${key}"`);
  return gray ? { ...p, gray: true } : p;
};

// ── Where each photo appears ──────────────────────────────────────────────────

/** Home hero: two portraits, the second one offset and in black and white (Main.dc.html). */
export const HERO = [photo("birthday-red-dress-sunset"), photo("couples-superstition-sunset", true)];

/** Image for social previews (cropped to 1200×630 at build time). */
export const OG_PHOTO = photo("family-superstition-mountains");

/** "Moments" strip (10 frames on desktop; the mobile layout shows the first 6). */
export const MOMENTS: { photo: Photo; caption: Record<Lang, string> }[] = [
  { photo: photo("birthday-red-dress-sunset"), caption: { en: "Desert sunset · Portrait", es: "Atardecer en el desierto · Retrato" } },
  { photo: photo("graduation-serape-class-of-2025"), caption: { en: "First-gen graduate · Class of 2025", es: "Graduada de primera generación · 2025" } },
  { photo: photo("graduation-golden-field"), caption: { en: "Golden hour · Portrait", es: "Hora dorada · Retrato" } },
  { photo: photo("couples-superstition-sunset", true), caption: { en: "Desert · Couples", es: "Desierto · Parejas" } },
  { photo: photo("birthday-23-cake"), caption: { en: "23rd birthday · Studio", es: "Cumpleaños 23 · Estudio" } },
  { photo: photo("maternity-cowboy-hat"), caption: { en: "Maternity · Desert", es: "Maternidad · Desierto" } },
  { photo: photo("birthday-red-dress-lake"), caption: { en: "Lakeside · Portrait", es: "Junto al lago · Retrato" } },
  { photo: photo("graduation-gold-stole-doorway"), caption: { en: "Graduation · Gold stole", es: "Graduación · Estola dorada" } },
  { photo: photo("family-superstition-mountains"), caption: { en: "Family · Superstition Mountains", es: "Familia · Superstition Mountains" } },
  { photo: photo("solos-pink-gown-full"), caption: { en: "Solos · Palm trees", es: "Individual · Palmeras" } },
];

/** Home portfolio grid, in reading order (4 columns desktop, 2 on phones). `frame` = the black
 *  print border the design puts on some photos. */
export const PORTFOLIO: { photo: Photo; frame?: boolean; caption?: boolean }[] = [
  { photo: photo("graduation-suit-serape-stole"), caption: true },
  { photo: photo("solos-pink-gown"), frame: true },
  { photo: photo("maternity-superstition-couple"), caption: true },
  { photo: photo("birthday-21-balloons"), frame: true },
  { photo: photo("family-walk-bw") },
  { photo: photo("couples-saguaro") },
  { photo: photo("maternity-holding-hands-bw"), caption: true },
  { photo: photo("branding-skincare-products"), caption: true },
  { photo: photo("family-holding-hands-desert"), caption: true },
  { photo: photo("graduation-saguaro-bw"), frame: true },
  { photo: photo("birthday-gold-studio"), caption: true },
  { photo: photo("party-baby-shower-profile") },
  { photo: photo("graduation-cap-golden-hour") },
  { photo: photo("couples-bench-bw") },
  { photo: photo("maternity-desert-walk") },
  { photo: photo("solos-suit-gate"), caption: true },
  { photo: photo("family-siblings-park") },
  { photo: photo("birthday-60-balloons"), frame: true },
  { photo: photo("graduation-red-cap-tree") },
  { photo: photo("branding-studio-chair") },
];

/** Per service page: the hero, the thumbnail used on /services and /book, and the 6-photo gallery. */
export const SERVICE_PHOTOS: Record<string, { hero: Photo; thumb: Photo; gallery: Photo[] }> = {
  graduation: {
    hero: photo("graduation-serape-class-of-2025"),
    thumb: photo("graduation-serape-class-of-2025"),
    gallery: ["graduation-suit-serape-stole", "graduation-red-cap-tree", "graduation-bench-gold-stole", "graduation-cap-golden-hour", "graduation-gold-stole-doorway", "graduation-saguaro-bw"].map((k) => photo(k)),
  },
  solos: {
    hero: photo("solos-pink-gown"),
    thumb: photo("solos-pink-gown"),
    gallery: ["solos-pink-gown-full", "solos-pink-gown-flowers", "solos-suit-gate", "graduation-golden-field", "birthday-red-dress-sunset", "birthday-red-dress-lake"].map((k) => photo(k)),
  },
  "family-couples": {
    hero: photo("family-superstition-mountains"),
    thumb: photo("family-superstition-mountains"),
    gallery: ["couples-superstition-sunset", "family-mom-baby-pink", "family-siblings-park", "couples-town", "family-walk-bw", "family-siblings-fence-bw"].map((k) => photo(k)),
  },
  maternity: {
    hero: photo("maternity-desert-walk"),
    thumb: photo("maternity-desert-walk"),
    gallery: ["maternity-superstition-couple", "maternity-mountains-bw", "maternity-cowboy-hat", "maternity-holding-hands-bw", "maternity-fence-bw", "maternity-announcement"].map((k) => photo(k)),
  },
  "birthdays-parties": {
    hero: photo("birthday-21-balloons"),
    thumb: photo("birthday-23-cake"),
    gallery: ["birthday-23-cake", "birthday-gold-studio", "birthday-60-balloons", "party-baby-shower-family", "party-baby-shower-profile", "birthday-cake-bw"].map((k) => photo(k)),
  },
  branding: {
    hero: photo("branding-skincare-products"),
    thumb: photo("branding-skincare-products"),
    gallery: ["branding-studio-chair", "branding-product-bottle", "branding-director-chair-bw", "branding-seated-portrait", "branding-brushes-bw", "branding-sunglasses-phone-bw"].map((k) => photo(k)),
  },
};
