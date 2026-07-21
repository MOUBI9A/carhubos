# Fider — Marketing & Product Imagery Specs

> Specs for photography/illustration used in marketing collateral and in the product itself.
> Grounded in the real imagery components (`frontend/src/components/ui/AgencyImage.tsx`,
> `Avatar.tsx`, `Seal.tsx`) and the real shipped photography (`frontend/public/img/*.webp`) — read
> directly, not guessed. Where the component code doesn't pin an exact spec, that's called out
> explicitly as a recommendation pending confirmation, per instructions.

---

## 1. How the product actually consumes images

Three components form the "imagery kit" referenced in `CLAUDE.md` (Phase 12):

### `AgencyImage` (`frontend/src/components/ui/AgencyImage.tsx`)

The general-purpose photographic slot used everywhere in the app. Key facts read from the code:

- **Default aspect ratio: `16 / 9`** (prop `ratio`, CSS `aspect-ratio` string — any ratio string
  works, e.g. `"3 / 2"`, `"21 / 9"`).
- **`slot` prop** (`hero | car | agency | empty | generic`) selects the placeholder glyph
  (`KeyRound`, `Car`, `MapPin`, `ImageIcon`) shown when no `src` is provided — a warm gradient mesh
  background, never a blank grey box.
- **Color treatment on real photos:** every image gets `filter: saturate(0.92) contrast(1.03)
  brightness(0.97)` plus a `hsl(34 50% 24%)` overlay at 12% opacity in `mix-blend-mode: overlay`
  — a "shared warm golden-hour grade so every source reads as one set" (in-code comment). **New
  photography should be shot/selected to survive this grade** — avoid source images that are
  already very warm/orange (they'll oversaturate) or very cool/blue (the overlay will look muddy
  rather than warm).
- **Real aspect ratios actually used across the app** (grepped from every `ratio=` usage in
  `frontend/src/app/`): `1/1` (square — avatars/empty-state icons in list/detail pages), `3/2`
  (via `CarPhoto`, see below), `4/3` (landing page section), `5/3` (admin agency thumbnail),
  `16/9` (solutions/contact sections, agent inspection grid), `16/5`, `21/9`, `21/8` (wide
  cinematic banners — renter portal history/book pages, agency public profile hero, agent
  dashboard banner).

### `CarPhoto` (also in `AgencyImage.tsx`, not a separate file)

A specialized wrapper around `AgencyImage` for fleet/booking car photos:

- **Fixed aspect ratio: `3 / 2`** (hardcoded in the component, not configurable via a prop other
  than by not using `CarPhoto`).
- `slot="car"` (car glyph placeholder).
- Optional `plate` / `price` overlay chips rendered bottom-of-frame over a dark gradient scrim —
  **leave clear space in the bottom ~20% of the frame** when composing/cropping car photos so
  these chips don't cover the car itself.

### `Avatar` (`frontend/src/components/ui/Avatar.tsx`)

- **Default size: `40px`** (square, `size` prop in px, renders as a circle via `rounded-full`).
- No real photo → a deterministic warm-hued monogram (initials), never a generic grey person icon.
- `verified` prop adds a brass ring (`ring-metal`) — the visual "verified" signal for renter/staff
  identity.
- **Recommendation for real avatar uploads** (not pinned in code, since the component just does
  `object-cover` on whatever `src` gives it): square, **min. 256×256px**, face/subject centered
  (component crops via `object-cover` so off-center subjects will be cropped at small sizes).

### `TrustSeal` / `SealDivider` (`frontend/src/components/ui/Seal.tsx`)

- **Default size: `44px`.** A circular brass-bordered badge with a `ShieldCheck` icon — not a
  photographic asset, an icon-based UI element. No image spec needed; mentioned here so marketing
  materials that want to depict "verified" use the same brass-ring-and-shield visual language
  rather than inventing a new trust icon.

---

## 2. Real shipped photography (for reference / consistency)

`frontend/public/img/` currently has three real photographs (WebP, AI-generated per
`CLAUDE.md`/`AUDIT_BACKLOG.md`, commit `10fddb0`) plus two static placeholder SVGs. Actual files
and dimensions on disk:

| File | Dimensions | Aspect | Used on |
|---|---|---|---|
| `hero-handover.webp` | 1200×896 | ~4:3 | Landing page hero, `/login` split panel |
| `agency-storefront.webp` | 896×1200 | ~3:4 (portrait) | `/signup` split panel |
| `car-street.webp` | 1264×848 | ~3:2 | Renter portal history, renter booking banner, agent inspections |
| `img/placeholder-avatar.svg` | 100×100 | 1:1 | Static fallback graphic (not currently referenced by any component — `Avatar` generates its monogram placeholder in CSS instead) |
| `img/placeholder-car.svg` | 200×120 | ~5:3 | Static fallback graphic (not currently referenced by any component — `AgencyImage`/`CarPhoto` generate their gradient-mesh placeholder in CSS instead) |

**Format/resolution takeaway:** ship new marketing/product photography as **WebP**, roughly
**1200px on the long edge** (matches the existing set — large enough for hero use, small enough to
stay performant), warm-toned but not already oversaturated (see the grading note in §1).

