# Landing page headlines — options

> Working drafts for `/landing` (hero, `#solutions`/Trust Console, `#enterprise`, honest
> capability tiles). English only — this is the working language for drafting; **French
> (default UI locale) and Arabic (RTL-appropriate) localization is a follow-up step for a
> translator, not something drafted here.** The live English strings currently ship from
> `frontend/messages/en.json` under the `landing` namespace — these options are alternates/
> extensions to hand to whoever next edits that file, not a replacement written blind.
>
> Voice grounding: read from the actual shipped copy (`frontend/messages/en.json` → `landing`,
> `auth`; `frontend/src/app/(public)/landing/_components/*.tsx`) before drafting. Current voice
> is: sentence case (not title case, not all-caps except small eyebrow labels), confident and
> plain rather than hypey, short declarative sentences, comfortable naming real technical nouns
> (HMAC-SHA256, Decimal cents, VAT) as a *trust signal* rather than jargon to hide. Em dashes do
> a lot of work. No exclamation points anywhere in the current copy — kept that constraint here.
>
> Every claim below is checked against real product capability (see `CLAUDE.md` §4–5,
> `docs/DESIGN_VISION.md`, and the component read). Nothing here claims a certification or
> security property the product doesn't verifiably have — see the no-fabrication note at the
> bottom of this file.

---

## 1. Hero — headline + subheadline options

Current shipped baseline (for reference, not to be silently overwritten):
- Eyebrow: "Now in early access"
- H1: "Run your rental agency on **one trusted spine.**"
- Body: "The operating system for Morocco's car-rental agencies — trust, fleet and finance in one place. Know a renter's history before you hand over the keys."

### Option A — keep the spine metaphor, sharpen the stakes
**Eyebrow:** Now in early access
**H1:** Run your agency on one trusted spine.
**Sub:** Fleet, finance and renter trust in one place — so you know who's picking up your keys before you hand them over.

### Option B — lead with the pain, not the product
**Eyebrow:** Built for Morocco's car-rental agencies
**H1:** Stop finding out who your renter is *after* the damage report.
**Sub:** Fider hashes every renter's ID and pools reviews and blacklist flags across agencies, so the risk shows up before the booking is confirmed — not after.

### Option C — concierge / hospitality register (closest to DESIGN_VISION.md's "boutique" direction)
**Eyebrow:** The trust layer for mobility
**H1:** Every handover, backed by a network that remembers.
**Sub:** One system for fleet, finance and renter trust — built so a stranger to you is never a stranger to the network.

### Option D — operator-voice, plainest read
**Eyebrow:** Now in early access
**H1:** The agency operating system that actually knows your renters.
**Sub:** Bookings, invoices in MAD with VAT handled, and a trust check on every renter — one spine, not four spreadsheets and a group chat.

### Option E — number-forward (mirrors the stat strip's confidence)
**Eyebrow:** Now in early access
**H1:** One spine. Every booking, every dirham, every renter's history.
**Sub:** Fider runs fleet, finance and cross-agency trust on a single record — MAD-native invoicing, HMAC-hashed identities, reconciled to the cent.

### Option F — short and declarative (best for a compressed hero on mobile)
**Eyebrow:** The trust layer for mobility
**H1:** Know your renter before you hand over the keys.
**Sub:** Fider is the operating system built for Moroccan car-rental agencies — fleet, finance, and a trust network no single agency could build alone.

### Option G — founder/early-access framing (pairs well with the `#contact` "founding agency" language already in the CTA section)
**Eyebrow:** Founding agencies, now boarding
**H1:** Help write the trust record your whole industry will use.
**Sub:** Every agency that joins makes the network's judgment sharper — fleet, finance and renter trust, on one spine, from day one.

### Option H — plainest possible value statement (for A/B against the metaphor-heavy options)
**Eyebrow:** Now in early access
**H1:** Everything your agency runs on. In one place.
**Sub:** Cars, bookings, invoices, contracts, and a renter's history from every agency that met them before you — Fider replaces the spreadsheet-and-WhatsApp stack with one system of record.

