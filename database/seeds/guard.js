// Seeds never run by accident. Every seed script calls this first: without CONFIRM_SEED=yes
// in the command it prints what it would do and exits, so a stray `prisma db seed`, a copied
// command or a wrong .env can't put data in (or, for the dev seed, wipe) the database.
//   CONFIRM_SEED=yes node seeds/seed.js
//   CONFIRM_SEED=yes node seeds/dev-seed.js
// `destructive` seeds also refuse to run in production or against a non-local database.
const LOCAL_HOSTS = ['localhost', '127.0.0.1', 'mysql'];

export function requireSeedConfirmation(name, { destructive = false, effect }) {
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? '').hostname;
    } catch {
      return '(unknown)';
    }
  })();

  if (process.env.CONFIRM_SEED !== 'yes') {
    console.error(`${name} did NOT run. It would: ${effect}`);
    console.error(`Database: ${host}`);
    console.error(`To run it on purpose: CONFIRM_SEED=yes node seeds/${name}.js`);
    process.exit(1);
  }
  if (destructive && (process.env.NODE_ENV === 'production' || !LOCAL_HOSTS.includes(host))) {
    console.error(`${name} wipes data and only runs on a local database (host: ${host}, NODE_ENV: ${process.env.NODE_ENV ?? 'unset'}). Refusing.`);
    process.exit(1);
  }
}
