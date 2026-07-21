# MEDIA_COORDINATION — Media & Brand team

> Tracking file for the **Media & Brand team** (Car Data & Spec Researcher, Copywriter &
> Client Hook Strategist, Visual & Media Asset Designer), led by the Media & Brand
> Director. This is a **content/asset lane**, separate from [COORDINATION.md](COORDINATION.md)
> (the engineering team's channel — Architect / Frontend Developer / QA Tester). Same repo,
> disjoint files, disjoint purpose: nothing here should ever touch backend logic, `schema.prisma`,
> or `.ts`/`.tsx` application code. Source of truth for brand/product facts: `CLAUDE.md`,
> `docs/DESIGN_VISION.md` (Phase 12, shipped — "Graphite & Brass — Concierge"), `docs/AUDIT_BACKLOG.md`.

## Golden rules

1. **Stay in your lane.** Only touch files under your role's directories (below). Never edit
   anything in `backend/`, `frontend/src/**/*.ts(x)`, `prisma/schema.prisma`, or `COORDINATION.md`
   — that's the engineering team's, and a live engineering session may have uncommitted work in
   the tree right now (`git status` before you start).
2. **Don't re-litigate shipped design.** Phase 12 ("Fider Lux") already picked the palette,
   type system, and imagery kit (`frontend/src/app/globals.css` `@theme`, `frontend/src/components/ui/`).
   Your job is to *extract and document* it for marketing/content use, and to *extend* it with new
   assets that fit — not propose a redesign.
3. **No fabricated claims.** This product has a documented history of fake-success UI (a mocked
   "AES-256 encryption applied" toast on Guardian Vault, now fixed for real) — don't repeat that
   pattern in copy. Don't claim a certification, integration, or security property the product
   doesn't actually have. When unsure, phrase it as a capability, not a claim ("bank-level document
   handling flow" not "bank-grade encryption" unless verified).
4. **Commit small, commit often, don't push.** `git add <specific files>` (never `-A` — there may
   be other in-progress work in the tree), conventional commit message, commit locally. **Do not
   `git push`** — the repo is currently 1 commit ahead of `origin/main` from other in-progress
   work that isn't yours to push. The Director will confirm the push separately.
5. **Only edit your own row** in the status board below, and keep entries append-only (like
   `COORDINATION.md`'s findings log) — don't rewrite another role's notes, add a new dated note
   instead.

## Directory ownership

| Role | Owns | Nothing else |
|---|---|---|
| **Car Data & Spec Researcher** | `content/car-data/**` | |
| **Copywriter & Client Hook Strategist** | `docs/marketing/copy/**` | |
| **Visual & Media Asset Designer** | `docs/marketing/brand/**`, `frontend/public/assets/media/**` (additive only — never edit/overwrite the existing shipped `frontend/public/logo.svg`, `logo-icon.svg`, `hero-illustration.svg`) | |

## 🔴 Live status board

| Role | Status | Current task | Files touched | Notes |
|---|---|---|---|---|
| Media & Brand Director (Lead) | active | Set up team, dispatched 3 subagents | `MEDIA_COORDINATION.md` | 2026-07-21: initialized this file and the directory lanes. |
| Car Data & Spec Researcher | pending | — | — | — |
| Copywriter & Client Hook Strategist | pending | — | — | — |
| Visual & Media Asset Designer | pending | — | — | — |

## Notes log (append-only, most recent last)

- **2026-07-21 — Director:** Team stood up. Roles, directory ownership, and no-code-lane rule
  established. Repo has an unpushed engineering commit ahead of `origin/main` (webhooks SSRF
  fix) — media commits stay local until the Director confirms a push plan with the founder.