**Recommendation:** A or C for the primary hero test — both keep the existing "spine" language the product already uses elsewhere (nav copy, footer blurb: "Trust, fleet and finance on one spine"), so swapping either in doesn't fracture the vocabulary already live across `/login`, `/signup`, and the footer.

---

## 2. `#solutions` (Trust Console section) — section headline options

Current shipped baseline:
- Eyebrow: "Solutions · The trust network"
- H2: "A stranger to you. Not to the network."
- Body: "Every completed rental leaves a signal. Fider privacy-hashes each renter's national ID, then resolves reviews and blacklist flags from across the network into one risk band — seen before the keys change hands. Fleet, bookings and MAD-native finance ride the same spine."

### Option A (keep as-is — it's strong; alternates below are for testing)
"A stranger to you. Not to the network."

### Option B
**Eyebrow:** Solutions · Try it live
**H2:** Watch a renter's history surface — before you say yes.
**Sub:** Toggle the network on and off below. Off, every renter looks the same. On, five agencies' worth of history resolves into one risk band and one deposit rule — in under two seconds, with nothing but a hashed ID ever leaving the device.

### Option C
**Eyebrow:** The Trust Network, live
**H2:** One booking. Every agency's memory.
**Sub:** This is the actual decision your team sees at handover — not a mockup. Flip the switch and watch what changes when the network is off.

### Option D (more plainly instructional, good if user-testing shows people don't realize the demo is interactive)
**Eyebrow:** Try it — this console is live
**H2:** Four renters. One network. See what changes.
**Sub:** Each card below is a real trust check, run the way your team would see it — HMAC-hashed ID in, risk band and deposit rule out. Illustrative data, real logic.

**Note:** section already has strong sub-copy ("A stranger to you. Not to the network.") — Option A is the safe keep. B/C/D lean harder into "this is interactive, go play with it," which testing may show performs better since the Trust Console is the single best proof-point on the page.

---

## 3. `#enterprise` — section headline options

Current shipped baseline (inside `SolutionsSection.tsx`, not yet in `en.json` as a separate key):
- Eyebrow: "Security & compliance"
- H3: "Enterprise-grade by default."
- Sub: "Security posture, not a promise — the architecture that lets agencies share trust without sharing customer lists."

### Option A (keep — already avoids the fabrication trap by pairing the claim with real, listed properties: multi-tenant isolation, RBAC, audit logging, rate limiting, HMAC-SHA256, JWT/HttpOnly)
"Enterprise-grade by default."

### Option B — more concrete, less adjective-driven
**Eyebrow:** How the network keeps a secret
**H3:** Every agency's data stays its own. The trust signal doesn't.
**Sub:** Multi-tenant isolation by default, a renter's ID hashed before it's ever queried, and an audit log on every sensitive action — this is the architecture, not a badge.

### Option C — shortest, for a dense enterprise strip
**Eyebrow:** Security & compliance
**H3:** Built to be trusted with the keys.
**Sub:** Tenant isolation, role-based access, HMAC-hashed identities, and an audit trail — listed below because we'd rather show the architecture than promise a certification we don't have.

**Caution flag:** "Enterprise-grade by default" is an adjective, not a claim of a specific certification — it's fine to keep *only* if it stays paired with the concrete list (`ENTERPRISE` array in `SolutionsSection.tsx`: multi-tenant isolation, RBAC · 5 roles, audit logging, document-expiry enforcement, rate limiting, HMAC-SHA256 identities, JWT · HttpOnly cookie). Do not let a future edit detach the headline from that list, and never upgrade it to "SOC 2," "ISO 27001," "bank-grade," or similar — none of those are true today per `CLAUDE.md`.

---

## 4. Honest capability tiles (the `#features` 4-up grid) — section headline options

