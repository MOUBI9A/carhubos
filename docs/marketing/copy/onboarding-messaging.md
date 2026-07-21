# Onboarding messaging sequence — signup to activated agency

> Copy for the funnel from `POST /auth/register` (signup) through to a first live rental. This is
> **copy, not a spec** — trigger moments are named so an engineer can wire them, but no claim is
> made here about which channels (in-app toast, banner, email) are actually implemented today.
> Confirmed in code: an in-app "agency created" toast already exists (`auth.agencyCreatedBody` in
> `frontend/messages/en.json`: "Welcome to Fider, {name}."). A `notifications` backend module
> exists (`backend/src/notifications/`), but this pass didn't verify outbound email delivery
> (SMTP/provider wiring) — treat every "email" message below as a draft for whenever that channel
> is built, not a claim that it sends today. In-app banner/toast copy is the safer near-term bet
> since that pattern is already live.
>
> Tone: boutique/concierge, warm, plain — matches `auth.signupPanel`'s existing voice ("Set up
> your agency in minutes — and start renting to people you can already trust, backed by every
> other agency's experience.") Short messages throughout; nobody reads a long onboarding email
> for a B2B ops tool. English working draft; **French/Arabic localization is a follow-up for a
> translator**, see the closing note.

---

## 1. Trigger: signup complete
**Fires when:** `POST /auth/register` succeeds and the new OWNER + agency are created (auto-login happens immediately after — the owner lands straight in the dashboard, no email confirmation gate).

**In-app toast (already shipped, keep verbatim):**
> Agency created. Welcome to Fider, {name}.

**In-app toast, alt (slightly warmer, for A/B):**
> You're in, {name}. {agencyName} is live on Fider — let's get your first car listed.

**Welcome email — subject:**
> {agencyName} is live on Fider

**Welcome email — body (short):**
> Hi {name},
>
> {agencyName} is officially on Fider. You're the owner — full control of your fleet, your staff, and your renter trust record from day one.
>
> Next up: add your first car. It takes about two minutes, and once it's in, you're one step from your first booking.
>
> [Add your first car →]
>
> Questions along the way? Just reply — a real person reads this inbox.

---

## 2. Trigger: first dashboard visit, zero cars on record
**Fires when:** owner (or any staff) lands on the dashboard/fleet page and the agency has 0 cars — an empty-state moment, not a scheduled send.

**In-app empty-state copy:**
> **Your fleet starts here.**
> Add your first car and you'll be one step from your first booking. It's the only setup Fider actually requires — no imports, no CSV, no waiting on a rep.
> [Add a car]

**In-app empty-state copy, alt (leans on trust angle):**
> **Nothing to protect yet.**
> Once your first car is in, every booking against it gets the same trust check every other agency on the network relies on. Add a car to get started.
> [Add a car]

---

## 3. Trigger: first car added
**Fires when:** the agency's car count goes from 0 → 1.

**In-app toast:**
> First car added. {carLabel} is ready to book.

**In-app toast, alt:**
> {carLabel} is on your fleet. Add a second car now, or go straight to your first booking — either way, you're close.

**Follow-up nudge (in-app banner, persists until dismissed or first booking exists):**
> One car is a fleet of one. Add the rest of your cars now, or come back to it — either way, {carLabel} is ready for its first renter.

---

## 4. Trigger: first booking created
**Fires when:** the agency's booking count goes from 0 → 1 (status REQUESTED or CONFIRMED, whichever the flow lands on first).

**In-app toast:**
> First booking on the books. This is where the trust check earns its keep.

**In-app toast, alt (sets expectations for what happens next):**
> Booking created. Next: the contract gets e-signed and the renter's trust check runs automatically before handover.

**Optional email — subject:**
> Your first booking is live

