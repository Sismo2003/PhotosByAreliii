// Photo uploads (docs/almacenamiento-fotos.md §5): three controls against filling the disk.
//   1. (frontend) POST /storage/check before sending anything;
//   2. here: reject by Content-Length with 507 before reading the body, and reserve the bytes
//      so two uploads at once can't both be approved with the same free space;
//   3. savePhoto / the model: ENOSPC aborts, cleans up and answers 507.
// multer writes into STORAGE_PATH/tmp (same file system as the photos, never the OS /tmp).
import crypto from 'node:crypto';
import multer from 'multer';
import { sendError, HttpError } from '../utils/http.js';
import { ALLOWED_TYPES, MAX_PHOTO_BYTES, TMP_PATH, releaseBytes, removeTmp, reserveBytes, storageProblem } from '../services/storage.js';

const upload = multer({
  storage: multer.diskStorage({
    destination: TMP_PATH,
    filename: (_req, _file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`),
  }),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    const heic = /heic|heif/i.test(file.mimetype) || /\.hei[cf]$/i.test(file.originalname);
    cb(new HttpError(415, heic ? 'HEIC photos are not supported yet — export them as JPG first.' : `“${file.originalname}” is not a JPG, PNG or WebP image.`));
  },
}).array('photos', 20);

export async function guardUpload(req, res, next) {
  const length = Number(req.headers['content-length'] ?? 0);
  try {
    const problem = await storageProblem(length);
    if (problem) return sendError(res, problem, 'Not enough space');
  } catch (error) {
    return sendError(res, error, 'Failed to check the storage');
  }
  reserveBytes(length);
  let released = false;
  const release = () => {
    if (!released) releaseBytes(length);
    released = true;
  };
  res.on('close', release); // success, error or the client hanging up
  next();
}

export function receivePhotos(req, res, next) {
  upload(req, res, (error) => {
    if (!error) return next();
    const status = error instanceof HttpError ? error : error.code === 'LIMIT_FILE_SIZE' ? new HttpError(413, 'Each photo can be up to 50 MB.') : new HttpError(400, error.message || 'The upload failed');
    // multer already wrote some files: remove them.
    (req.files ?? []).forEach((f) => removeTmp(f.path));
    return sendError(res, status, 'Upload failed');
  });
}
