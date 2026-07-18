# CarHub — Product Vision & Target Architecture

> The source of truth for **what CarHub is**, **who uses it**, and **how access & the business work**.
> Engineering hardening lives in `AUDIT_BACKLOG.md`; this doc defines the product the platform must become.

---

## 1. The vision (read this first)

**CarHub is a B2B SaaS. I am the founder/operator, not an agency owner.** My customers are **car-rental agencies**; they pay me a **recurring subscription** to run their entire business on CarHub. Their customers are **renters**. So there are three tiers of people:

- **Platform tier** — me (and my staff/support). I run and monetize the platform.
- **Agency tier** — my paying customer: the agency owner + the staff they hire.
- **Renter tier** — the agency's end customers (the people renting cars).

The product promise: an agency **signs up → starts a trial → subscribes → and CarHub solves all their operational problems** (fleet, bookings, contracts, payments, deposits, inspections, staff, and a cross-agency renter-reputation network), while **I earn recurring revenue and can operate, support, meter, and scale the platform**.

Everything below exists to serve those three tiers cleanly and to make the money side real.

---

## 2. Identity & Access model (target)

Separate **two dimensions**: **identity type** (who logs in) and **capabilities** (what they may do). Today the code uses 5 hardcoded roles that gate whole pages. **Target: roles become named _presets_ over a granular _capability_ set** — enforced server-side, always tenant-scoped.

### Platform tier
- **Platform Owner** (`ROOT_ADMIN`) — me. Full control: tenants, billing, plans, config, support, impersonation.
- **Platform Staff** (new) — my support/ops people with **scoped** platform capabilities (e.g. support-only: view + impersonate, no billing/config). Needs a platform-capability set, not a second god-account.

### Agency tier (one tenant)
- **Agency Owner** (`OWNER`) — full control of *their* agency: operations, staff, agency settings, **and their subscription to me** (billing is their responsibility, scoped to their tenant).
- **Agency Staff** (`MANAGER`/`AGENT` today → **capability-based**) — the owner **creates staff accounts and grants exactly the capabilities they want**. Roles become customizable presets ("Front desk", "Fleet manager", "Accountant"), not fixed gates. This is the core of my "workers" vision and replaces the coarse role system.

### Renter tier (self only)
- **Renter** (`RENTER`) — a real end-user account: their profile, their rentals, documents shared *to* them, notifications, and **consent control** over what they share *back* (the QR flow).
- **Walk-in Customer** — the agency's private record of a renter with no login (today's `Customer`). Must be **linkable** to a Renter account and to the global identity.

### The critical data linkage
`Customer` (per-agency record) ↔ `RenterIdentity` (global, hashed, cross-tenant reputation — **already exists**) ↔ `User(role=RENTER)` (portal login — **needs building**).
Booking a car should create/link the global identity and be able to **invite the renter to claim a portal account**. Renting must stop being a dead-end `Customer` row.

---

## 3. The capability system (replace coarse roles)

- A **Capability** is a fine-grained permission (e.g. `booking.create`). A user's **membership in an agency** carries a **set of capabilities**. A **Role** is a named preset that expands to a capability set and is **customizable by the agency owner**.
- Enforced by a **capability guard** (checks capabilities, not just role), server-side, always agency-scoped. Presets seed the defaults; the owner edits per staff member.

**Agency capability catalog (starter set):**
`fleet.view` · `fleet.manage` · `booking.view` · `booking.create` · `booking.manage` · `booking.return` · `customer.view` · `customer.manage` · `finance.view` · `payment.record` · `payment.verify` · `expense.manage` · `contract.manage` · `contract.sign` · `deposit.manage` · `trust.report` (blacklist/review) · `inspection.perform` · `reports.view` · `hub.manage` · `staff.manage` · `settings.manage`

**Platform capability catalog:**
`tenant.view` · `tenant.manage` (provision/suspend) · `billing.manage` · `plan.manage` · `impersonate` · `platform.config` · `support.view`

---

## 4. What a SaaS founder needs — the business layer (mostly MISSING today)

This is what makes agencies **pay me** and lets me **run the business**. It's the weakest part of the current code and the reason it's an app, not yet a SaaS.

1. **Subscriptions & billing** — agencies pay a **recurring subscription** (Stripe subscriptions/Checkout + webhooks). This is **distinct** from rental payments (agency↔renter). Includes agency-facing invoices, payment methods, receipts, proration.
2. **Plans & feature gating** — `STARTER/PRO/BUSINESS` must **actually gate** features + limits (max cars, staff seats, bookings/month, Trust Network access, etc.) via a central **entitlements service** the whole app checks.
3. **Self-serve onboarding** — public **signup → trial → subscribe → provisioned agency**, with a guided first-run setup. (Signup is being *locked down* for security; it must be *rebuilt* as a real funnel with a signed-invite path for staff.)
4. **Usage metering & limits** — count usage against plan limits, enforce them, and surface upgrade prompts.
5. **Tenant lifecycle & dunning** — states `TRIAL → ACTIVE → PAST_DUE → SUSPENDED → CANCELED`; **suspend service on non-payment**; reactivation flow.
6. **Founder metrics** — a real platform-owner dashboard: **MRR, active tenants, trials, trial→paid conversion, churn, plan distribution** (not just rental GMV).
7. **Support & impersonation** — securely log into a tenant to help (audited; the logic already exists in `ForensicService`, just unwired).
8. **Audit everything** at the platform level.

---

## 5. Renter portal, consent & QR (the end-user experience)

- **Renter portal** — profile, active/past rentals, **documents shared to them** (their contract, the rented car's docs, any incident/accident dossier for their rental), and **notifications** (return reminders, incidents, document requests, deposit status).
- **Saved identity for fast re-rent** — a renter's verified identity + documents persist **globally and privacy-safely** so a *new* agency can onboard them in seconds — **only with the renter's consent**.
- **QR consent flow** (the headline feature):
  1. Renter shows a QR in their portal.
  2. Agency scans it → a **consent request** is created for a specific scope (e.g. driving licence + national ID).
  3. Renter **approves** in their portal.
  4. Agency receives a **time-boxed, audited, revocable** view of exactly the documents the renter approved — nothing more.
  - **No agency ever sees renter PII without an active consent grant.** This is a **new consent-grant subsystem** (grant = who granted, what scope, which agency, expiry, status).
- **Notifications** — a real notification model (in-app + optional WhatsApp), not just a cron job.

---

## 6. How to build it (integrate with the existing program)

- This is **additive architecture** on top of the hardening backlog. **Do not break** the completed Phase 0–2 work (Postgres, Decimal money, the security fixes, the auth model).
- **Backlog changes:**
  - **Expand Phase 5 (Roles)** to include the **Capability Engine** (capabilities + presets + guard + owner UI to manage staff) and the **Renter + Consent/QR subsystem** (renter portal wired to real endpoints, the `Customer↔RenterIdentity↔User` linkage, consent grants).
  - **Add Phase 11 — SaaS Business Layer:** subscriptions/billing, plan entitlements + gating, self-serve onboarding/trials, usage metering, tenant lifecycle/dunning, founder metrics, support/impersonation.
- **Method:** keep the **supervisor → specialized workers → adversarial verifier → gate** model already set up (`.claude/agents/`, `AUDIT_BACKLOG.md`). Cheapest capable model per task, tight file scope, tenant-scoping + Decimal-money conventions, human gates for anything irreversible (live billing wiring, destructive migration, deploy).
