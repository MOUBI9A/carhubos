# Client hooks — value-proposition pitches for Moroccan car-rental agency owners

> Ten hooks, each grounded in a real pain point a small-to-mid Moroccan car-rental agency owner
> has, paired with a real Fider capability (not a roadmap item). Each is written to stand alone —
> usable as a landing section lead-in, a cold WhatsApp/email opener, or the first line of a sales
> conversation. English working draft; **French/Arabic localization is a follow-up for a
> translator**, not produced here (see note at the end).
>
> Every capability referenced below is checked against `CLAUDE.md` §4–5 and the shipped
> component code — no hook claims a feature that doesn't exist. Where a number would strengthen
> a hook (e.g. "agencies on the network," "renters checked this month") but no real figure has
> been confirmed by the founder, it's deliberately left out rather than invented — see the
> no-fabrication rule this team works under.

---

### 1. The double-booking hook
How much does one double-booked car actually cost you — the refund, the apology, the renter who never comes back and tells three friends why? Fider re-checks every booking's overlap inside the same database transaction that confirms it, so two staff members typing at the same moment can't both win the same car.

### 2. The blind-spot renter hook (the trust network's real "aha")
You've probably already rented to someone another agency in your own city had to blacklist — you just had no way to know, because paper records don't talk to each other. Fider hashes a renter's national ID and pools reviews and blacklist flags from every agency that ever met that same person, so their history shows up before you confirm the booking, not after the car comes back damaged.

### 3. The damage-dispute hook
"It wasn't like that when I gave it back" is the argument every agency owner has had at the counter — and usually loses, because the only evidence was memory against memory. Fider's inspection flow compares the pre-rental and return record and only proposes a damage charge when the difference actually supports one, so the conversation starts from a record, not a guess.

### 4. The paperwork hook
Every contract you print, sign by hand, and file in a folder is a contract you can't search in six months, can't prove wasn't backdated, and can lose in a move or a flood. Fider's rental contracts are e-signed and gated — a booking can't go active until a real signature is on file, and the record stays attached to that booking for good.

### 5. The staff-accountability hook
When three people share one login and one password on a sticky note, you can't tell who skipped today's return inspection, or who quietly waved through a deposit for a friend. Fider gives every staff member their own account with exactly the permissions their role needs, and keeps a log of the sensitive actions — so "who did this" always has an answer.

### 6. The VAT-and-cash-reconciliation hook
Chasing down which of last month's bookings are actually paid in full, which are partial, and which VAT-inclusive total you quoted someone over WhatsApp — that's hours you don't get back, every month. Fider tracks every invoice in MAD with the 20% VAT built in and reconciles PAID / PARTIAL / DUE to the cent, so the answer is a fact in the system, not a guess from a notebook.

### 7. The idle-fleet hook
A car sitting idle on your lot this week is money you already spent and aren't earning back — while an agency two streets over is turning renters away for lack of stock. Fider's B2B Hub lets you list that car to the agency network, so someone else's demand can cover your slow week instead of your car just sitting there.

### 8. The compliance / expired-papers hook
Renting out a car on insurance or registration that quietly lapsed last month is the kind of mistake that only surfaces after an accident, when it's too late and too expensive to fix. Fider blocks a car from being booked the moment its documents expire, so the compliance check happens at the desk, before the keys leave the office — not after a claim gets denied.

### 9. The outgrowing-spreadsheets hook
The spreadsheet-and-WhatsApp-group system that worked fine for eight cars starts breaking around car twenty: a booking gets missed, a payment goes unlogged, the fleet sheet falls out of date. Fider is built to be the one place your whole operation runs — fleet, bookings, finance, staff — so you're not re-inventing your process every time you grow.

### 10. The network-effect hook (best used as a closer, not an opener)
Every renter you rent to and every honest review you leave makes the network sharper for the next agency that meets them — and every agency that joins makes the network sharper for you. A "new" renter walking into your office has often already rented from several other agencies on Fider; until now, you just had no way to see what they already know.

---

## Usage notes

- **Cold outreach / WhatsApp opener:** hooks #1, #2, #7, and #9 read best as a first message — they open with a scenario the owner has personally lived through, not a product name.
- **Sales conversation headline:** #2 and #6 are the strongest "why this and not a spreadsheet" arguments — lead with pain, land on the specific mechanism (HMAC-hashed ID pooling; Decimal-cent VAT reconciliation).
- **Landing section lead-ins:** #3, #4, #5, #8 map directly onto the existing `#solutions` pillar cards (Booking Lifecycle, Financial Engine, Fleet & Assets) and could sit as pull-quotes above those cards.
- **Closer / late-funnel:** #10 works best once a prospect already understands what the Trust Network is — it's a network-effect pitch, and network-effect pitches only land after the mechanism is already understood.
- None of these hooks name a specific number of agencies, renters, or bookings on the network today. If the founder confirms a real, current figure, insert it — don't estimate one to make a hook sound more impressive; that's exactly the category of claim this project's "no fabricated claims" rule exists to prevent.

## Localization note
All ten hooks above are an English working draft written for a French-first, Arabic(RTL)-supported market. Darija-inflected French or Darija itself may actually outperform standard French for a WhatsApp cold-open to a small agency owner — but that's a call for a native speaker doing the localization pass, not something guessed here. Hand this file to a French-fluent translator (and a Darija-fluent reviewer for anything going out over WhatsApp specifically) before using any hook in real outreach.
