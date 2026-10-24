import app from './app.js';
import { PORT } from './config/main.js';
import { startCleanup } from './services/gallery-cleanup.js';

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  startCleanup();
});
