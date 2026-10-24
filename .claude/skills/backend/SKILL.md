---
name: backend
description: Express/Prisma/MySQL API conventions for the backend — layout, response envelope, controller/model pattern. Use when reading or editing anything under Backend/ — controllers, models, services, routes, middlewares.
---

# Backend — photosByArelli

Express + Prisma (MySQL). ES modules (`"type": "module"`) — always `import`/`export`, never
`require`. Chosen over a bare `mysql2` pool (rebate's pattern) because Prisma gives migrations +
type-safe queries for a schema that will grow (users, galleries, photos, sessions) without much
extra ceremony — see **db-migrations** for the migration workflow this implies.

**The Prisma schema itself lives in `database/`, not here** (see **db-migrations**) — `Backend/`
only imports the generated client. If you're changing what fields/models exist, you're editing
`database/prisma/schema.prisma`, not anything under `Backend/`.

## Layout

```
Backend/
├── app.js            # route mounting, grouped by feature with // comments
├── server.js         # HTTP entry point
├── controllers/       # req/res handling: validate input, call model/service, shape response
├── models/            # thin wrappers around the Prisma client — static methods, one per query
├── services/           # cross-cutting logic (email sending, zip generation for bulk download)
├── routes/             # express.Router() per feature, imported and mounted in app.js
├── middlewares/        # auth.middleware.js (requireAuth/requireAdmin), upload.middleware.js
└── config/               # prisma client singleton (imports the client generated from
                          #   database/prisma/schema.prisma), env-derived constants, uploads.js
```

**Controllers vs services vs models:**
- Simple CRUD (clients, galleries, services list): controller calls the model directly.
- Anything stateful/cross-cutting (photo upload + thumbnail generation, zip download, email):
  controller delegates to a `services/*.js` module, which calls models.
- Models are the only place Prisma client calls live — controllers never `import { prisma }`
  directly, they call a model method.

## Response envelope (follow this exactly)

Success:
```js
res.status(201).json({ message: "Client created successfully", data: { ... }, error: false });
```
Failure:
```js
res.status(400).json({ error_message: "Email is required", message: "Bad request", error: true });
```
Every response has `error: boolean`. Failures use `error_message` for the human-readable reason;
successes use `data`.

## Model pattern

```js
class GalleryModel {
  static async findByClientId(clientId) {
    return prisma.gallery.findMany({ where: { clientId } });
  }
}
export default GalleryModel;
```
Static methods, one per operation, named for what they do. Never build raw SQL strings — Prisma
query builder only (parameterization is automatic).

## Routes

One `express.Router()` file per feature in `routes/`, mounted with a `// FEATURE NAME` comment
in `app.js`. Keep route files thin — wiring only, no logic. Auth middleware applied per-route or
per-router (`router.use(requireAuth)`), never assumed.

## HTTP status codes

`200` read/update ok · `201` created · `400` bad input · `401` unauthenticated · `403`
unauthorized · `404` not found · `409` conflict · `500` server error.

## Dates and phone numbers (project rule — see /CLAUDE.md)

- Dates: **Luxon** only. Store/return UTC; compute and display in `America/Phoenix`. No `dayjs`,
  `moment`, `Date` arithmetic or hand-rolled `Intl`. Only call `toJSDate()` where a library needs
  a `Date` (Prisma).
- Phones: **libphonenumber-js** only, default country US. Save `phone` as typed and `phoneE164`
  normalized; match returning clients on `phoneE164`. Re-validate with `isValid()` server-side.

## Security non-negotiables

- All queries through Prisma — no raw SQL string interpolation.
- JWT secret from `process.env`, never hardcoded.
- No password/token values in logs or response bodies.
- Validate at the boundary: required-field checks in controllers, or a Yup/Zod schema in
  `middlewares/` for complex payloads (photo upload metadata, client creation).
- See **auth-gallery** for the role/access-control rules layered on top of this.

## Domain context

The backend serves: the public landing's contact/quote form, and the private portal (admin
manages clients/galleries/photos, clients view/download their own photos). See **auth-gallery**
for the auth/photo-access rules and **db-migrations** for schema conventions.
