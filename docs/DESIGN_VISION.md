# Fider — Design Vision & Frontend Rebuild Brief (Phase 12)

> Source of truth for the **visual/frontend rebuild**, same status as `PRODUCT_VISION.md` (product) and `AUDIT_BACKLOG.md` (engineering hardening). This doc defines what Fider must **look and feel** like, and ends with the exact prompt to hand to the build session.
> Written 2026-07-18 from a direct read of `frontend/src/app/globals.css`, the installed frontend stack, and the current component/page inventory. Nothing below is guessed — it reflects the code as it stands today.

---

## 1. Why this phase exists

Fider (rebranded from "Infinity"/"CarHub") is functionally deep — 5 roles, a capability engine, a cross-tenant trust network, a renter portal with consent/QR — but it **looks like an unfinished admin template**, not a premium product a car-rental agency owner would trust with their business, or a renter would feel good handing their ID to. The product is close to market-ready on the backend; the frontend has never had a real design pass. This phase fixes that, without touching business logic.

---

## 2. Current-state design audit

Read directly from `frontend/src/app/globals.css` and the component tree:

- **Dark-only, no light mode.** Background `hsl(222 47% 4%)` (near-black) with two purple radial gradients. No theme toggle exists.
- **One accent color doing everything.** `--color-primary: hsl(270 100% 60%)` — a saturated neon violet — is the only signal color, reused for buttons, focus rings, glow text, and links. Nothing distinguishes "premium" from "generic AI dashboard."
- **Glassmorphism everywhere.** `.glass` / `.glass-card` (blurred translucent white-on-black panels) is the one visual motif used across every dashboard, card, and modal in all 4 role-portals. It reads as a Tailwind template, not a brand.
- **Aggressive typography.** Global rule: `h1–h6 { tracking-tighter font-black uppercase }`. Every heading in the product — including renter-facing consent screens — shouts in bold caps. There is no typographic hierarchy beyond size; nothing feels warm, readable, or human.
- **Zero real imagery.** `frontend/public/` contains only the five default Next.js placeholder SVGs (`next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`). Only 2 files in the entire `src/` tree reference `next/image`/`<img>` at all. A **car-rental platform has no photo of a car, an agency, or a person anywhere in the product.**
- **Brand identity is inconsistent.** CSS utility classes are still named `.btn-infinity`, `.btn-primary-infinity`, `.btn-outline-infinity` from the pre-rebrand name, even though the public-facing brand is now "Fider."
- **Real foundation already installed and under-used**: shadcn primitives, Base UI, `framer-motion`, `lucide-react`, Tailwind v4 (CSS-first `@theme` tokens in `globals.css`, no `tailwind.config`). This is a good stack for a real design system — it's just never been used as one.
- **Scope**: public marketing site (`(public)/landing`), and 4 authenticated portals — `(owner)/dashboard` (18 sections: fleet, bookings, finance, staff, vault, hub, etc.), `(agent)`, `(admin)`, `(renter)/portal` — plus `/login` and `/signup`. ~69 `.tsx` files total.

**In one sentence: it's a correct, capable product wearing a cold, generic, imageless "crypto dashboard" skin.**

---

## 3. Target look & feel — "lux, cool, humanized"

Fider sells trust between strangers (an agency and a renter handing over a car and an ID). The design should feel like a **boutique hospitality / private-concierge brand**, not a SaaS analytics tool. Concretely:

