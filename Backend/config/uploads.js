import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Private storage — never mounted via express.static. Photos are only ever
// reachable through an authenticated download route. See the auth-gallery skill.
export const ORIGINALS_DIR = path.join(__dirname, '..', 'uploads', 'originals');
export const THUMBNAILS_DIR = path.join(__dirname, '..', 'uploads', 'thumbnails');

fs.mkdirSync(ORIGINALS_DIR, { recursive: true });
fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ORIGINALS_DIR),
  filename: (req, file, cb) => {
    const galleryId = req.params?.galleryId ?? 'unassigned';
    const ext = EXT[file.mimetype] ?? 'jpg';
    cb(null, `g${galleryId}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (ALLOWED.has(file.mimetype)) return cb(null, true);
  cb(new Error('INVALID_FILE_TYPE'));
}

// Middleware ready to use on the upload route: expects the field 'photos' (array).
export const uploadPhotos = multer({
  storage,
  fileFilter,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB per file — full-resolution originals
});
