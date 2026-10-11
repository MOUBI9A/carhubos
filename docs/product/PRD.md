# Fider (CarHub OS) — Product Requirements Document (PRD)

**Document Owner:** Agent 1 — Product Manager  
**Status:** Approved & Implemented  
**Target Market:** Moroccan Car Rental Agencies (B2B Multi-tenant SaaS)  
**Currency & Taxation:** Moroccan Dirham (MAD), 20% Inclusive Value-Added Tax (TVA)

---

## 1. Executive Summary & Vision

Fider (*The Trust Layer for Mobility*) is an enterprise multi-tenant ERP platform purpose-built for independent and multi-branch car rental agencies operating in Morocco. 

### Core Problems Solved:
1. **Unchecked Bad Actors & Stolen Vehicles:** Agencies have historically lacked secure, cross-tenant risk sharing. Dishonest renters frequently default on payments or damage vehicles without consequences.
2. **Spreadsheet Chaos & Double Bookings:** Fleet availability is fragmented across manual ledgers, WhatsApp threads, and paper contracts, causing double bookings and scheduling conflicts.
3. **Complex Local Compliance & Taxation:** Rental contracts in Morocco require precise vehicle registration details, CIN/Passport identity recording, and 20% TVA itemization for commercial invoicing.
4. **Disputed Vehicle Damages:** Check-in and check-out damage claims often degenerate into disputes due to a lack of time-stamped visual audit trails and certified incident dossiers.

---

## 2. User Personas

### Persona A: Root Administrator (Platform Founder / Ops)
- **Role String:** `ROOT_ADMIN`
- **Context:** Operates the SaaS business across all agency tenants.
- **Goals:** Monitor MRR, tenant health, plan entitlements, platform uptime, global risk metrics; provision new agency tenants and assist troubleshooting via secure impersonation.

### Persona B: Agency Owner (Paying Tenant Principal)
- **Role String:** `OWNER` (Full capabilities: 21 granular permissions)
- **Context:** Owns one or multiple rental agencies in Casablanca, Marrakech, Tangier, Rabat, Agadir.
- **Goals:** Maximize fleet utilization, track cash flow and profit margins, safeguard fleet assets against fraud, enforce staff permissions, manage subscription plans.

### Persona C: Agency Manager
- **Role String:** `MANAGER` (19 capabilities; restricted from destructive agency billing / tenant deletion)
- **Context:** Runs day-to-day station operations, overrides rates within threshold, manages maintenance rosters, supervises fleet inspections.

### Persona D: Desk Agent
- **Role String:** `AGENT` (14 operational capabilities)
- **Context:** Frontline customer intake, identity document scanning, check-in / check-out inspections, payment collection, contract signature collection.

### Persona E: End-User Renter
- **Role String:** `RENTER`
- **Context:** Moroccan citizens, diaspora (MRE), and international tourists renting vehicles.
- **Goals:** Self-manage KYC profile, securely upload CIN/Passport to a time-boxed encrypted vault, approve agency consent requests via QR code, view rental contracts and invoices.

---

## 3. Feature Breakdown by Version

| Feature Module | MVP Scope | V1 Enterprise Scope (Current) | Future V2 Scope |
| :--- | :--- | :--- | :--- |
| **Fleet Management** | Basic vehicle CRUD, license plates, mileage | Maintenance scheduling, document expiration alerts, oil change (vidange) automation | OBD-II IoT live GPS telemetry & remote immobilizer |
| **Bookings & Schedule** | Create booking, date collision check | Deposit lifecycle (PRE-AUTH, CASH, RELEASE, CLAIM), PDF contract generation | WhatsApp bot direct booking & dynamic pricing engine |
| **Trust Network** | Local tenant blacklist | Cross-tenant HMAC-SHA256 anonymized identity reputation, incident fraud scoring | Biometric face match against Moroccan National ID |
| **Finance & Invoicing** | Basic cash payment entry | 20% TVA breakdown, split payments, multi-channel checkout (Stripe/CMI/Cash), platform SaaS billing | Direct bank feed integration (Attijariwafa / BCP / BMCE) |
| **Incident Dossiers** | Text incident description | Time-stamped visual damage inspections, auto-charge diffing, certified PDF incident dossier export | Real-time automated insurance claim dispatch to RMA/Wafa Assurance |
| **Consent & Vault** | Manual photo upload | Time-boxed revocable consent grants, encrypted Supabase/S3 vault, QR code verification | Self-sovereign verifiable identity credentials |

---

## 4. User Stories & Acceptance Criteria

### US-01: Cross-Tenant Renter Risk Verification
- **As an** Agency Agent  
- **I want to** check a prospective renter's identity against the global trust network without exposing private personal data across tenants  
- **So that** I can prevent renting to high-risk individuals or known fraudsters.
- **Acceptance Criteria:**
  1. Identity number (CIN/Passport) is normalized and hashed with HMAC-SHA256 salted by the server-side `IDENTITY_PEPPER`.
  2. Query returns an aggregated risk profile (Total bookings, Default count, Incident rate, Active blacklist flags).
  3. No private PII (full name, phone, address) belonging to another tenant is ever leaked.
  4. Non-matching renters return a clean score without exposing database record existence.

### US-02: Collision-Free Vehicle Availability
- **As an** Agency Desk Agent  
- **I want** the system to prevent overlapping bookings for the same vehicle  
- **So that** we never promise a vehicle that is already rented or in maintenance.
- **Acceptance Criteria:**
  1. Booking checks evaluate `[startDate, endDate]` overlap inside an atomic PostgreSQL transaction.
  2. Statuses `CONFIRMED`, `ACTIVE`, `PENDING` trigger overlap blocks.
  3. Cancelled or completed bookings release availability immediately.
  4. Cross-tenant booking collisions return HTTP 404 (IDOR guard).

### US-03: Pre/Post Inspection Damage Diffing & Dossier Export
- **As an** Agency Manager  
- **I want to** compare vehicle condition at check-in versus check-out and export a certified PDF dossier  
- **So that** we have legally binding proof for insurance claims and deposit deductions.
- **Acceptance Criteria:**
  1. POST_RENTAL inspection diffs damages against PRE_RENTAL baseline.
  2. Discrepancies in fuel or body damage automatically calculate conservative charge suggestions using `Decimal(12,2)`.
  3. Export button generates a certified bilingual French PDF dossier with tamper-evident SHA-256 integrity hash.
  4. Generation is strictly tenant-scoped and restricted to `fleet.view` capability.

### US-04: Renter Consent Vault (Loi 09-08 Compliance)
- **As a** Renter  
- **I want to** authorize an agency to inspect my identity documents for a strictly limited time  
- **So that** my personal documents are not stored indefinitely or shared without my permission.
- **Acceptance Criteria:**
  1. Renter grants access with an explicit duration (e.g. 24 hours, 7 days).
  2. Agency can only access document URLs when an active `ConsentGrant` exists with matching `agencyId`.
  3. Expired consent grants return HTTP 403 Forbidden.
  4. Renter can revoke active consent at any time from the self-service portal.

---

## 5. Product Roadmap

```
[Phase 1-11: Core Platform]  ──▶  [Phase 12: Fider Lux UI]  ──▶  [Phase 13: Enterprise Integrations]
 • Multi-tenant Isolation         • Modern Hospitality Theme     • CMI / Payzone Moroccan Gateway
 • Decimal Money Math             • RTL (Arabic) / LTR (French)  • OBD-II Fleet Telemetry
 • Capabilities Engine            • Certified PDF Engine         • Insurance API Connectors
 • Global Trust Network           • Full Mobile Responsiveness   • WhatsApp Automated Check-In
```
