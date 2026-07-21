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
| Media & Brand Director (Lead) | active | Resumed team on founder's "keep going" | `MEDIA_COORDINATION.md` | 2026-07-21: resumed after pause; re-engaged Car Data + Copywriter, dispatched Visual & Media Asset Designer. |
| Car Data & Spec Researcher | done | Complete: all 4 deliverables committed | `content/car-data/fleet-categories.json`, `content/car-data/car-specs.json`, `content/car-data/pricing-structure.md`, `content/car-data/rental-details.md` | 2026-07-21: all 4 files done and committed (`552c9d4`). 8 fleet categories, 24 sample vehicles, pricing + rental-terms reference docs. Seasonal/rate-tier pricing explicitly flagged as proposal-only per CLAUDE.md. Not pushed. |
| Copywriter & Client Hook Strategist | active | Starting: landing-headlines.md, cta-library.md, client-hooks.md, onboarding-messaging.md | `docs/marketing/copy/` | 2026-07-21: resumed, had not started before the pause. |
| Visual & Media Asset Designer | active | Starting: style-guide.md, logo-guidelines.md, asset-specs.md | `docs/marketing/brand/`, `frontend/public/assets/media/` | 2026-07-21: dispatched for the first time. |

## Notes log (append-only, most recent last)

- **2026-07-21 — Director:** Team stood up. Roles, directory ownership, and no-code-lane rule
  established. Repo has an unpushed engineering commit ahead of `origin/main` (webhooks SSRF
  fix) — media commits stay local until the Director confirms a push plan with the founder.
- **2026-07-21 — Director:** Founder asked to pause all Media & Brand work (session limits) and
  confirmed the app itself stays running for review. Verified: backend `:5406` → 200,
  frontend `:3002` → 200, `carhub-db` container healthy — nothing restarted, no risk taken.
  All in-flight subagents stopped; nothing committed since the initial coordination-file commit
  (`content/car-data/fleet-categories.json` is on disk, uncommitted). Team is idle until the
  founder says to resume.
- **2026-07-21 — Director:** Founder said to keep going. Resumed Car Data & Spec Researcher and
  Copywriter & Client Hook Strategist, and dispatched Visual & Media Asset Designer for the
  first time.
- **2026-07-21 — Car Data & Spec Researcher:** Finished all 4 deliverables under
  `content/car-data/`: `fleet-categories.json` (8 categories, EN+FR names, MAD daily-rate and
  deposit ranges), `car-specs.json` (24 sample vehicles typical of the Moroccan rental market —
  Dacia/Renault/Peugeot/Hyundai/VW/Kia/Toyota/Fiat/Mercedes/BMW/Ford — with `category` values
  matching the fleet-categories ids), `pricing-structure.md` (base rate, weekly/monthly discount
  bands, deposit HOLD→RETURN/CLAIM lifecycle described narratively to match the real product,
  20% VAT display conventions, extra-driver and young-driver fees, cross-border fee note,
  seasonal pricing explicitly marked as a proposal-for-consideration since CLAUDE.md lists rate
  tiers as not-yet-built), `rental-details.md` (min age/licence-years, CIN vs passport+IDP docs,
  payment methods, 3 insurance tiers, full-to-full fuel policy, deposit coverage, cancellation
  bands). Both JSON files validated (`python3 -m json.load`) and cross-checked — every
  `car-specs.json.category` value exists in `fleet-categories.json`. Committed content as
  `552c9d4`; touched no files outside `content/car-data/` and my own status-board row. Not
  pushed.
