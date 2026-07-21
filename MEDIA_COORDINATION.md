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
| Copywriter & Client Hook Strategist | done | Complete: all 4 deliverables committed | `docs/marketing/copy/landing-headlines.md`, `docs/marketing/copy/cta-library.md`, `docs/marketing/copy/client-hooks.md`, `docs/marketing/copy/onboarding-messaging.md` | 2026-07-21: all 4 files done. Read `frontend/messages/en.json` (`landing`/`auth`/`nav` namespaces) + the actual `_components/*.tsx` for the real shipped voice before drafting — options are alternates to the live copy, not blind rewrites. No fabricated certifications/claims (checked `#enterprise` tile list stays paired with real properties only). Each file flags French/Arabic localization as a translator follow-up, not done here. Not pushed. |
| Visual & Media Asset Designer | done | Delivered style-guide.md, logo-guidelines.md, asset-specs.md + 2 new SVG assets | `docs/marketing/brand/style-guide.md`, `docs/marketing/brand/logo-guidelines.md`, `docs/marketing/brand/asset-specs.md`, `frontend/public/assets/media/logo-reversed.svg`, `frontend/public/assets/media/logo-icon-monochrome.svg` | 2026-07-21: all 3 docs + 2 supplementary logo variants delivered, grounded in `globals.css`/`DESIGN_VISION.md`/component code. Did not touch any existing `frontend/public/` file, `.ts`/`.tsx`, or `globals.css`. Ready for Director review. |

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
- **2026-07-21 — Copywriter & Client Hook Strategist:** Finished all 4 deliverables under
  `docs/marketing/copy/`: `landing-headlines.md` (5-8 hero options plus section headlines for
  `#solutions`/Trust Console, `#enterprise`, and the honest-capability tiles, each cross-checked
  against real shipped capability so nothing overclaims), `cta-library.md` (button copy grouped
  by funnel stage — top-of-funnel landing through bottom-of-funnel signup, plus in-app
  upgrade/upsell copy for the BETA-free plan tiers), `client-hooks.md` (10 pain-point hooks for
  Moroccan agency owners — double-bookings, cross-agency renter blind spots, damage disputes,
  paperwork, staff accountability, VAT/cash reconciliation, idle fleet, document-expiry
  compliance, outgrowing spreadsheets, the trust network effect), `onboarding-messaging.md`
  (signup → first car → first booking → first-completed-rental "you're live" moment, plus a
  bonus short section for renter-portal consent/QR onboarding). Read the real shipped landing
  copy (`frontend/messages/en.json` `landing`/`auth`/`nav`, and all four
  `(public)/landing/_components/*.tsx`) before drafting, so voice matches rather than
  contradicts what's live. Kept the existing "no fabricated claims" rule strict: flagged the
  `#enterprise` headline must stay paired with its real property list, explicitly listed what
  not to claim (SOC 2/ISO/bank-grade/uptime SLA/unverified counts), and didn't invent a
  network-size number for the hooks file. Every file carries a closing note that
  French (default locale) + Arabic (RTL) localization is a translator follow-up, not done here.
  Touched no files outside `docs/marketing/copy/` and my own status-board row. Not pushed.
- **2026-07-21 — Visual & Media Asset Designer:** Finished all 3 deliverables under
  `docs/marketing/brand/`: `style-guide.md` (real color tokens with computed hex + usage rules,
  read verbatim from `frontend/src/app/globals.css`'s `@theme` block — e.g. `--color-metal:
  hsl(40 56% 58%)` = `#D0A858`, "premium moments ONLY" per the file's own comment; type system —
  Fraunces/Hanken Grotesk/IBM Plex Mono/Noto Sans Arabic per `layout.tsx`; the killed
  blanket-uppercase-font-black rule and the surviving `.eyebrow`-only uppercase exception, both
  quoted from `globals.css`'s base layer), `logo-guidelines.md` (described `logo.svg` /
  `logo-icon.svg` from an actual read — found a real contrast issue: `logo.svg`'s "Fider" wordmark
  is filled `#2A2E30`, dark graphite, and is not legible on the product's own dark background
  `hsl(30 9% 7%)`/`#131210` — documented as the reason a reversed variant was needed), `asset-specs.md`
  (car/agency/banner/avatar specs mapped to `AgencyImage`/`CarPhoto`/`Avatar`/`Seal.tsx` — pinned
  ratios from actual code, e.g. `CarPhoto`'s hardcoded `3/2`, plus every real `ratio=` value grepped
  across `frontend/src/app/`; flagged the social-share 1200×630 spec as an external convention, not
  a pinned product spec). Added 2 supplementary SVGs under `frontend/public/assets/media/`
  (existing `logo.svg`/`logo-icon.svg`/`hero-illustration.svg` untouched): `logo-reversed.svg`
  (light-on-dark wordmark, cream text + the same brass gradient stops as `globals.css`'s
  `.metal-text` utility) and `logo-icon-monochrome.svg` (single-ink evenodd silhouette of the
  shield+"F" cutout, for engraving/1-color-print/watermark use). Both validated as well-formed XML
  after fixing one invalid `--` sequence inside an SVG comment. No `.ts`/`.tsx`/`globals.css`/
  `schema.prisma` files touched. Not pushed.
