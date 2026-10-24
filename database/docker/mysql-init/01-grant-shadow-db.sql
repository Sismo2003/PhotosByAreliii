-- Dev only: `prisma migrate dev` creates and drops a temporary shadow database,
-- so the app user needs rights beyond its own schema.
GRANT ALL PRIVILEGES ON *.* TO 'pba'@'%';
FLUSH PRIVILEGES;
