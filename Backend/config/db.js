import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
// Prisma 7 generates the client as TypeScript into database/generated/prisma (see the schema's
// generator). Node 24 runs it directly by stripping the types.
import { PrismaClient } from '../../database/generated/prisma/client.ts';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — local dev: mysql://pba:pba@localhost:3306/photosbyarelli (database/docker-compose.yml).');
}

// Single shared Prisma client instance. The schema lives in database/prisma/schema.prisma
// (see the db-migrations skill); MySQL is reached through the MariaDB driver adapter.
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL) });

export default prisma;
