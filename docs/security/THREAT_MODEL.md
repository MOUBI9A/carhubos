# Fider (CarHub OS) — Security Threat Model & Hardening Report

**Document Owner:** Agent 8 — Security Engineer  
**Status:** Audited & Hardened  
**Methodology:** OWASP Top 10 (2021/2026), STRIDE Threat Modeling, Moroccan Law 09-08 (CNDP)

---

## 1. STRIDE Threat Matrix & Defenses

| Threat Category | Potential Attack Vector | Fider Architectural Defense | Verification Status |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Forged session cookies or stolen bearer tokens | JWT stored exclusively in `HttpOnly`, `SameSite=Lax`, `Secure` cookies (`infinity_token`). Tamper-proof payload verification. | Verified |
| **Tampering** | Parameter tampering on `agencyId` to access other fleets | `agencyId` is strictly extracted from verified session claims via `@CurrentUser()`. Body/query `agencyId` overrides are forbidden. | Verified |
| **Repudiation** | Staff member denies altering a contract or clearing an invoice | All critical mutations log before/after snapshots via `@Global` `AuditLogsService` with actor ID and timestamp. | Verified |
| **Information Disclosure** | IDOR probing of car or booking IDs across tenants | Any query attempting to access a resource of another tenant returns **HTTP 404 Not Found** (never 403), preventing existence enumeration. | Verified |
| **Denial of Service** | Volumetric brute-force on `/auth/login` or PDF generation | NestJS `ThrottlerModule` enforces per-IP sliding window rate limits. File uploads bounded to strict byte maximums. | Verified |
| **Elevation of Privilege** | Agent modifying staff capabilities to grant Owner rights | Role capability updates enforce membership boundaries and fail-closed checks via `CapabilitiesGuard`. | Verified |

---

## 2. Deep-Dive Security Mitigations

### A. Strict In-Depth Tenant Isolation (IDOR Immunity)
- **Problem:** In multi-tenant systems, an attacker alters `/api/bookings/:id` from `booking-tenant-1` to `booking-tenant-2`.
- **Mitigation:**
  ```typescript
  const booking = await this.prisma.booking.findFirst({
    where: { id, agencyId: currentUser.agencyId },
  });
  if (!booking) throw new NotFoundException('Booking not found');
  ```
  Returning `404` prevents an adversary from determining whether the ID exists in another tenant's fleet.

### B. Cross-Tenant Anonymized Risk Sharing (HMAC-SHA256)
- **Problem:** Storing plaintext CIN (Moroccan National ID) or Passport numbers in a shared blacklist violates national privacy regulations (CNDP Law 09-08).
- **Mitigation:**
  ```typescript
  const hashedIdentity = crypto
    .createHmac('sha256', process.env.IDENTITY_PEPPER)
    .update(normalizedId)
    .digest('hex');
  ```
  The server salt (`IDENTITY_PEPPER`) is immutable post-rollout. Two agencies hashing the same CIN produce identical tokens for risk aggregation without ever disclosing the original identity to third parties.

### C. Webhook Server-Side Request Forgery (SSRF) Guard
- **Problem:** Agencies configuring webhook URLs might supply internal endpoints (e.g. `http://169.254.169.254/latest/meta-data` or `http://localhost:5432`).
- **Mitigation:**
  - Resolved IP addresses are validated against private, loopback, and cloud metadata ranges (RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`).
  - Outgoing webhook requests are immediately aborted if the target resolves to a forbidden subnet.

### D. File Upload & Binary Inspection Hardening
- **Allowed MIME Types:** Strictly whitelisted (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`).
- **Size Caps:** 8 MB for AI neural vision scans; 10 MB for encrypted document vault uploads.
- **Signed URL Access:** Documents in the vault are never served publicly. Pre-signed URLs with short lifespans (15 minutes) are generated only after verifying active consent grants.

---

## 3. Security Audit Checklist

- [x] Zero exposed secrets in repository history.
- [x] No hardcoded JWT secrets or mock peppers in production paths.
- [x] Input sanitization via `class-validator` `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`.
- [x] HTML escaping implemented for all user-generated fields rendered into PDF templates.
- [x] Atomic transactions (`prisma.$transaction`) employed for all check-then-act operations.
- [x] CSRF protection via HttpOnly cookie isolation and SameSite policies.