---

## 3. Spec recommendations by use case

Where the component code pins a ratio/size (§1), that's authoritative. Where it doesn't, these are
**sensible standard recommendations, pending confirmation against actual component/page code** if
a new use case emerges.

### Car listing / fleet photos
- **Aspect ratio: 3:2** (matches `CarPhoto`'s fixed ratio).
- **Min resolution:** 1200×800px (allows the component to display large without upscaling; also
  covers the wide `16/9`/`21/9` banner crops used elsewhere in the fleet/booking flow).
- **Background/lighting:** clean, neutral outdoor or studio background; avoid busy urban clutter
  that competes with the "plate/price" overlay chips rendered in the bottom ~20% of frame (leave
  that zone relatively simple/dark so light-colored text stays legible). Match the warm grade in
  §1 — natural daylight or warm golden-hour light works best with the applied color treatment;
  flat cool/blue-lit studio shots will look muddy after the overlay.
- **Format:** WebP preferred (matches shipped assets); PNG/JPG acceptable as source before
  conversion.

### Agency profile imagery
- **Aspect ratio:** flexible per placement — `AgencyImage`'s `slot="agency"` has been used at
  `21/9` (public agency profile hero) and `5/3` (admin thumbnail). **Recommendation: shoot/crop
  agency storefront photography at a wide ratio (16:9 to 21:9)** so it works across both without
  re-cropping, and provide a `1:1` center-cropped variant for avatar-style agency thumbnails.
- **Min resolution:** 1600×700px for the wide hero use case.
- Subject: agency storefront/office exterior, fleet lineup, or a hand-over moment — consistent
  with the "humanized, boutique hospitality" direction in `style-guide.md` §1, not a generic
  office-building stock photo.

### Promotional banners — landing hero
- **Aspect ratio: 4:3**, matching the actual `ratio="4 / 3"` used on the shipped landing page
  hero image placement (`frontend/src/app/(public)/landing/page.tsx`).
- **Min resolution:** 1600×1200px (comfortably covers large desktop hero display without
  upscaling; the shipped `hero-handover.webp` ships at 1200×896, so treat that as the current
  practical floor and prefer larger for new assets).
- Composition: leave the upper-left/headline area (where Fraunces display type typically sits per
  `style-guide.md` §3) relatively uncluttered for text legibility, or plan a `.scrim`-style overlay
  panel (per `style-guide.md` §4) behind the headline.

### Promotional banners — social share
- **Recommendation (not pinned anywhere in the codebase — standard practice):** **1200×630px**
  (the common Open Graph / Twitter-card size, ~1.91:1). No existing component or page constrains
  this; treat it as a sensible external default until/unless product adds real OG-image tooling.
- Keep the same warm graphite/cream/brass system (§ colors in `style-guide.md`) and the logo
  lockup appropriate to the background (`logo.svg` on light, `logo-reversed.svg` on dark — see
  `logo-guidelines.md`).

### Square / thumbnail imagery (avatars, empty-state icons, listing thumbnails)
- **Aspect ratio: 1:1** — this is the single most common ratio in the actual codebase (grepped: 10
  distinct pages use `ratio="1 / 1"` for empty-state/thumbnail imagery, plus `Avatar`'s native
  circular crop).
- **Min resolution:** 512×512px for anything that might display larger than default (e.g. a
  profile page hero avatar), 256×256px acceptable for small list-row avatars.

### Wide cinematic banners (in-app)
- **Aspect ratios in active use:** `21/9`, `21/8`, `16/5` — these are real, not hypothetical (agent
  dashboard banner, renter portal book/history pages, public agency profile hero).
- **Min resolution:** 1920×640px covers the widest (`21/9`) case at a reasonable desktop size
  without upscaling.

---

## 4. Quick reference table

| Use case | Ratio | Min resolution | Format | Maps to |
|---|---|---|---|---|
| Car listing/fleet photo | 3:2 | 1200×800 | WebP | `CarPhoto` |
| Agency profile (wide hero) | 16:9–21:9 | 1600×700 | WebP | `AgencyImage slot="agency"` |
| Agency profile (thumbnail) | 1:1 | 512×512 | WebP | `AgencyImage slot="agency" ratio="1/1"` |
| Landing hero banner | 4:3 | 1600×1200 | WebP | shipped `hero-handover.webp` placement |
| Social share banner | ~1.91:1 (1200×630) | 1200×630 | PNG/WebP | external (OG/Twitter card) — not a product component |
| Avatar / person photo | 1:1 | 256–512 sq. | WebP/JPG | `Avatar` |
| Empty-state / listing thumbnail | 1:1 | 256×256 | WebP | `AgencyImage slot="empty" ratio="1/1"` |
| Wide in-app banner | 16:5–21:9 | 1920×640 | WebP | `AgencyImage` (various pages) |

---

*Sources: `frontend/src/components/ui/AgencyImage.tsx`, `Avatar.tsx`, `Seal.tsx` (read directly), `frontend/public/img/*.webp` (dimensions read via `sips`), grep of every `ratio=` usage under `frontend/src/app/`, `docs/marketing/brand/style-guide.md`.*
