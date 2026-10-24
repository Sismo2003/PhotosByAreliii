---
name: db-migrations
description: How to change the database schema using Prisma migrate — the workflow, naming, and what to commit. Use whenever a backend change requires adding/editing a model in schema.prisma, or a new table/column.
---

# DB migrations — photosByArelli (Prisma + MySQL)

Unlike rebate's hand-rolled numbered `.sql` files, this project uses **Prisma's own migration
system** as the single source of truth — no parallel manual-SQL folder (that split caused
confusion in the `planner` project, where a legacy `migrations/*.sql` folder and
`prisma/migrations/` coexisted).

**Prisma lives in `database/`, not inside `Backend/`** — a deliberate choice for this project
(unlike planner, which nests `prisma/` under `Backend/`): `database/prisma/schema.prisma` is
what you edit; migrations are generated into `database/prisma/migrations/`, never hand-written.
`Backend/` only imports the generated Prisma client — it never owns the schema.

```
database/
  prisma/
    schema.prisma       # source of truth for the DB schema
    migrations/          # generated, one folder per migration — commit these
  seeds/                 # optional: seed scripts, run manually or via a package.json script
```

`Backend/config/` (or wherever the Prisma client singleton lives) points its `schema.prisma`
path at `../database/prisma/schema.prisma` — set this once when scaffolding the backend, see
**backend**.

## Workflow for any schema change

1. Edit the model(s) in `database/prisma/schema.prisma`.
2. Generate + apply locally, from `database/`:
   ```bash
   cd database && npx prisma migrate dev --name <short_description>
   ```
   This creates `database/prisma/migrations/<timestamp>_<short_description>/migration.sql`,
   applies it to the local dev DB, and regenerates the Prisma client (configured to output
   wherever `Backend/` imports it from — see `generator client { output = ... }` in the schema).
3. Commit the generated migration folder — never edit a generated `migration.sql` by hand after
   the fact; if it's wrong, fix the schema and generate a new migration instead of patching an
   applied one.
4. Deploy applies pending migrations with:
   ```bash
   cd database && npx prisma migrate deploy
   ```
   Never `migrate dev` against production — it can prompt for destructive resets.

## Naming

`<short_description>` in `migrate dev --name` is snake_case, describes the change
(`add_gallery_model`, `add_photo_thumbnail_path`), not a ticket number or date (Prisma already
timestamps it).

## Core schema (starting point)

```prisma
model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String
  role         Role     @default(CLIENT)
  name         String
  createdAt    DateTime @default(now())
  gallery      Gallery?
}

enum Role {
  ADMIN
  CLIENT
}

model Gallery {
  id        Int      @id @default(autoincrement())
  clientId  Int      @unique
  client    User     @relation(fields: [clientId], references: [id])
  sessionType String?   // e.g. "grad", "maternity" — see site-config services.json slugs
  createdAt DateTime @default(now())
  photos    Photo[]
}

model Photo {
  id            Int      @id @default(autoincrement())
  galleryId     Int
  gallery       Gallery  @relation(fields: [galleryId], references: [id])
  originalPath  String   // never publicly served — see auth-gallery
  thumbnailPath String
  filename      String
  uploadedAt    DateTime @default(now())
}
```

Adjust field names as real requirements surface, but keep the `User(role) → Gallery(1:1
per client) → Photo(many)` shape unless there's a concrete reason a client needs multiple
galleries (e.g. one client books two separate sessions) — that's a real scenario for this
business (grad session this year, maternity session next), so `Gallery` should probably end up
**many-per-client**, not 1:1. Confirm with the user before locking in the 1:1 relation above; the
schema shown here is a starting draft, not a final decision.

## Never assume a migration ran

Don't write backend code that assumes a new column/table exists in a deployed environment until
`prisma migrate deploy` has actually been run there and the user confirms it.
