// Prisma 7 config: the connection URL lives here, not in schema.prisma.
// Locally it comes from database/.env; inside Docker, compose sets DATABASE_URL.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // No `seed` command on purpose: seeding is never implicit (`prisma db seed` does nothing).
  // Run it by hand: CONFIRM_SEED=yes node seeds/seed.js (see seeds/guard.js).
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
});
