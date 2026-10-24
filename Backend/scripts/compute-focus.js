// One-off: fills Photo.focusX / focusY / focusSource for photos uploaded before the focus existed.
//   node scripts/compute-focus.js          → only photos without a focus
//   node scripts/compute-focus.js --all    → every photo again, except the ones set by hand (MANUAL)
// Safe to run twice. Same code as the upload (services/photo-focus.js).
import 'dotenv/config';
import prisma from '../config/db.js';
import { computeFocus } from '../services/photo-focus.js';
import * as storage from '../services/storage.js';

const all = process.argv.includes('--all');
const where = all ? { OR: [{ focusSource: null }, { focusSource: { not: 'MANUAL' } }] } : { focusSource: null };
const photos = await prisma.photo.findMany({ where, select: { id: true, thumbnailPath: true, webPath: true }, orderBy: { id: 'asc' } });

const count = { FACE: 0, none: 0 };
for (const p of photos) {
  if (!p.thumbnailPath) continue;
  const focus = await computeFocus(storage.absolutePath(p.thumbnailPath), { detail: p.webPath ? storage.absolutePath(p.webPath) : undefined });
  // No face: clear an older point (e.g. a SALIENCY one) so the thumbnail is centered.
  await prisma.photo.update({ where: { id: p.id }, data: focus ?? { focusX: null, focusY: null, focusSource: null } });
  count[focus?.focusSource ?? 'none'] += 1;
}
console.log(`${photos.length} photos · ${count.FACE} with a face · ${count.none} without one (shown centered)`);
await prisma.$disconnect();
