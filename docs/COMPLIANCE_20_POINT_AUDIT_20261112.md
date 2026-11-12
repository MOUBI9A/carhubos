# CarHub OS — 20-point legal, privacy, consumer, and accessibility audit

**Date:** 12 November 2026
**Scope:** repository `~/Desktop/carhubos` production-base `main`; implementation branch `feat/compliance-20-point-audit`.
**Status:** engineering changes prepared **for review only**, not a legal certification or production release.

## Important distinctions

- The Instagram reel supplies an engineering **checklist**, not an applicable legal opinion.
- CarHub targets Moroccan rental agencies, so Morocco's Law **09-08** (personal information) and **31-08** (consumer protection) deserve priority. GDPR may apply to some EU-related operations; US FTC review guidance is relevant only where US rules apply.
- **Regulatory compliance, the identity of the data controller, contractual terms, declarations to CNDP, lawful bases, cross-border transfers, and data-retention rules must be signed off by a qualified legal adviser and business operator.**
- Existing public legal pages included unsupported promises of CNDP compliance, a fictive/unverified operating entity and address, 99.8% uptime, certified cryptographic timestamps, guaranteed same-day support, TLS version and complete destruction of files. These are not established by code alone and must not be published as verified facts.

## The 20-point implementation and gap matrix

| # | Reel requirement | Existing code evidence and finding | Changes on this branch | Outstanding decision / verification |
|---|---|---|---|---|
| 1 | Privacy policy | `frontend/src/app/(public)/privacy/page.tsx` existed; overconfident regulator/company/security claims. | Replaced with operational data categories, rights, transparent limitations, and explicit pending legal review. | Confirm responsible entity, full processors, jurisdictions, actual rights procedures, and retention schedule. |
| 2 | Terms of service | `.../terms/page.tsx` existed; unsupported uptime/certified evidence and exclusive forum promises. | Revised to distinguish software service from the agency-driver rental contract, and human review for damage claims. | Legal entity, SaaS contract, venue, warranty, liability, dispute clauses, versioning. |
| 3 | Refund policy | No dedicated public route located. | New `/refunds` route distinguishes SaaS fees from agency rental/deposit refunds; avoids invented refund rights. | Actual cancellation periods, refund deadlines, billing entity and taxes; lawyer sign-off. |
| 4 | Cookie policy | Session cookie `infinity_token` in `auth.controller.ts`, locale `NEXT_LOCALE` in `LocaleSwitcher.tsx`; no public explanation. | New `/cookies` notice identifies these and browser storage. | Review production third-party cookies and session storage before final publication. |
| 5 | Cookie banner/consent | No optional advertising or analytics JavaScript found in inspected frontend. | No fake/unused banner. Explicit hold point: add opt-in **before loading** nonessential trackers if introduced. | Runtime tracking inventory and legal assessment. Add a real preference centre when optional tracking exists. |
| 6 | Form consent | Signup had no explicit linked legal acknowledgement; renter document consent exists in `consent.service.ts`. | Two independent unchecked signup controls; server refuses agency signup if absent; records nullable server timestamps in **unapplied** Prisma migration. | Countersignature/legal document version, other public forms and transaction-specific notices. |
| 7 | Data minimization | Collects rental identity, documents and free-text account deletion reason. | Removed optional free-text deletion reason from frontend; warned not to email IDs unsolicited. | Evaluate every signup/booking/document field, records of processing, and purge workflows. |
| 8 | Third-party SDKs | Backend integration code for Supabase Storage, Stripe, CMI, Twilio, Resend; Next/Vercel services. | Documented audit inventory, distinguished dormant adapters from live; no new trackers. | Live configuration inventory, data-processing agreements, transfer countries, key rotation, retention and vendor notices. |
| 9 | Dark patterns | Consent and approval screens exist; rental deposits and trust scores may affect user decisions. | No prechecked marketing/legal consent; explicit human-review language for damage billing. | Manual UX audit of booking cancellation, customer correction, deposit decisions, reversibility and accessibility. |
| 10 | Hidden fees | Subscription prices from `/platform/plans`, rental pricing and invoice flows. | Replaced unverified VAT-inclusive/free-beta promises; linked refund transparency. | Verify all taxes, deposits, damage fees and final payable amount prior to commitment. |
| 11 | Fake reviews | Marketing TrustConsole has **Illustrative data** badge with fictional people and counts. Pricing had unsubstantiated `Most popular`. | Removed popularity assertion; retains explicit illustrative-data badge. | Verify all real review provenance, incentive disclosures, moderation and cross-agency scoring fairness. |
| 12 | Unsupported claims | Claims included 99.8% SLA, cryptographic certification, specific TLS, rapid support, full erasure. | Revised terms/privacy/support/deletion language; no certification claimed. | Full marketing and contract claim substantiation, legal and technical evidence files. |
| 13 | Alt text | Login/signup hero pictures use `alt=""` as decoration; other images use custom `AgencyImage`. | No false descriptions added to decoration. | Scan all role dashboards for meaningful images/icons and correct alternative text. |
| 14 | Colour contrast | Design tokens in `frontend/src/app/globals.css`; muted/faint text may be low contrast. | Added explicit keyboard focus styling, but **no WCAG-AA claim** yet. | Automated axe and manual WCAG 2.2 AA checks at desktop/mobile, contrast and zoom. |
| 15 | Keyboard access | Public nav hamburger has labels; login and signup field headings were not native labels; no public skip link. | Associated labels with inputs; added skip link and visible focus ring; corrected broken cross-page section links. | Test focus order, dialogs, menus, dashboards and screen reader announcements. |
| 16 | Business details | Unverified `Fider Technologies SARL`, Casablanca street address, staff availability and contact claims. | Removed unsupported legal identity/address/phone and SLA from revised public pages. | Business owner must provide verified operator name, registration/ICE, contact channels, and responsible party. |
| 17 | Children's consent | Agency signup previously lacked an adult/authority self-attestation. | Required adult and business-authority confirmation for new agencies, checked both browser and server, dated server record. | Actual minimum age, children/driver policies, parental consent where legally necessary. |
| 18 | Unsubscribe | Transactional verification email and Twilio workflow exist; webhook `unsubscribe` is unrelated to email marketing. | No fake unsubscribe mechanism; marketing email is out of scope unless activated. | If marketing campaigns launch, build signed one-click unsubscribe, suppression list and preference management. |
| 19 | Licensed assets | `frontend/public/img` has five provided image assets; fonts loaded via `next/font/google`. No provenance/attribution records found. | Created license review checklist; did **not** fabricate ownership or licences. | Identify owners/licenses for every photograph, illustration, font and icon; replace or license unknown assets. |
| 20 | Data deletion requests | `/account-deletion` calls `DELETE /auth/me`; `AuthService.deleteAccount` scrubs core user fields, revokes consent and deletes *database rows*, but does not guarantee storage deletion or retained audit erasure. | Removed false complete-erasure promise; no longer copies raw name/email/free-text reason into **new** deletion audit metadata. | Implement and test full retained-data inventory, storage purge, archive exceptions, deletion request tracking, and data-export rights. Historical audit data needs review. **P0 release gate.** |