**Optional email — body:**
> Hi {name},
>
> {agencyName}'s first booking is in the system — {carLabel}, {renterName if available}.
>
> From here, Fider handles the rest of the lifecycle with you: contract e-signature before the booking goes active, the trust check on the renter, and the deposit/payment reconciliation when it's time to hand back the keys.
>
> [View this booking →]

---

## 5. Trigger: "you're live" moment — first booking reaches COMPLETED (car returned, payment reconciled)
**Fires when:** a booking's status moves to COMPLETED for the first time in the agency's history — this is the real activation moment: fleet added, booking taken, money reconciled, car returned. The agency has now run one full cycle.

**In-app celebration moment (banner or modal, one-time):**
> **You just ran your first complete rental on Fider.**
> Car out, car back, invoice reconciled, trust signal recorded. This is the loop — every booking from here runs the same way, automatically.

**In-app celebration moment, alt (nudges toward the next value unlock — inviting staff / listing on the Hub):**
> **First rental, done — start to finish.**
> You've seen the whole loop now. Two things worth doing next: invite your team so bookings don't all funnel through you, and list a slow-moving car on the B2B Hub so it earns even when it's not renting from your own lot.
> [Invite staff] [Explore the Hub]

**Optional "you're live" email — subject:**
> {agencyName} just completed its first rental on Fider

**Optional "you're live" email — body:**
> Hi {name},
>
> {agencyName}'s first booking just closed out — fully reconciled, trust signal recorded for the network. That's the whole loop, and it'll run the same way for every booking from here.
>
> A few things agencies usually do around now:
> — Invite a manager or agent so bookings don't all route through you
> — Add the rest of your fleet
> — List a slow car on the B2B Hub
>
> Welcome to the network, properly.

---

## Bonus: renter-facing onboarding (consent/QR + document vault)

The renter portal (`/portal/*`) is a separate onboarding surface from the agency-owner funnel
above, and the context for this task flagged it as needing its own copy. Kept short since it's a
secondary surface — the renter isn't the buyer, but a smooth first-consent experience directly
protects the agency's trust story.

**Trigger: renter's first consent-grant request (an agency requests access to their vault/ID via QR or link)**
> **{agencyName} is requesting access to your ID and rental history.**
> This is time-boxed — {agencyName} can see it for this booking, not forever. Nothing leaves your vault until you approve it here.
> [Review & approve] [Decline]

**Trigger: renter's first successful document upload to their vault**
> Your ID is saved to your Fider vault. It stays private until you personally approve an agency's request — nobody can see it by default, including us.

**Trigger: renter completes their first Fider-tracked rental**
> First rental logged. Every agency you rent from in good standing builds the record that gets you better terms, faster, everywhere else on the network.

---

## Sequence summary (trigger → message, at a glance)

| # | Trigger | Channel(s) | One-line goal |
|---|---|---|---|
| 1 | Signup succeeds (auto-login) | In-app toast (shipped) + email (draft) | Confirm the agency exists, point at the next step |
| 2 | Dashboard visited with 0 cars | In-app empty state | Convert "logged in" into "added a car" |
| 3 | First car added | In-app toast + banner | Confirm progress, nudge toward booking or fleet-out |
| 4 | First booking created | In-app toast + email (draft) | Set expectations for contract + trust check + reconciliation |
| 5 | First booking reaches COMPLETED | In-app celebration + email (draft) | Mark real activation; nudge staff invite / Hub listing |
| Bonus | Renter's first consent request / vault upload / completed rental | In-app (portal) | Build renter-side trust in the consent model itself |

## Localization note
All messaging above is an English working draft. French is the product's default UI locale, with
Arabic shipping RTL — this sequence has **not** been localized and shouldn't be sent to a real
agency or renter until a French-fluent translator (and, for the renter-facing consent copy
specifically, someone who can verify the legal/consent language reads correctly and unambiguously
in French and Arabic) has reviewed it. Consent-adjacent copy (the renter vault-access messages)
deserves extra care in translation since it's functionally close to a legal disclosure, not just
marketing tone.
