// Public images used inside emails (docs/correos.md §4.1): the logo only. Mail apps fetch it
// without a session, so this is the one public route of the module. Never gallery photos.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { LOGO } from '../../shared/brand.js';

const shared = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'shared');
const router = Router();

router.get('/logo.png', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(shared, LOGO.onLight), (err) => {
    if (err && !res.headersSent) res.status(404).end();
  });
});

export default router;
