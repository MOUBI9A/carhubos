# Privacy & Regulatory Readiness Dossier — Fider (CarHub OS)

**Author:** Agent 8 (Security) & Agent 13 (Documentation)  
**Status:** TECHNICAL CONTROLS DESIGNED TO SUPPORT COMPLIANCE  
**Jurisdiction Context:** Kingdom of Morocco (Law 09-08 regarding the protection of personal data)  
**Regulatory Body:** Commission Nationale de contrôle de la protection des Données à caractère Personnel (CNDP)  

> **LEGAL NOTICE:** This document outlines technical and architectural controls implemented in the Fider software codebase. It does not constitute legal certification or formal legal advice. Formal compliance requires administrative filings with the CNDP and operational compliance by each tenant agency.

---

## 1. Implemented Technical Controls

The Fider platform includes architectural and cryptographic mechanisms designed to support data privacy:

### 1.1 Renter Identity Network & HMAC Salted Hashing (Pillar 6)
- Renter identity documents (CIN, Passport) are transformed into non-reversible, deterministic hashes using `HMAC-SHA256` salted with a high-entropy secret (`IDENTITY_PEPPER`).
- The global Trust Network shares risk indicators (blacklist flags, dispute flags) indexed solely by `identityHash`. Plaintext CIN/Passport numbers and names are not broadcast across tenant boundaries.

### 1.2 Time-Boxed Consent Engine (Pillar 5B)
- Access to high-sensitivity renter documents (`RenterDocument`) is governed by an explicit `ConsentGrant` model.
- Tenants cannot view customer vault documents without a valid, unexpired, non-revoked consent grant.
- Renters can inspect and revoke grants at any time via the Renter Self-Service Portal (`/portal/consent`).

### 1.3 Strict Tenant Isolation & IDOR Guards
- Every API endpoint enforces agency membership checks. A user from Agency A attempting to access Agency B's customer records, booking dossiers, or contracts receives an immediate HTTP 404 response. No PII is leaked across tenants.

### 1.4 Cryptographic Password & Secret Handling
- Passwords are salted and hashed using `bcrypt` (work factor 10).
- Session credentials are transmitted exclusively via HttpOnly, SameSite=Lax cookies, mitigating cross-site scripting (XSS) token exfiltration.
- Environment secrets (`JWT_SECRET`, `IDENTITY_PEPPER`, `SUPABASE_SERVICE_ROLE_KEY`) are enforced at startup; the application aborts if any secret is missing or empty.

---

## 2. Personal Data Inventory

| Data Category | Data Elements | Storage Location | Retention / Deletion |
| :--- | :--- | :--- | :--- |
| **Agency Staff** | Name, Email, Password Hash, Role Preset | PostgreSQL `User` table | Soft-delete tombstone (`deletedAt`) |
| **Renters / Customers** | First Name, Last Name, Phone, CIN/Passport, Nationality | PostgreSQL `Customer` table | Tenant-scoped; anonymizable on request |
| **Trust Identity** | `identityHash` (HMAC-SHA256), Risk Score | PostgreSQL `RenterIdentity` table | Persistent cross-tenant hash |
| **Identity Documents** | Scanned CIN, Driver License, Rental Agreements | Supabase S3-compatible Vault | S3 object deletion cascade |
| **Audit Logs** | Actor ID, Action, Entity ID, IP Address, Timestamp | PostgreSQL `AuditLog` table | Immutable forensic log |

---

## 3. Organizational Requirements for Tenants

Operating agencies deploying Fider must implement internal organizational safeguards:
1. **Access Management:** Agency owners must assign staff members the lowest viable role preset (`AGENT` or `MANAGER`), minimizing access to financial and identity records.
2. **Device Security:** Agency terminals must enforce screen locks and full-disk encryption.
3. **Physical Document Handling:** Paper copies of customer driver licenses or cash deposits must be kept in locked physical file cabinets.
4. **Data Breach Protocols:** Agencies must establish a 72-hour internal notification procedure in case an agency employee's credentials are compromised.

---

## 4. Legal Review Required

Prior to enterprise or public-sector rollout, legal counsel qualified in Moroccan data privacy law must review:
1. **Terms of Service & Privacy Policy:** Agency customer contracts must clearly state that identity documents may be verified against national trust databases.
2. **Subprocessor Agreements:** Cloud infrastructure contracts (AWS, Supabase, Twilio) must be reviewed to ensure adequate data processing addendums (DPAs).
3. **Right to Erasure (Right to be Forgotten):** Procedures for handling customer requests for deletion while balancing statutory car-rental record-keeping mandates (Moroccan commercial law requires retaining rental contracts for a defined statutory period).

---

## 5. CNDP / Regulatory Action Required

Under Moroccan Law 09-08, processing personal data requires formal authorization:
1. **Prior Declaration / Authorization (Déclaration Préalable / Demande d'Autorisation):**
   - Each individual car-rental agency utilizing Fider must submit a declaration to the CNDP for customer management systems and GPS tracking (if utilized).
   - Fider (as a SaaS provider / sous-traitant) must provide documentation of technical safeguards to assist agencies in their CNDP application filings.
2. **International Data Transfers:** If servers or cloud storage buckets are located outside the Kingdom of Morocco, authorization for transfer of personal data abroad (transfert de données à l'étranger) must be requested from the CNDP pursuant to Article 43 and 44 of Law 09-08.
