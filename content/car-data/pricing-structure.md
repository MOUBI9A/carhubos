# Pricing Structure — Reference Guide

> Content/reference document for the Fider Media & Brand team. Describes conventional
> car-rental pricing structure for the Moroccan market, for use in marketing copy, demo
> content, and onboarding materials. **This is not a spec for new backend behavior** —
> where a mechanism below already exists in the product (e.g. the deposit lifecycle), it
> is described narratively to match what's actually built. Where it doesn't exist yet
> (seasonal/rate-tier pricing), it's explicitly flagged as a **proposal for consideration**,
> per `CLAUDE.md` §10 which notes rate tiers/seasonality are "not started (lower priority)"
> as of this writing.

## 1. Base daily rate

The foundation of every quote is a per-vehicle **daily rate in MAD**, set per car by the
agency (see `car-specs.json` for illustrative ranges by category, roughly 200–1500+ MAD/day
depending on tier). The daily rate typically includes:

- A mileage allowance (commonly 200–300 km/day — see `mileagePolicy` in `car-specs.json`),
  with a per-km overage fee (typically 2–3 MAD/km) charged at drop-off.
- Standard insurance coverage (see `rental-details.md` for tiers).

Rentals are usually billed in full-day increments; many agencies apply a grace period
(commonly 1–2 hours) before a late return triggers an additional day's charge.

## 2. Weekly / monthly discount tiers (illustrative, agency-configured)

Longer rentals conventionally earn a lower effective daily rate. Typical market discount
bands agencies advertise:

| Duration | Typical discount off daily rate |
|---|---|
| 1–6 days | 0% (standard daily rate) |
| 7–13 days (weekly) | 10–15% |
| 14–29 days (bi-weekly) | 15–20% |
| 30+ days (monthly) | 20–30%, sometimes a flat monthly package rate |

These bands are market conventions, not a built-in pricing engine — each agency using the
product sets and applies its own rates today.

## 3. Deposit (caution / garantie)

Deposits follow the product's real lifecycle, described narratively:

1. **Capture at pickup.** A deposit amount (see `typicalDepositMAD` in
   `fleet-categories.json` and `depositMAD` in `car-specs.json`) is authorized/captured from
   the renter when the vehicle is handed over — this moves the deposit into a **HOLD** state
   tied to the booking.
2. **Held for the rental duration.** The deposit is not part of rental revenue; it exists to
   cover potential damage, missing fuel, traffic fines, or contract violations discovered at
   return.
3. **Resolved at drop-off**, one of two ways:
   - **RETURN** — if the post-rental inspection shows no new damage beyond the pre-rental
     baseline and all other conditions are met, the full deposit is released back to the
     renter.
   - **CLAIM + damage charge** — if the return inspection identifies new damage (compared
     against the pickup inspection), the agency claims some or all of the deposit to cover
     it, and any shortfall beyond the deposit is charged separately.

Deposits are typically 8–15x the daily rate for Economy/Compact tiers, scaling up
proportionally for SUV, Luxury, and Van/Minibus tiers — see the ranges in
`fleet-categories.json`.

## 4. VAT (TVA) — 20%

Morocco applies a standard VAT rate of **20%** to car rental services. Two conventions exist
in the market:

- **VAT-inclusive display (more common for consumer-facing/leisure rentals):** the quoted
  daily rate is the all-in price the renter pays; VAT is embedded and typically itemized
  separately only on the formal invoice.
- **VAT-exclusive display (more common for B2B/corporate accounts):** the quoted rate is
  pre-tax (HT — *hors taxes*), with VAT added as a separate line at checkout/invoicing (TTC —
  *toutes taxes comprises*).

**Recommendation for marketing/demo copy:** default to presenting consumer-facing prices as
VAT-inclusive ("prix TTC") since that matches renter expectations in this market, and note
"TVA 20% incluse" near price displays. For B2B/corporate copy (Hub/agency-to-agency
context), it's conventional to show HT pricing with VAT broken out at invoicing.

This mirrors the product's real money handling: all monetary figures are `Decimal(12,2)` in
the backend, converted to plain numbers over the API — content/marketing figures here are
descriptive only and don't touch that logic.

## 5. Extra-driver fee

Adding a second (or additional) authorized driver to a rental contract commonly carries a
flat fee, either per rental or per day:

- **Per-rental flat fee:** typically 100–300 MAD for the whole rental duration.
- **Per-day fee:** typically 30–50 MAD/day as an alternative structure some agencies use for
  longer rentals.

Extra drivers must meet the same eligibility criteria as the primary renter (see
`rental-details.md`).

## 6. Young-driver surcharge

Renters below a minimum age threshold (commonly 23–25, sometimes 21 with restrictions) or
with fewer years of licensed driving history typically incur a surcharge, reflecting higher
perceived risk:

- Typical surcharge: **50–150 MAD/day** or a flat **10–20%** uplift on the daily rate,
  depending on how far under the standard threshold the renter falls.
- Often paired with a higher deposit requirement and/or a restriction to lower-tier vehicle
  categories (e.g. no Luxury/Premium access under a certain age).

## 7. Cross-border / out-of-country fees

Morocco-registered rental vehicles typically cannot cross international borders without
prior written agency authorization, and it's rare for agencies to permit it at all given
regional insurance complexity. Where offered:

- A **cross-border authorization fee** (flat, commonly 500–1500 MAD) plus proof of
  extended insurance coverage valid outside Morocco.
- Most agencies instead restrict rentals to domestic use only and state this plainly in the
  rental contract — this is the more common and recommended default framing for marketing
  copy ("domestic Morocco rentals" rather than implying cross-border support).

## 8. Seasonal / rate-tier pricing — PROPOSAL FOR CONSIDERATION

**Not built today.** `CLAUDE.md` (Phase 4 notes) explicitly lists "rate tiers/seasonality"
as **not started** and a lower-priority product decision. The following is offered purely as
market-context input for a future product discussion — it should not appear in copy or demo
content as something the product currently does.

Typical Moroccan car-rental seasonal demand pattern, for context only:

- **High season** (roughly mid-June–August, and the week around Eid holidays): elevated
  demand from domestic and diaspora travelers; market rates commonly rise 15–30% over
  baseline.
- **Shoulder season** (April–May, September–October): steady tourism demand; rates near
  baseline.
- **Low season** (November–March, excluding holiday weeks): reduced demand; some agencies
  discount 10–20% to maintain utilization.

If/when rate tiers become a product feature, this seasonal banding would be a reasonable
starting point for the product team to evaluate — but it is not a claim about current
functionality.

---

*Reference content only. Figures are illustrative market ranges for Morocco, not pulled
from any specific agency's real pricing or the live application database.*
