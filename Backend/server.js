import app from './app.js';
import { PORT } from './config/main.js';
import { startCleanup } from './services/gallery-cleanup.js';
import { startEmail } from './services/email/index.js';

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  startCleanup();
  startEmail().catch((error) => console.error('[email] failed to start', error));
});
