# Rate tiers & seasonal pricing

How a booking's price is calculated. Written 2026-08-10.

---

## 1. The model

`Car.pricePerDay` is the **base**. Rules move it on the three axes the
founder asked for:

| Axis | Rule kind | Applied |
|---|---|---|
| **When** — peak season, holidays | `SEASONAL` (date window) | **per day** |
| **How long** — weekly/monthly deals | `DURATION` (day-count window) | **once**, to the subtotal |
| **What** — vehicle segment | scope on either kind (`vehicleClass`) | — |

An agency with **no rules gets exactly the old behaviour** (`pricePerDay ×
days`). Nothing changes until someone opts in.

```
total = Σ (per-day rate, seasonal-adjusted)   ← subtotal
        then one duration adjustment on that subtotal
```

## 2. Two decisions that are about correctness, not taste

### Seasonal is applied PER DAY

A rental running **30 Jul → 3 Aug** straddles a season boundary. Any
"one rule for the whole booking" scheme has to key off *something*:

- key off the **start date** → a renter books one day early and gets the
  entire peak week at low-season rates;
- key off the **end date** → equally arbitrary, and gameable the other way.

Pricing each day on its own date is the only version that can't be gamed and
that staff can explain to a customer line by line. The API returns the
per-day `breakdown` for exactly that reason.

Verified live with a +25% August rule on a 600 MAD/day car:

```
2026-07-30  600  —
2026-07-31  600  —
2026-08-01  750  August peak
2026-08-02  750  August peak
subtotal 2700
```

### Rules never stack

Exactly **one** seasonal rule wins per day. Selection order:

1. **priority** (higher wins)
2. **specificity** — car-pinned > class > agency-wide
3. **id** — so the result is deterministic, not dependent on row order

Stacking is a footgun: two innocent-looking +20% rules silently compound to
+44%, and nobody notices until a customer disputes an invoice. One rule per
day is explainable; compounded percentages are not.

### Duration is applied once

Duration is a property of the **whole rental**, not of any one day, so it
adjusts the subtotal after the per-day pass. `FIXED_DAILY` on a duration
rule sets a flat effective rate for the whole rental ("7+ days: 350/day"),
which is how agencies actually quote weekly deals.

## 3. Money discipline

Per CLAUDE.md §5.3, every step stays in `Prisma.Decimal` — no float, ever.

**Daily rates are rounded to 2dp individually**, not at the end. A daily rate
is itself a price the customer is quoted and the invoice shows, so
`7 × 750.00 = 5250.00` is literally true rather than an
approximation that won't reconcile against its own line items. A test
asserts the breakdown always sums exactly to the subtotal.

Guards against nonsense that would cost real money:

- a rule can never produce a **negative price** (a `-150%` typo would
  otherwise hand the renter money — clamped to 0 in the engine *and*
  rejected at the DTO);
- `PERCENT` is bounded to −100…1000;
- `FIXED_DAILY` may not be negative;
- a "season" with no dates, or `maxDays < minDays`, is refused with a
  specific message rather than stored as a rule matching everything/nothing.

## 4. Quote = price charged

`GET /pricing/quote` and `BookingsService.create` run **the same engine**.
Quoting one price at the desk and charging another is the failure mode most
worth engineering against here, so there is deliberately no second code path.
Verified end-to-end: quote `4725` → booking created at `4725`.

## 5. API

| Route | Capability | Notes |
|---|---|---|
| `GET /pricing/rules` | `settings.manage` | list |
| `POST /pricing/rules` | `settings.manage` | create |
| `PUT /pricing/rules/:id` | `settings.manage` | replace |
| `DELETE /pricing/rules/:id` | `settings.manage` | remove |
| `PATCH /pricing/cars/:carId/class` | `fleet.manage` | set the pricing segment |
| `GET /pricing/quote` | **`booking.create`** | price preview |

The split is deliberate: **writing** the price list is an owner act
(`settings.manage`), but **reading a quote** must be available to front-desk
staff who need to tell a customer a number without being able to change it.

Every rule write is audit-logged — "who moved the August rate" is a question
that gets asked.

## 6. Vehicle classes

`ECONOMY · COMPACT · SUV · LUXURY · VAN`, set per car. A car with **no**
class only matches rules that target *any* class — a class-scoped rule will
not silently apply to unclassified vehicles.

## 7. Known gaps / follow-ups

- **Existing bookings are never repriced.** Rules affect new bookings only;
  an agreed price stays agreed. There is no "reprice" tool, by design.
- **Late fees still use the flat `car.pricePerDay`**, not the rate engine
  (`bookings.service.ts` overdue path). Arguably a late day in peak season
  should cost the peak rate — deliberately left alone because it changes
  what customers are charged on an existing, already-signed booking and is a
  product call, not a refactor.
- **No day-of-week rules** (e.g. weekend uplift). The `SEASONAL` window is
  date-range only; recurring weekly patterns would need a new rule kind.
- **UI is English-only**, like the other recently-added owner surfaces. Same
  follow-up as the telematics panel.
- **No per-rule preview in the UI.** The engine returns a full breakdown and
  the quote endpoint is live, but the settings page does not yet render a
  "what would a 5-day August rental cost?" simulator.
