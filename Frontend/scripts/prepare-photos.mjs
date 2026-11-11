// Prepares the public site's photos from Areli's originals (docs/derechos-imagenes.md).
// Runs on the owner's machine only — never in CI — and writes web copies to src/assets/photos/:
//   - auto-rotated, longest edge ≤ 2000 px, sRGB JPEG q86 (Astro makes AVIF/WebP sizes at build);
//   - ALL metadata removed (GPS, camera, serial numbers), then only Copyright + Artist written back.
// Usage (from Frontend/): node scripts/prepare-photos.mjs ["../Photos By Areliii LLC"]
// The selection lives in PHOTOS below; alt text and placement live in src/data/photos.ts.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { DateTime } from "luxon";
import { BRAND } from "../../shared/site.js";

const SOURCE = path.resolve(process.argv[2] ?? "../Photos By Areliii LLC");
const OUT = path.resolve("src/assets/photos");
const MAX_EDGE = 2000;

// [output name (= key in src/data/photos.ts), source path inside SOURCE]
const PHOTOS = [
  ["graduation-serape-class-of-2025", "Graduates/IMG_7560.JPG"],
  ["graduation-suit-serape-stole", "Graduates/_MG_4680.jpeg"],
  ["graduation-red-cap-tree", "Graduates/_MG_7056.JPG"],
  ["graduation-bench-gold-stole", "Graduates/_MG_7108.JPG"],
  ["graduation-cap-golden-hour", "Graduates/_MG_9167.JPG"],
  ["graduation-gold-stole-doorway", "Graduates/_MG_9453.JPG"],
  ["graduation-saguaro-bw", "Graduates/_MG_9183.JPG"],
  ["graduation-walk-bw", "Graduates/_MG_8712.JPG"],
  ["graduation-golden-field", "Graduates/_MG_9297.JPG"],
  ["solos-pink-gown", "Solos/_MG_6282.jpeg"],
  ["solos-pink-gown-full", "Solos/_MG_6285.jpeg"],
  ["solos-pink-gown-flowers", "Solos/_MG_6333.jpeg"],
  ["solos-suit-gate", "Solos/_MG_4238.jpeg"],
  ["family-superstition-mountains", "Family/_MG_2566.JPG"],
  ["family-holding-hands-desert", "Family/_MG_2747.JPG"],
  ["family-walk-bw", "Family/IMG_8137.JPG"],
  ["family-siblings-park", "Family/_MG_7966.JPG"],
  ["family-mom-baby-pink", "Family/_MG_1107.JPG"],
  ["family-siblings-fence-bw", "Family/_MG_9492.JPG"],
  ["family-siblings-hug", "Family/_MG_8037.JPG"],
  ["couples-superstition-sunset", "Couples/_MG_7762.jpeg"],
  ["couples-saguaro", "Couples/_MG_7965.jpeg"],
  ["couples-bench-bw", "Couples/_MG_7543.jpeg"],
  ["couples-town", "Couples/IMG_8238.JPG"],
  ["maternity-superstition-couple", "Maternity/_MG_5573.JPG"],
  ["maternity-cowboy-hat", "Maternity/_MG_7825.JPG"],
  ["maternity-holding-hands-bw", "Maternity/_MG_7883.JPG"],
  ["maternity-desert-walk", "Maternity/_MG_7896.JPG"],
  ["maternity-mountains-bw", "Maternity/_MG_7783.JPG"],
  ["maternity-announcement", "Maternity/_MG_1102.JPG"],
  ["maternity-fence-bw", "Maternity/_MG_8122.JPG"],
  ["birthday-23-cake", "Birthday/_MG_9778.JPG"],
  ["birthday-21-balloons", "Birthday/_MG_1776.JPG"],
  ["birthday-red-dress-lake", "Birthday/_MG_0335.JPG"],
  ["birthday-red-dress-sunset", "Birthday/_MG_0437.JPG"],
  ["birthday-gold-studio", "Birthday/_MG_1988.JPG"],
  ["birthday-60-balloons", "Birthday/_MG_7652.jpeg"],
  ["birthday-cake-bw", "Birthday/_MG_0761.JPG"],
  ["party-baby-shower-family", "Party/_MG_9978.JPG"],
  ["party-baby-shower-profile", "Party/_MG_9957.JPG"],
  ["party-baby-shower-bw", "Party/_MG_9891.JPG"],
  ["branding-studio-chair", "Branding /_MG_2225.JPG"],
  ["branding-skincare-products", "Branding /_MG_2258.JPG"],
  ["branding-brushes-bw", "Branding /_MG_2241.JPG"],
  ["branding-product-bottle", "Branding /_MG_2248.JPG"],
  ["branding-seated-portrait", "Branding /_MG_2240.JPG"],
  ["branding-director-chair-bw", "Branding /_MG_2230.JPG"],
  ["branding-sunglasses-phone-bw", "Branding /_MG_2286.JPG"],
];

const year = DateTime.now().setZone("America/Phoenix").year;
const copyright = `© ${year} ${BRAND.legalName}. All rights reserved.`;

fs.mkdirSync(OUT, { recursive: true });
for (const [name, rel] of PHOTOS) {
  const src = path.join(SOURCE, rel);
  if (!fs.existsSync(src)) {
    console.error(`missing: ${rel}`);
    process.exitCode = 1;
    continue;
  }
  await sharp(src)
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
    .toColorspace("srgb")
    // withExif replaces the metadata with exactly these tags (sharp drops everything else by default).
    .withExif({ IFD0: { Copyright: copyright, Artist: BRAND.legalName } })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(OUT, `${name}.jpg`));
  console.log(`ok  ${name}`);
}
