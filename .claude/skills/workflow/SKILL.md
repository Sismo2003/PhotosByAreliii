---
name: workflow
description: How to approach any non-trivial task in this repo — understanding before editing, planning, executing minimal-scope edits, verifying safely, and summarizing. Use for any implementation task, bug fix, or feature across the whole project (landing, admin, client portal, backend).
---

# How to work in this repo — photosByArelli

This skill is about *process*, not domain knowledge. For what the code looks like, see the
**backend**, **frontend**, **auth-gallery**, **landing-seo**, **site-config**, and
**db-migrations** skills — load whichever matches the area you're touching, in addition to this
one.

## 1. Understand before touching anything

- Read the actual code at the point of change — don't infer behavior from a filename or a
  similar-looking feature in another project (rebate/sharkids-system/planner are references for
  *conventions*, not ground truth for *this* codebase once it diverges).
- Trace a change one level further than feels necessary: if you're touching an endpoint that
  returns photos, check both the admin upload path and the client download path — they share the
  same `Photo` model and access-control rules (see **auth-gallery**).
- This is a client project mid-rebranding: brand name, logo, and colors are **default/placeholder**
  on purpose (see **site-config**). Don't "fix" the placeholder branding without being asked —
  it's a deliberate temporary state, not an oversight.

## 2. Reason like this, out loud when it matters

- State the failure mode or root cause explicitly before writing a fix — "X happens because Y" —
  not just "this should fix it."
- For genuinely ambiguous scope or an implementation choice with real tradeoffs, say what you'd
  default to and why in one or two sentences, rather than silently picking one.

## 3. Plan for anything bigger than a one-file fix

- Small, well-understood fixes: just make the edit.
- Anything touching multiple files/layers, a schema change, or a new feature: sketch the plan
  first — files to touch, the order, and any Prisma migration needed (see **db-migrations**).
- **Scope discipline**: only touch what the task requires. Don't refactor, rename, or
  "modernize" surrounding code as a side effect.

## 4. Execute edits

- Match the existing pattern in the file/feature you're editing over introducing a new one.
- No half-finished states: if you start a multi-step change (e.g. a new Prisma model + migration
  + controller + route + frontend page), finish all the pieces in the same turn rather than
  leaving it partially wired.
- New JS/TS logic goes in proper modules (`utils/`, `services/`, etc.) with named exports — not
  inlined into components or scripts.

## 5. Verify

- Read the code for logical correctness first (most of the work).
- Syntax/type checks (`node --check`, `tsc --noEmit`, linting) where useful.
- For UI or upload/download flows, actually run the app and click through the golden path before
  calling it done (see the **run** skill for launching dev servers) — auth and file-upload bugs
  rarely show up from reading code alone.
- State plainly what you did and didn't verify.

## 6. Photos and secrets are never committed to git

- Real client photos, `.env` files, JWT secrets, and DB credentials never get committed or
  written into any doc (including `wiki/`, see **bitacora**). `uploads/` and `.env*` belong
  in `.gitignore` from the first commit.

## 7. Document and summarize

- After any substantial piece of work (new feature, non-trivial fix, architecture decision),
  write it up per the **bitacora** skill in `wiki/` — this is what lets the next session (or
  the next agent) pick up without re-exploring the codebase.
- End-of-task summary to the user: what changed and what's next, in a sentence or two.
- Only commit / push when explicitly asked.
