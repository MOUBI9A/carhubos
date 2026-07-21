# Fider — Marketing Style Guide

> **Status:** documents an already-shipped system. Phase 12 ("Fider Lux" / "Graphite & Brass —
> Concierge") is complete and locked — this guide does not propose changes, it extracts the real
> tokens for marketing/media use so social posts, decks, and one-pagers stay visually consistent
> with the product. Every value below is read directly from
> `frontend/src/app/globals.css` (the `@theme` block) and `docs/DESIGN_VISION.md`. If the app is
> ever re-themed, re-run this extraction — don't hand-edit stale numbers here.
>
> Owner: Visual & Media Asset Designer (Media & Brand team). See `MEDIA_COORDINATION.md` for team
> context and directory ownership.

---

## 1. Brand tone

Fider is **"the trust layer for mobility"** — a multi-tenant car-rental ERP for Moroccan agencies
(currency MAD, 20% VAT), publicly positioned as a **boutique hospitality / private-concierge**
product, not a generic SaaS analytics dashboard. Per `docs/DESIGN_VISION.md` §3:

- **Warm, not cold.** The product kept dark mode but replaced a near-black + neon-violet
  "crypto dashboard" look with a warm graphite base, cream text/surfaces, and a restrained accent
  pair (violet + brass).
- **Humanized, not templated.** Real photography (agencies, cars, hand-over moments), human
  avatars, and photographic empty-states are treated as first-class — the pre-rebuild product had
  *zero* real imagery, which read as unfinished and untrustworthy for a product whose whole pitch
  is trust between strangers handing over a car and an ID.
- **Editorial, generous, one idea per section** on public/marketing surfaces; the authenticated
  dashboards stay information-dense (correct for an ops tool) but borrow the same warmth.
- **One coherent brand top to bottom** — public site, owner dashboard, agent/admin/renter portals
  all read as the same product.

For marketing collateral: favor **confident, warm, human copy and imagery over hype or
"AI dashboard" cliché visuals** (no generic stock-photo laptop-and-graph shots, no cold blue
gradients, no glowing neon). Think boutique hotel concierge desk, not fintech dashboard demo.

---

## 2. Color tokens

All values below are the literal `@theme` tokens in `frontend/src/app/globals.css` (lines ~22–67,
Phase 12). HSL is the source of truth (that's what ships); hex is a straight conversion for tools
that need it (decks, image editors) — recompute from the HSL if `globals.css` ever changes rather
than trusting a stale hex.

### Core surfaces (warm graphite)

| Token | HSL (`globals.css`) | Hex (computed) | Usage |
|---|---|---|---|
| `--color-background` | `hsl(30 9% 7%)` | `#131210` | App shell background — warm near-black, not pure black. |
| `--color-surface` / `--color-card` | `hsl(30 8% 10.5%)` | `#1D1B19` | Default card/panel surface (`.glass`, `.glass-card`). |
| `--color-surface-raised` | `hsl(32 9% 14%)` | `#272420` | Raised panels, hover state for `.glass-card`. |
| `--color-hairline` / `--color-border` | `hsl(32 9% 20%)` | `#38332E` | 1px hairline borders — never a hard white/black rule. |
| `--color-foreground` | `hsl(38 28% 94%)` | `#F4F1EB` | Primary text on dark surfaces — warm off-white, not pure `#fff`. |

### Accent pair (the whole point of the system)

| Token | HSL | Hex (computed) | Usage |
|---|---|---|---|
| `--color-primary` (violet) | `hsl(266 58% 66%)` | `#A276DB` | **The single interactive accent** — buttons, links, focus rings, active states. Restrained (not the old saturated neon `hsl(270 100% 60%)`). |
| `--color-violet-soft` | `hsl(266 40% 22%)` | `#35224F` | Violet-tinted subtle backgrounds/badges. |
| `--color-metal` (brass) | `hsl(40 56% 58%)` | `#D0A858` | **Premium moments ONLY** — CTAs, `TrustSeal`, plan-tier badges, hero KPIs, the `seal-rule` divider. Per `globals.css`'s own comment: *"premium moments ONLY (CTA, trust seal, plan tier, hero KPI)"*. Never smear brass across every element — that was the exact mistake the old system made with violet. |
| `--color-metal-soft` | `hsl(40 42% 42%)` | `#987A3E` | Muted brass for hover/soft states, `.metal-hairline` gradient ends. |
| `--color-cream` | `hsl(42 44% 90%)` | `#F1EADA` | The "trust paper" tone — contracts/invoices/consent screens render on cream (`.document` utility) so the hand-over moment feels physical, per `DESIGN_VISION.md`. |

**Brass usage rule (verbatim intent from `globals.css`'s inline comment):** *"Warm metallic accent
— use sparingly."* If you're reaching for brass more than once per marketing asset (one CTA, one
seal, one accent line), you're overusing it — fall back to violet or plain cream/foreground.

### Semantic colors (status)

| Token | HSL | Hex (computed) | Usage |
|---|---|---|---|
| `--color-success` | `hsl(150 46% 46%)` | `#3FAB75` | Confirmations, positive deltas. |
| `--color-danger` / `--color-destructive` | `hsl(6 64% 56%)` | `#D75547` | Errors, destructive actions, negative deltas. |
| `--color-warning` | `hsl(38 72% 55%)` | `#DFA23A` | Warnings, pending states. |
| `--color-info` | `hsl(202 46% 56%)` | `#5B9DC2` | Informational/neutral status. |

These are warm-tuned (not the stock red/green/amber/blue you'd get from a default Tailwind
palette) — keep that warmth if recreating status colors in external tools (decks, print).

### What NOT to use

- The pre-rebrand palette is gone: near-black `hsl(222 47% 4%)` background and saturated neon
  violet `hsl(270 100% 60%)` primary (documented as the "before" state in `DESIGN_VISION.md` §2,
  explicitly retired). Don't pull these from old screenshots, mockups, or the repo's git history.
- Don't invert the brass rule — brass is a rare accent, not a base color. No brass backgrounds,
  no brass body text, no brass-on-brass.

---

## 3. Typography

Font stack, per `globals.css` `@theme` and `frontend/src/app/layout.tsx` (Phase 12 comment block,
verbatim): *"Fraunces = warm editorial serif for marketing display only. Hanken Grotesk = humanist
grotesque for all UI/body (replaces cold Inter). IBM Plex Mono = tabular figures for money (MAD),
plates, CIN/contract IDs. Noto Sans Arabic = body/UI when locale is AR (RTL)."*

| Role | Font | Token | Where it's used |
|---|---|---|---|
| Display / editorial headlines | **Fraunces** (serif) | `--font-display` / `.display` utility | Marketing hero and section headlines **only** — landing page, not in-app dashboards. Weight 500, tight tracking (`-0.02em`), tight leading (1.05). |
| UI / body / in-app headings | **Hanken Grotesk** (humanist sans) | `--font-sans` (default) | Everything else — nav, buttons, body copy, dashboard headings. |
| Tabular / monospace | **IBM Plex Mono** | `--font-mono` / `.font-mono`/`.tabular` | Money amounts (MAD), license plates, CIN/contract IDs — anything that benefits from tabular figures. Loaded at weights 400/500/600. |
| Arabic (RTL locale) | **Noto Sans Arabic** | `--font-arabic` | Body/UI when `<html dir="rtl" lang="ar">` (Phase 7 i18n). |

For marketing assets in French/English, pair **Fraunces for the headline** with **Hanken Grotesk
for supporting copy** — that combination *is* the brand voice visually. Don't substitute Georgia,
Times, or a generic system serif for Fraunces even as a fallback in casual assets (the `globals.css`
fallback stack is `"Fraunces", Georgia, "Times New Roman", serif` — only use those as a true
last-resort web-font-unavailable fallback, not a stylistic choice).

### Hierarchy rule — read this before designing any heading

`globals.css` §base layer (lines ~115–122) states this explicitly:

> *"Calm, human headings — NO forced uppercase / font-black. Real hierarchy comes from weight +
> size + the `.display` / `.eyebrow` utilities."*

This is a **deliberate reversal** of the pre-rebuild system, which forced
`h1–h6 { tracking-tighter font-black uppercase }` on every heading including renter-facing consent
screens (documented as the #1 typographic problem in `DESIGN_VISION.md` §2 — *"Every heading in
the product... shouts in bold caps"*). That rule was killed app-wide in Phase 12 (confirmed by a
final sweep, 0 files, per `CLAUDE.md` §10). **Do not reintroduce blanket uppercase or `font-black`
in marketing headings.**

The one place uppercase survives, per the `.eyebrow` utility (`globals.css` line ~141, comment:
*"The ONLY place uppercase survives: small labels / eyebrows / column heads."*):

- Small eyebrow labels above a headline (e.g. "TRUST NETWORK" above a section title)
- Column headers / small badges
- Spec: `text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; font-size: 0.6875rem` (11px), color `--color-text-faint` (`hsl(33 11% 48%)`)

Concretely, for marketing headline hierarchy:

- **Hero/section headline:** Fraunces, sentence case (not all-caps), weight ~500, tight tracking.
- **Eyebrow (optional, above headline):** Hanken Grotesk, small, uppercase, wide letter-spacing —
  the *only* uppercase usage.
- **Body/supporting copy:** Hanken Grotesk, sentence case, regular weight.
- **Money/IDs/plates:** IBM Plex Mono, tabular figures.

---

## 4. Surfaces, radii & elevation

For any mockup, ad, or deck slide that needs to *show* the product UI (screenshots, device
frames), keep these consistent with the real system (`globals.css`):

- **Radii:** `--radius-xl: 1.25rem` (20px) · `--radius-lg: 1rem` (16px) · `--radius-md: 0.75rem`
  (12px) · `--radius-sm: 0.5rem` (8px). Cards/panels round generously — nothing sharp-cornered.
- **Card surface:** `.glass-card` = solid warm surface (`--color-surface`) + 1px hairline border +
  soft shadow. **Not** a translucent blur — the old glassmorphism ("blurred translucent
  white-on-black panels... reads as a Tailwind template, not a brand," per `DESIGN_VISION.md` §2)
  was retired in favor of solid "matte card stock." The one surviving true-glass/blur treatment
  (`.scrim`) is reserved for chrome floating over photography (sticky nav, overlays) — not for
  general cards.
- **Shadows:** warm and low-contrast, not hard black drops — e.g. `--shadow-md: 0 6px 16px -8px
  hsl(30 30% 2% / 0.5)`. If recreating a card shadow in a design tool, use a warm near-black
  (`hsl(30 30% 2%)`), not neutral/cool black.
- **"Paper grain":** dark surfaces get a faint (2.8% opacity) noise overlay so they read as matte
  card stock rather than flat digital black — a subtle texture cue worth echoing in print/deck
  treatments of dark panels.
- **The "trust paper" moment:** contracts, invoices, and consent/QR screens invert to a cream
  background (`.document` utility: `--color-cream` background, dark graphite text
  `hsl(30 14% 13%)`, warm border, larger shadow) — "so the hand-over feels physical" per the
  in-code comment. Use this cream/dark-text pairing whenever marketing materials depict a
  contract, invoice, or ID/consent moment.
- **Seal divider:** a hairline rule with a centered brass diamond (`.seal-rule` /
  `SealDivider` component) marks a premium or trust section break — the recurring metallic motif
  across the product. Useful as a section divider in decks/one-pagers that want to echo the brand.

---

## 5. Do / Don't summary

**Do**
- Use violet as the one interactive accent color; use brass only for a single premium/trust
  moment per asset.
- Use Fraunces for headlines, Hanken Grotesk for everything else, sentence case throughout.
- Use warm graphite + cream, generous rounded corners, soft warm shadows.
- Depict real or AI-generated warm-toned photography (agencies, cars, hand-over moments) — see
  `asset-specs.md` for specs.

**Don't**
- Don't revive the pre-rebrand near-black + neon-violet + all-caps-font-black look.
- Don't use brass as a base/background color or repeat it more than once in the same asset.
- Don't use a cold sans (Inter, Helvetica, system-ui) as a stylistic substitute for Hanken Grotesk,
  or a generic serif in place of Fraunces.
- Don't depict generic "SaaS dashboard" stock imagery (laptop + line chart, blue gradients,
  abstract network globes) — it contradicts the boutique-hospitality positioning.

---

*Sources: `frontend/src/app/globals.css` (`@theme` block + base/utilities layers), `frontend/src/app/layout.tsx` (font loading + Phase 12 comment block), `docs/DESIGN_VISION.md` §2–3, `CLAUDE.md` Phase 12 entry.*