- **Warm, not cold.** Keep the dark mode (it suits an ops/dashboard product) but replace pure black + neon violet with a richer palette: deep charcoal/graphite base, a warm off-white/cream for light surfaces and text, and a **restrained accent pair** — the existing violet can stay as one accent, but paired with a warm metallic (brass/bronze/gold) tone used sparingly for premium moments (CTAs, trust badges, plan tiers) instead of being smeared across every button and glow.
- **Humanized, not templated.** Real photography is the single biggest gap. The product needs: hero imagery on the marketing site (agencies, cars, hand-over moments), human avatars for staff/renter accounts, photographic empty-states instead of bare icon-and-text, and car photos in the fleet/booking flows (the data model already has `CarDocument`/`CustomerDocument` — the UI should treat photos as first-class, not an afterthought). Where real agency/renter photos don't exist yet, use tasteful curated stock or AI-generated placeholder imagery with an explicit swap-in slot for real uploads later — don't ship another imageless product.
- **Calmer typography.** Drop the blanket `uppercase font-black` on every heading. Use weight and case to create real hierarchy: a confident but human display style for hero/landing headlines, sentence case and moderate weight for in-app dashboard headings, uppercase reserved only for small labels/eyebrows/badges (where it currently already half-works).
- **Editorial, generous layout on the public site.** The landing page should feel like a premium product site — big imagery, whitespace, one idea per section — not a stacked pile of glass cards. The authenticated dashboards can stay information-dense (that's correct for ops tools) but should borrow the same warmth: softer surfaces, real content over glass-blur decoration, motion used purposefully (`framer-motion` is already installed) rather than as texture.
- **One coherent brand, top to bottom.** No leftover `.btn-infinity`-style naming; a single documented design-token set (colors, type scale, spacing, radii) that every portal pulls from, so the public site, the owner dashboard, and the renter portal all read as the same product.
- **RTL-ready from the start.** Phase 7 (still open) requires French/Arabic (RTL)/English. Build the new design system on logical CSS properties (`ms-`/`me-`/`ps-`/`pe-` etc., not hardcoded `left`/`right`), so the redesign doesn't have to be redone for Arabic later.

**This is not a reskin of colors.** It's replacing the one existing visual motif (dark glass + neon purple + all-caps) with an actual design system, and closing the imagery gap that makes the product feel unfinished and untrustworthy.

---

## 4. Scope & sequencing (for whoever executes this)

1. **Design system first**: new token set in `globals.css` (`@theme`), typography scale, imagery/photography guidelines, spacing/radius/shadow scale, a small documented component kit (buttons, cards, inputs, badges, empty states, avatars) built on the existing shadcn/Base UI primitives — not a new library.
2. **Public marketing site** (`(public)/landing`, `/login`, `/signup`) — highest leverage, no auth complexity, sets the brand tone, good place to validate the new system before touching authenticated app.
3. **Owner dashboard** (largest surface, 18 sections) — apply the system portal by portal, reusing the new component kit rather than hand-styling each page.
4. **Agent / Admin / Renter portals** — same system; the renter portal especially needs the humanized treatment since it's the most consumer-facing surface (consent screens, document vault, notifications).
5. Verify each portal in the browser after restyling (dev server on `:3002`) before moving to the next — this is a visual change with real regression risk (broken layouts, contrast, RTL-readiness) even though business logic isn't touched.

**Explicitly out of scope**: backend, Prisma schema, API contracts, business/tenant logic, capability gating. This is a frontend presentation-layer rebuild only — functionality must not change.

---

## 5. The master prompt

Copy everything in the block below and send it as-is to continue the build:

---

**Rebuild the Fider frontend with a new "lux, humanized" design system. Read `docs/DESIGN_VISION.md` first — it's the full brief (current-state audit + target direction) and this prompt is the executable summary of it.**

**Goal:** Fider currently looks like a generic dark glass-morphism SaaS template (near-black background, one neon-purple accent used everywhere, `uppercase font-black` on every heading, and literally zero real photography anywhere in the product — check `frontend/public/`, it's only default Next.js placeholder SVGs). Replace this with a warm, premium, photographic design system across the **entire frontend**: the public marketing site, and all 4 authenticated portals (owner dashboard's 18 sections, agent, admin, renter).

**Direction:**
- Keep dark mode as the base but move off pure black + neon violet toward a warmer palette: deep charcoal/graphite surfaces, warm cream/off-white for light text and cards, the existing violet kept as one restrained accent paired with a warm metallic (brass/bronze/gold) tone used sparingly for premium moments — not smeared across every button.
- Replace the blanket all-caps/font-black heading rule with real typographic hierarchy: confident but human headline style for marketing, calmer sentence-case weight for in-app dashboards, uppercase reserved for small labels only.
- Add real imagery everywhere it's currently missing: marketing hero/section photography, human avatars for staff and renter accounts, photographic empty-states, and car photos treated as first-class in fleet/booking UI. Use tasteful curated stock or AI-generated placeholders where real photos don't exist yet, with an obvious slot to swap in real agency-uploaded photos later.
- Retire the leftover `.btn-infinity` naming and any other pre-rebrand ("Infinity") remnants in the design tokens — one consistent "Fider" brand end to end.
- Build on the stack that's already installed (Tailwind v4 `@theme`, shadcn, Base UI, `framer-motion`, `lucide-react`) — don't add a new UI library.
- Use logical CSS properties (not hardcoded left/right) so this doesn't have to be redone for the Arabic/RTL work in Phase 7.

**Process:** (1) design system first — tokens, type scale, a small reusable component kit; (2) public marketing site; (3) owner dashboard, section by section; (4) agent/admin/renter portals. Verify each portal in the browser (`npm run dev`, port 3002) before moving to the next — this touches every page, so regressions are easy to introduce. **Do not change backend code, the Prisma schema, API contracts, or any tenant/capability/business logic — presentation layer only.**

**Docs:** update `docs/AUDIT_BACKLOG.md` PHASE 12, `PROGRESS.md`, and `CLAUDE.md` at each milestone, per the existing project convention (§9 of `CLAUDE.md`).

---