Current shipped baseline:
- Eyebrow: "What you get"
- H2: "Four moving parts. One system of record."
- Body: "Trust, finance, compliance and fleet-sharing — the whole agency on a single spine, so nothing lives in a spreadsheet or a group chat."

### Option A (keep)
"Four moving parts. One system of record."

### Option B
**Eyebrow:** What's actually in the box
**H2:** No filler modules. Four things, done properly.
**Sub:** Trust Network, Financial Engine, Compliance Guardrails, B2B Hub — each one solves a specific way agencies lose money or trust today. Nothing here is a roadmap slide.

### Option C — leans into "honest tiles" framing explicitly
**Eyebrow:** What you get (and only what you get)
**H2:** Four parts. All of them shipped.
**Sub:** Trust, finance, compliance, and fleet-sharing — every tile below is live in the product, not a "coming soon."

**Tile copy** (existing, kept — these are already grounded in real capability and should not be rewritten without a corresponding code check, since each tag is a direct pointer to a real module):
- **Trust Network** — "Privacy-hashed CIN (HMAC-SHA256) plus a cross-agency review score — collective renter trust, not a credit bureau." *(tag: Trust · Reviews · Blacklist)*
- **Financial Engine** — "MAD invoicing with 20% VAT, security deposits, and PAID / PARTIAL / DUE reconciliation to the cent." *(tag: Invoices · Payments · VAT)*
- **Compliance Guardrails** — "Document-expiry enforcement and inspection gates stop a non-compliant car — or an unverified renter — before handover." *(tag: Documents · Inspections)*
- **B2B Hub** — "Share fleet across the agency network so an idle car earns from demand sitting at another agency." *(tag: Fleet sharing · Network)*

---

## Grounding notes (what's real, so nothing above overclaims)

Pulled from `CLAUDE.md` §4–5 and the component read, for whoever edits these next:
- Multi-tenant ERP with `agencyId` scoping on every business query — real, enforced, IDOR-tested.
- Cross-tenant Trust Network (RenterIdentity, RenterReview, BlacklistEntry, RefusalLog) — real, HMAC-SHA256 identity hashing with a required pepper, deterministic, "hashed on device, POSTed never GET" per the Trust Console's own footer caption.
- Capability-based staff roles (`AgencyMembership` + `CapabilitiesGuard`, ROLE_PRESETS OWNER=21/MANAGER=19/AGENT=14) — real, shipped Phase 5A.
- Deposit lifecycle (capture → HOLD → RETURN/CLAIM + damage charge) — real, shipped Phase 3.
- E-signed contracts gated on SIGNED state, pre/post inspection diff with conservative auto-charge — real, shipped Phase 4.
- Automations module exists (`backend/src/automations/`) — real as a module; do not claim specific automation recipes/templates without checking current scope.
- SaaS plan tiers exist (`Plan`/`Subscription`/`PlatformInvoice`, BETA free-during-beta, entitlements fail-open to BETA) — real, shipped Phase 11.
- **Do not claim:** any specific security certification (SOC 2, ISO 27001, PCI-DSS), "bank-grade encryption," "military-grade," a specific uptime SLA, or a headcount/customer-count/agency-count statistic not sourced from a real number the founder gives us. Where a security *property* is true (tenant isolation, HMAC hashing, JWT/HttpOnly, rate limiting, audit logging), name that property directly instead of reaching for a certification word.

## Localization note
All copy above is an English working draft. The product ships French as the default locale with Arabic (RTL) and English as siblings (next-intl, `frontend/messages/{en,fr,ar}.json`). None of these options have been translated — that's explicitly out of scope for this pass and should go to a French-fluent translator (and a native/fluent Arabic speaker for the `ar.json` RTL pass) before anything here ships. Do not machine-translate and ship without a native review, especially for the Trust Console's legal/consent-adjacent language (CIN handling, hashing).
