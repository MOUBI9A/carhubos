# CTA button copy — library

> Working drafts for all call-to-action moments across the public site and the in-app upgrade
> path. English working language; **French/Arabic localization is a follow-up for a translator**
> — see the note at the end of this file. Grounded in the real flows: `/signup` posts to
> `POST /auth/register` (creates OWNER + agency, auto-login), `#contact` opens either a WhatsApp
> deep link (`wa.me/212616880653`) or a `mailto:` to `hamzamoadin37@gmail.com` with a pre-filled
> subject/body (see `frontend/src/app/(public)/landing/_components/ContactSection.tsx`), and plan
> upsell moments are gated by `EntitlementsService` with SaaS plans currently **free during
> beta** (`BETA` plan, per `CLAUDE.md` Phase 11).
>
> Style rule carried over from the shipped copy: buttons are short (2–4 words), sentence case,
> no exclamation points, verb-first. "Get started free" and "Request early access" are the two
> CTA phrases already live — new options below either match or deliberately test against them.

---

## Top-of-funnel (landing page, pre-signup)

Goal: get a visitor to either explore the product story deeper on the page, or leave contact
info / start a conversation. Low commitment.

### "Explore the Trust Console" (in-page anchor, not a form)
- **Primary:** See how it works *(shipped, `ctaHow`)*
- Try the trust check
- Watch a renter get checked
- Run a live trust check

### Hero secondary CTA (pairs with the primary signup CTA)
- See how it works *(shipped)*
- See the trust network in action
- Watch the 90-second version

### Mid-page soft CTA (inside `#solutions`, pointing to `#enterprise`)
- Request the security overview *(shipped, in `SolutionsSection.tsx`)*
- See the full architecture
- Talk to us about security

### `#contact` section (dual-path: WhatsApp / email / form)
- **WhatsApp pill:** Chat on WhatsApp *(shipped)*
- **WhatsApp pill, alt:** Message us on WhatsApp
- **Email pill:** Email us *(shipped)*
- **Email pill, alt:** Send us an email
- **Form submit:** Send message *(shipped)*
- **Form submit, alt:** Talk to the team
- **Section CTA (bottom-page card):** Request early access *(shipped, `ctaRequest`)*
- **Section CTA, alt:** Claim a founding-agency spot *(mirrors the section body copy: "Book a walkthrough or claim a founding-agency spot")*
- **Section CTA, alt 2:** Book a walkthrough

### Demo request (no dedicated demo page exists yet — current path routes through `#contact`)
- Book a walkthrough
- See it on your own fleet *(echoes `ctaBody`: "Come see it on your own fleet")*
- Request a walkthrough
- Talk to us before you sign up

---

## Bottom-of-funnel (signup / conversion)

Goal: get the agency owner to actually create the account. Highest-commitment CTA on the site.

### Primary signup CTA (hero + nav + pricing cards)
- **Hero:** Get started free *(shipped, `ctaStart`)*
- **Nav:** Get started *(shipped, `nav.getStarted`)*
- **Pricing cards:** Start free *(shipped, in `PricingSection.tsx`)*
- Alt options to test against the above:
  - Create your agency *(matches `/signup` page's own H1: "Create your agency")*
  - Put your fleet on the network *(matches `auth.signupTagline`)*
  - Start your agency, free
  - Join the trust network

### Signup form submit button
- **Primary:** Create agency *(shipped, `auth.createAgency`)*
- **Loading state:** Creating your agency… *(shipped, `auth.creatingAgency`)*
- Alt: Set up my agency
- Alt: Get my agency live

### Post-signup confirmation micro-copy (not a button, but adjacent — toast/banner copy)
- Agency created. Welcome to Fider, {name}. *(shipped pattern, `auth.agencyCreatedBody`)*
- Alt: You're in — let's get your first car listed.

### Login (returning user, not really a CTA but keep consistent)
- Sign in *(shipped, `auth.signIn` / `nav.login` = "Log in")*
- Keep both existing forms (`Sign in` on the button, `Log in` in nav) — don't unify without a reason; they're used in different contexts (nav link vs. form submit) and neither is wrong.

---

## In-app upgrade / upsell moments (SaaS plan tiers)

Context: `BETA` plan currently grants everything free during beta; entitlement checks are
fail-open. So today's real upsell moment is **"you're about to need a paid tier once beta ends"**
or **"you've hit a usage signal"** (e.g. cars/staff/bookings nearing a plan's cap once real caps
apply post-beta) — not a hard paywall. Keep the tone informative, not alarming; this is a
concierge product, not a freemium app that guilt-trips you.

### Plan comparison page / billing console CTA
- **Selecting a higher tier:** Switch to {plan name}
- **Contacting for enterprise/custom:** Talk to us about your fleet size
- Keep away from: "Upgrade now!", "Unlock this feature" (too growth-hacky for the concierge tone)

### Usage-approaching-limit banner (in-app, e.g. nearing a car/staff/booking cap)
- You're close to your plan's limit — see what's next
- This fleet has outgrown {current plan}. Let's talk tiers.
- Alt (softer, informational only): You're using {n} of {limit} — plans compared here

### Free-during-beta framing (should appear near any plan/pricing surface right now)
- Already shipped and correct, keep verbatim: "Free during the beta" *(Badge, `PricingSection.tsx`)*
- Already shipped and correct, keep verbatim: "Every plan is free while we're in beta — pick the tier that fits your fleet and pay nothing until we launch."
- Footer microcopy, already shipped and correct: "Prices in MAD, VAT included · No card required during beta"
- **Do not write** urgency copy implying beta is ending soon unless the founder gives a real date — that would be a fabricated claim by the same standard as the fake-encryption-toast precedent.

### Founder/impersonation console (internal tool, not customer-facing — included for completeness only, likely won't ship as marketing copy)
- Not in scope for outward-facing CTA copy; flagging so it isn't accidentally treated as a public upsell surface.

---

## Grouped quick-reference (funnel stage → button text)

| Funnel stage | Recommended primary | Recommended secondary |
|---|---|---|
| Landing hero | Get started free | See how it works |
| Trust Console (explore) | Run a live trust check | Request the security overview |
| `#enterprise` | Request the security overview | Talk to us about security |
| `#contact` (quick path) | Chat on WhatsApp | Email us |
| `#contact` (form path) | Send message | — |
| Bottom-page CTA card | Request early access | Sign in |
| Pricing cards | Start free | — |
| `/signup` form | Create agency | — |
| In-app upgrade (post-beta) | Switch to {plan name} | Talk to us about your fleet size |

---

## Localization note
All CTA copy above is an English working draft for the next-intl `landing`/`auth`/`nav` message
namespaces (`frontend/messages/en.json`). French is the product's default UI locale and Arabic
ships RTL — both need a native/fluent translator pass before anything here goes live; do not
machine-translate button copy, since short imperative phrases are exactly where literal
translation reads worst (e.g. "Get started free" has no clean one-to-one French idiom — a
translator should localize the *intent*, not the words).
