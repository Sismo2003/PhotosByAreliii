---
name: client-portal
description: Rules for the client portal (client/ app at /client/), the shared sign-in page /login, the /api/client/* endpoints and "Preview as client". Use whenever creating or editing anything under client/, Backend/*client-portal*, Backend/middlewares/client-scope.middleware.js, the admin's gallery viewer (it must stay identical in both portals) or the sign-in flow.
---

# Client portal — rules

Plan and decisions: `docs/portal-cliente-plan.md` (read §0 and §6 first). Built so far: sign-in,
first-password screen, available galleries, gallery grid + simple viewer, read-only profile, EN/ES.

## 1. One sign-in page for everybody
- `photosbyareliii.com/login` is served by the **client/** app (route `/login`, outside the `/client`
  base). nginx sends `/admin/login` and `/client/login` there. The admin has **no** sign-in page.
- After signing in, `destinationFor()` (`client/src/app/auth.jsx`) uses the role from the API:
  ADMIN → `/admin/…`, CLIENT → `/client/…` (or `/client/welcome` while `mustChangePassword`).
- `?redirect=` only accepts our own paths (`/admin…` for admins, `/client…` for clients). Never an
  absolute URL. nginx never decides by role (it can't verify the JWT).
- Dev: client on :5175, admin on :5174; cookies ignore the port so one session serves both.
  `VITE_ADMIN_ORIGIN` / `VITE_LOGIN_ORIGIN` in each app's `.env.development`.

## 2. API security (non-negotiable)
- Every `/api/client/*` route sits behind `requireClientScope`; controllers use **only**
  `req.scope.clientId`. Never read a client/user/gallery id from body or query to decide access.
- Load the resource and check ownership in the **same query** (`galleryScope(scope)` in
  `models/client-portal.model.js`). Not theirs / not delivered / expired / hidden → **404**.
- Explicit `select`s. Never return file paths, `hidden`, `keep`, PIN, gallery password,
  private notes, or anything about other clients.
- Files: `sendFile(rel, { root: STORAGE_PATH })`, `Cache-Control: private`. Originals are never sent as stored: `services/photo-delivery.js`
  copies to `tmp/` and writes the rights with exiftool (camera data and GPS stay). Full quality only if `downloadMode = HIGH_AND_WEB`.
- **No upload route, ever.** Only the admin adds photos.
- Writes (favorites, profile…): idempotent or inside a transaction; catch unique-constraint
  errors instead of check-then-write. Preview (`scope.preview`) is GET-only and logs no activity.

## 3. UI
- Mobile first: bottom tab bar on phones (`AppShell.jsx`, add tabs to `TABS`), top bar from `md`.
  Safe areas with `--safe-top` / `--safe-bottom`; targets ≥ 44px.
- **No traditional tables and no plain cards** (the `admin-tables` skill does NOT apply here).
  Filters = horizontal chips; long lists paginate (cursor / floating island), photos scroll infinitely.
- `Skeleton` with the content's shape while loading; never "Loading…".
- Every string through i18next (`client/src/i18n/locales/en.json` + `es.json`, both always).
  Dates with Luxon (`utils/date.js`, studio zone), phones with libphonenumber-js.
- Same design system as admin: `client/src/styles/index.css` mirrors `admin/src/styles/index.css`
  tokens, `components/ui` mirrors the admin's. Change both together.

## 4. Parity with the admin
- **One Favorite per photo**, shared: the `favorites` row of the gallery's client (never `Photo.keep`). The admin calls it
  "Favorite" too. History lines use the client's first name, one line per download action.
- The gallery viewer must look and behave like `/admin/galleries/:id`. Planned: move the admin
  viewer/grid into `shared/` with `api` + `can` props (plan §3) and use it from both apps. Until
  then, any change to the admin's viewer gets noted as pending for the client's `Viewer.jsx` and `components/viewer/`.
- Gallery cover: `client/.../gallery/Hero.jsx` draws Full / Split / Minimal (`coverLayout`), and the
  admin's `CoverPreview` (`admin/.../gallery/CoverTab.jsx`) draws the same three in miniature with the
  same text. Change both together.
- "Preview as client" will be this same app with `X-Preview-Client` (plan §5), never a copy:
  every new screen must work read-only for Areli.