## Security and production considerations

1. **Never automatically delete identity evidence or signed inspection records** during a rollout. Retention exceptions and user rights need per-category, jurisdiction-aware decisions.
2. The existing self-service closure currently uses `tx.renterDocument.deleteMany` and account anonymization; storage deletion, copies, previous logs and other entities are not covered. The UI and API now describe that boundary honestly. A full erasure processor needs a separately tested design.
3. **Signup schema migration** `20261112160000_agency_legal_acknowledgements` adds nullable `User.legalNoticeAcknowledgedAt`, `User.legalNoticeRevision` and `User.adultBusinessAuthorityConfirmedAt`. It has **not** been run in production. Test mobile/API clients for compatibility before enforcing these flags.
4. Guardian Vision video-upload functionality remains separate in **draft PR #20**. Do not merge/rebase that feature into this compliance work.
5. Renter/agency sensitive documents require role/capability and consent verification beyond public legal pages. Confirm Supabase Storage bucket settings, RLS and external processor contracts.
6. The existing demo accounts share a known password; rotate before real customers access the platform. No account passwords or production state were changed during this compliance branch.
7. No real checkout, refund, payment, outbound message, deletion, production migration or production deployment was executed by this branch.

## Verification checklist before approval

- [ ] Confirm business entity, owner sign-off, company registration, working privacy/support inboxes.
- [ ] Lawyer finalizes terms, privacy, cookies, refund/deposit terms, processing roles, lawful bases and jurisdictional applicability.
- [ ] Verify whether CNDP notifications/authorizations, DPIA or GDPR conditions apply.
- [ ] Approve retention and deletion matrix, storage purge, DSAR handling and audit-log minimization.
- [ ] Sign vendor DPAs and document Subprocessors/data transfers (Supabase/Vercel/Stripe/CMI/Twilio/Resend).
- [ ] Audit page-to-page charges (MAD, taxes, rent, deposits, optional damage fees) and cancellation consequences.
- [ ] Record licenses and permissions for all `public/img` assets and fonts.
- [ ] WCAG 2.2 AA automated/manual review, keyboard, screen reader, contrast, mobile zoom.
- [ ] Test migration on a disposable database; run full frontend/backend suites and full-stack Playwright against an isolated environment.
- [ ] Rotate test account passwords and verify there are no privileged shared credentials.
- [ ] Reconcile mobile clients with new registration acknowledgement requirements.
- [ ] Review final changes before any merge/deployment. This branch must stay draft until these gates are satisfied.

## Public primary sources (for legal counsel's review, not a legal determination)

- Morocco CNDP legislation including Law 09-08 and Consumer Law 31-08: https://www.cndp.ma/textes-et-lois/
- CNDP conditions / proportionality and legitimate purpose: https://www.cndp.ma/conditions/
- W3C WCAG 2.2 contrast (Level AA): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum/
- FTC US rule on fake consumer reviews (if US rules apply): https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials

## Executed local validation (2026-11-12)

- Prisma schema validation and client generation: passed, migration not applied.
- Backend full Jest (Node VM modules): **658 passed**, **16 skipped**, no failures; TypeScript + lint passed.
- Frontend full Vitest before extra contrast tests: **55 passed**; TypeScript + scoped lint passed; production Next.js build passed.
- New CSS contrast unit tests: **3 passed**; primary foreground colour and faint-text contrast improved.
- Playwright Chromium for public notices, signup acknowledgement, keyboard skip navigation: **9 passed**.
- axe-core WCAG 2.x A/AA scan of signup, login and six public notice routes: **0 violations** in this automated scan. This **does not certify accessibility** across authenticated pages or manual assistive-technology scenarios.
- Old browser test exposed duplicate nested `<main>` landmarks; fixed and reran successfully.
- No production deployment, DB migrations, live account changes or payments.
