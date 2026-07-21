# Fider — Logo Usage Guidelines

> Describes the **existing, shipped** logo assets as they actually render — read directly from
> `frontend/public/logo.svg` and `frontend/public/logo-icon.svg` (both untouched by this pass; do
> not edit or overwrite them). See `style-guide.md` for the underlying color/type system these
> assets draw from.

---

## 1. The assets

### `frontend/public/logo.svg` — full wordmark lockup

- Canvas: `200 × 60` viewBox.
- Contents (read from the file): a **shield/icon glyph** on the left (a layered polygon shield with
  a brass gradient fill and a cut-out stylized "F"), followed by the wordmark **"Fider"** in Hanken
  Grotesk bold, plus a small uppercase **"LUX"** caption to its right in a light weight.
- Colors used *in the file* (hardcoded hex, not CSS variables):
  - Shield outer shape: `#2A2E30` (dark graphite)
  - Shield inner fill: a brass gradient `#D4AF37 → #F5D76E → #B8860B`
  - "Fider" wordmark text: `#2A2E30` (**dark graphite** — see the contrast note below)
  - "LUX" caption: `#D4AF37` (brass)

### `frontend/public/logo-icon.svg` — icon-only mark

- Canvas: `40 × 40` viewBox.
- Contents: the same shield glyph as above (dark graphite outer shape, brass gradient inner fill,
  cut-out "F"), with no wordmark text.

Both files predate/parallel the CSS token system in `globals.css` — their fills are **hardcoded
hex values close to, but not identical to,** the shipped `--color-metal` (`hsl(40 56% 58%)` =
`#D0A858`) and surface tokens (`--color-surface` = `#1D1B19`). Treat the SVGs themselves, not this
guide's color table, as the source of truth for how the logo currently renders — if `globals.css`
tokens drift further from these hex values over time, that's a real (separate) design-debt item,
not something to silently "fix" by hand-editing the logo file.

---

## 2. Important contrast finding — read before placing the logo

`logo.svg`'s **wordmark text is filled `#2A2E30`** (dark graphite). That reads clearly on a light
or cream background, but it is **very low-contrast to invisible on the product's own default dark
background** (`--color-background: hsl(30 9% 7%)` = `#131210`, itself a similarly dark graphite).
In other words: **as authored, `logo.svg`'s text is not legible on Fider's own dark app
background.** The "LUX" caption (brass, `#D4AF37`) and the icon's brass inner fill *do* stay
visible on dark, but the "Fider" wordmark itself does not.

`logo-icon.svg` (no text) is more forgiving on dark backgrounds — the brass gradient inner shape
still reads — but its dark outer outline (`#2A2E30`) will nearly disappear into a dark background,
leaving a softer, "gradient without a hard edge" silhouette. That's usually acceptable for a
favicon-scale mark, less so at large display sizes.

**Practical rule: use `logo.svg` (the full wordmark) only on light/cream backgrounds** — the
product's own `--color-cream` "trust paper" surface (`hsl(42 44% 90%)`), white, or light neutral
photography backdrops. **For dark backgrounds** (the app's own dark mode, dark social banners,
dark slide decks, dark event signage), use the new `logo-reversed.svg` variant added alongside this
guide (see §4) — it's the same lockup with the wordmark recolored to the light cream/foreground
tone so it stays legible on graphite.

---

## 3. Clear space & minimum size

No clear-space or minimum-size values are encoded in the SVGs themselves (they're plain shapes,
no metadata) — the following are conservative recommendations based on the glyph's own geometry,
pending confirmation from whoever owns final brand sign-off:

- **Clear space:** keep an empty margin on all sides of the lockup at least equal to the height of
  the shield icon's cap (roughly the icon's own width) — i.e. for `logo.svg` at native size (60px
  tall), keep ≥ 15–20px clear on every side; scale proportionally at other sizes.
- **Minimum size — full lockup (`logo.svg`):** the wordmark text and the "LUX" caption are small
  relative to the icon (12px caption at native 60px height) — don't scale the full lockup below
  roughly **120px wide** (i.e. below ~36px tall) or the caption becomes illegible.
- **Minimum size — icon only (`logo-icon.svg`):** the shield has a cut-out "F" detail that closes
  up at small sizes — don't scale below roughly **24×24px**. Below that, prefer a flattened /
  simplified mark (e.g. the new `logo-icon-monochrome.svg`, see §4) rather than shrinking the
  detailed gradient icon further (favicons, tiny UI chrome, etc.).

---

## 4. New supplementary assets (added by this pass)

Two new files were added under `frontend/public/assets/media/` — **additive only**, the original
`logo.svg` / `logo-icon.svg` were not touched:

- **`logo-reversed.svg`** — the same wordmark lockup (shield icon + "Fider" + "LUX" caption),
  recolored for dark backgrounds: the wordmark text uses the warm cream/foreground tone
  (`--color-foreground` / `--color-cream`, per `style-guide.md`) instead of dark graphite, so it
  stays legible on the app's own dark surfaces, dark decks, or dark social banners. Icon brass
  gradient and proportions are unchanged from `logo.svg`.
- **`logo-icon-monochrome.svg`** — a single-ink (one flat color, no gradient) version of the shield
  icon in the cream/foreground tone, for contexts where the two-tone brass gradient won't
  reproduce cleanly: engraving/stamping, single-color print, watermarks, or very small/low-color
  UI chrome.

See `asset-specs.md` for where these fit alongside product imagery.

---

## 5. Do / Don't

**Do**
- Place `logo.svg` on light/cream backgrounds; place `logo-reversed.svg` on dark backgrounds.
- Preserve the icon's aspect ratio and internal proportions when scaling.
- Give the lockup real breathing room (§3) — don't crowd it against page edges or other elements.
- Use `logo-icon.svg` (or the new monochrome variant) alone when space is tight (app icons,
  favicons, small social avatars) rather than squeezing the full wordmark into a tiny space.

**Don't**
- Don't recolor the shield's brass gradient to a different hue — brass is the one recurring
  "premium/trust" metallic motif across the product (per `style-guide.md` §2); an off-brand
  gold/yellow undermines that signal.
- Don't stretch or distort the lockup non-proportionally.
- Don't place the plain `logo.svg` wordmark on a dark background — per §2, its text will be
  unreadable. Use `logo-reversed.svg` instead.
- Don't place either version over a busy or low-contrast photographic background without a solid
  or `.scrim`-style backing panel (per `style-guide.md` §4, `.scrim` is the product's own
  chrome-over-photography treatment: a warm graphite-tinted blur, not a plain white overlay).
- Don't add drop shadows, glows, outlines, or other effects to the logo files themselves — if a
  treatment is needed for a specific placement (e.g. legibility over a photo), apply it to the
  container, not the mark.

---

*Sources: `frontend/public/logo.svg`, `frontend/public/logo-icon.svg` (read directly, unmodified), `docs/marketing/brand/style-guide.md`.*
