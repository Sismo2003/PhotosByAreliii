---
name: auth-gallery
description: Admin/client authentication, roles, and the private photo gallery system — how the admin creates client accounts and uploads photos, and how a client logs in to view/download only their own photos. Use for anything touching login, JWT, roles, user creation, photo upload, or photo download/access-control.
---

# auth-gallery — private client photo delivery

Two roles, one login screen: `admin` (the photographer) and `client` (her customers). There is
no public self-signup — **only the admin creates client accounts**, because a client's account
exists to receive photos from a specific session the admin already shot.

## 1. Roles and auth pattern (JWT, cookie-based)

Follow planner's `Backend/middlewares/auth.middleware.js` pattern:

- JWT signed on login, stored in an **httpOnly cookie** (not localStorage — photos are the
  asset being protected, don't expose the token to XSS).
- Payload is minimal (`{ id, role }`), never trust the role claim alone for admin-only actions —
  re-check the role from the DB on privileged routes (a stale/forged claim shouldn't be enough).

```js
export function requireAuth(req, res, next) { /* verifies cookie JWT, sets req.user, 401 if absent/invalid */ }
export function requireAdmin(req, res, next) { /* requireAuth + DB role check, 403 if not admin */ }
```

- `requireAuth` alone → any logged-in client or admin.
- `requireAdmin` → admin-only routes: create client, upload photo, delete photo, manage all
  galleries.
- A client can only ever touch **their own** gallery/photos — every client-facing route filters
  by `req.user.id`, never trusts a `clientId`/`galleryId` passed from the frontend without
  checking it belongs to the logged-in user.

## 2. Admin creates the client account

No public registration form. Admin flow: create client (name, email, temp password or invite
link) → system creates one `Gallery` tied to that client → admin uploads photos into it.
A client's first login should force a password change if they were given a temp password.

## 3. Photo upload (admin only)

Multer disk storage, following planner's `Backend/config/uploads.js` pattern — adapted for
full-resolution client photos, not tiny avatars:

- Validate MIME type (`image/jpeg`, `image/png`, `image/webp` — no arbitrary file types).
- Store originals outside any publicly-served static path — serve them only through an
  authenticated download route, never `express.static` on the raw uploads folder (unlike the
  avatar pattern in planner, which is intentionally public). Client photo delivery must not be
  guessable-URL-accessible.
- Generate a thumbnail/preview version on upload (for the gallery grid) separate from the
  full-resolution original (for download) — the client browses thumbnails, downloads originals.
- File naming includes the gallery/client id, never the client's real name in the filename
  itself (avoids leaking PII into logs/paths/backups).

## 4. Photo download (client + admin)

Download route is always authenticated and always re-derives ownership server-side:

```js
// GET /api/galleries/:galleryId/photos/:photoId/download
// requireAuth, then: photo.gallery.clientId === req.user.id  OR  req.user.role === 'admin'
// else 403 — never trust the URL alone.
```

- Serve via `res.download()` / a signed short-lived stream, not a permanent public link.
- Support "download all" (zipped) for a gallery once there's more than a handful of photos —
  don't make the client click-download 80 photos one by one; this can come after the
  single-photo download works.

## 5. What NOT to do

- Never serve original photos through a static/public folder path.
- Never accept `role` or `clientId` from the request body as authoritative — always re-derive
  from the authenticated session / DB.
- Never log or store a client's password in plain text, even temporarily during account
  creation (generate + hash immediately, deliver the temp password out-of-band, e.g. email).
- Never let a client see or enumerate other clients' galleries — list/detail endpoints filter by
  `req.user.id` at the query level, not by hiding it in the frontend.

See **backend** for the Express/Prisma layer conventions this plugs into, and
**db-migrations** for the `User` / `Gallery` / `Photo` schema.
