# AR / FR / EN continuation checkpoint

Updated: 2026-10-07 (Asia/Makassar).

## Resume safely

- Active checkout: `/Users/hamzaelmoueddane/Desktop/car/carhubos`. The old `/Users/hamzaelmoueddane/Desktop/carhubos` path no longer exists.
- There are extensive pre-existing uncommitted unification, theme, documentation, and billing changes. Inspect `git status`; do not reset, overwrite, or attribute them to this localization batch.
- Use Node 22 (`/opt/homebrew/opt/node@22/bin/node` on this machine), frontend `http://localhost:3001`, API `http://localhost:5406/api`. The frontend was reused; the local API was rebuilt and restarted to load the authorization fix. No database reseeding or deployments were performed.
- Read `CLAUDE.md`, `docs/operations/AUDIT_BACKLOG.md`, `docs/product/DESIGN_VISION.md`, and this checkpoint before continuing. Historical "mostly done" i18n claims do not mean complete screen translations.
- The user authorized an hourly thread continuation, automation `continue-fider-fixes-and-ar-fr-en-checks`. It resumes available work; it does not bypass account limits or consume usage resets. Do not create duplicates.

## Completed in this batch

### Live authorization verification and agent overview

- Rebuilt the local backend successfully, verified the old process belonged to this checkout, and restarted only that API process with its existing dotenv configuration and local frontend origins. The running API now includes the trust-override fix (PID 4837 at verification); re-check process identity on future runs rather than trusting a historical PID.
- Added opt-in `backend/test/trust-override-live.e2e-spec.ts`: eight real HTTP/PostgreSQL checks establish agent denial before financial writes, forged-payload rejection, blank-reason rejection, stale-manager denial after membership demotion, booking.create enforcement, authorized owner/manager bookings, and normal agent booking after lifting the temporary flag. Authorized fixtures verify 700 MAD invoices, 116.67 MAD inclusive VAT, pending payments and trimmed audit reasons.
- Live tests restrict both API/database hosts to loopback, use a uniquely named temporary agency/identity, and assert cleanup of their own bookings, invoices, payments, audit entries, users, agency, identity and flag. No existing business data was changed, no seeds ran, and no external payment/checkout was invoked. This is not proof of external gateway configuration or platform-wide transaction correctness.
- Agent overview now distinguishes rented, maintenance, out-of-service and unknown states; unknown states are never counted as available. Priority badges, error headings, retry/empty states and counts use the selected locale. Summary copy explicitly limits counts to the five tasks/six vehicles displayed, rather than claiming agency-wide totals.
- Failed agent loads now show an accessible, retryable error instead of fake zero/empty results. Header actions and fleet status rows stack on mobile; license plates are LTR-isolated under Arabic. Screenshot review additionally caught clipped mobile summary labels, which now wrap.
- Added 12 deterministic agent browser cases: desktop/mobile in each language plus localized failure/retry and genuine empty-state checks. These intercept APIs; they are separate from the live authorization and role-login suites.

### Trust override authorization and localized feedback

- Reproduced the authorization defect in focused tests before changing implementation: AGENT, RENTER, unknown/missing memberships and whitespace-only reasons incorrectly reached booking creation.
- Booking creation now checks the actor's current agency-scoped membership preset (OWNER or MANAGER) before accepting a blocked-renter override. A stale manager JWT cannot bypass a demoted membership. The existing authenticated ROOT_ADMIN bypass remains explicit; the controller passes that role from authenticated context, never the request body.
- Blank reasons remain blocked; accepted reasons are trimmed in the audit record. Authentication, booking.create capability checks, car/customer tenant-scoped 404 behavior and ordinary unblocked agent bookings are preserved. Unauthorized overrides do not create bookings, invoices, payments, successful override audit entries or webhooks.
- Added 19 backend regressions covering allowed/denied membership presets, platform bypass, blank reasons, forged payload authority, stale role context, lookup failure, tenant boundaries, and controller guard/context wiring.
- Added a stable permission-denial code with actionable AR/FR/EN UI feedback; failure keeps the booking form and reason intact. Changing the selected renter (including walk-in selection) now clears the previous renter's override reason.
- Six additional deterministic browser cases cover blocked-renter blank-reason rejection, renter switching, trimmed request payloads, successful confirmation and permission denial in all three languages. Mobile price/tax details now stack instead of squeezing Arabic text into narrow side-by-side columns.
- Runtime boundary resolved locally: the old non-watcher API was rebuilt/restarted and the eight live override checks above passed against it. Role-login tests alone still do **not** establish business-transaction correctness. No deployment or reseeding was performed.

### Dashboard acceptance and live role verification

- Corrected warning-only guardian metrics: they now show the localized warning badge rather than claiming every alert is critical. Warning renewal requests retain HIGH priority; expired-document requests remain URGENT.
- Made the four primary dashboard metrics and compliance alerts native keyboard-operable buttons with visible focus. The shared Card component opts into button semantics explicitly, preserving existing noninteractive callers. Other activity/operations tiles still need keyboard review.
- Screenshot review caught Latin plate segments displaying in reverse order under Arabic RTL. Compliance-row and shared car-photo plate labels now use isolated LTR text; browser assertions cover both labels.
- Added AR/FR/EN acceptance tests for missing walk-in fields, registration failure/retry, reversed booking dates, booking failure with preserved inputs, dashboard load failure/reconnect, empty agencies and warning-only keyboard actions.
- Login fields now have associated translated labels and autocomplete metadata. Credential rejection, rate limiting, service errors and network failures produce appropriate localized feedback, not raw backend English; pending submissions are guarded.
- Verified all five existing seeded roles through real UI login in each language: ROOT_ADMIN, OWNER, MANAGER, AGENT and RENTER (15 cases). Each checks the destination heading, language/direction, session persistence after reload, actual API role and HttpOnly cookie. Renter cases additionally verify redirection away from the owner dashboard. No setup seed, account registration, or business-data mutation was used.
- The live role checks establish login/routing/session behavior only, not complete translations or transaction correctness for those role portals. They are opt-in through CARHUB_ROLE_PASSWORD; no password is stored in the new test source.

### Command centre continuation

- Added 173 messages per language for the main dashboard, booking/registration forms, compliance interventions and risk panel. Counts, money, dates, relative times and known API enums use the selected locale; renter/agency-entered content remains unchanged.
- Replaced the fake "assigned" renewal toast with `POST /tasks`, a priority appropriate to the alert, busy state, real success feedback and retryable failure. The task is explicitly unassigned; no fabricated staff assignment is claimed.
- Added client-side invalid/past/reversed-date guards, duplicate-submit guards, accessible registration/date fields, local-calendar minimum dates, and corrected the misleading escrow-included copy.
- Fixed invisible chart bars (missing parent height), French mobile overflow (intrinsic width of the hidden table), and stale animated-number formatting after locale switches. Screen-reader tables remain accessible inside a clipped wrapper.
- Main dashboard has desktop/mobile tests in all three languages covering booking requests, renewal task requests, translated risk display, visible chart bars and no horizontal overflow. Separate tests cover renewal failure/retry and live locale switching. Risk-panel unit tests cover four risk states plus loading/error states in each language.
- Updated existing real-stack booking/trust selectors to use the translated English catalog. Those older real-stack specs have **not** been rerun in this batch. Walk-in creation, failed booking retry, empty/error dashboard and blocked-renter overrides have deterministic browser coverage above; override transactions now also have focused live API coverage. Uncommon dashboard API enums and full live UI workflows remain open.

- Finance: translated forms, categories, payment methods, invoice statuses, empty/error states, validation, accessible labels and feedback in all three languages; locale-aware MAD/number formatting and bidi isolation.
- Finance correctness: decimal inputs, positive/two-decimal validation, submission/verification busy states, paid-invoice selection for refunds, localized retry states, and removal of the misleading nonfunctional auto-deduct toggle.
- Finance presentation: CSS chart widths remain machine-readable percentages, while visible labels use locale formatting. Pending payments stack on small screens so customer names and amounts remain readable.
- Shared navigation: corrected Arabic desktop sidebar visibility. The RTL off-canvas transform is now mobile-only. Role labels are translated.
- Shared controls: translated modal/dialog close buttons, combobox defaults/search/empty states, and theme controls. Dialog close placement and combobox text alignment use logical directions.
- Locale selection: honors weighted language preferences, rejects unsupported prefixes, and ignores invalid/zero-quality preferences. Browser tests cover initial negotiation, language switching and persistence.
- Theme integration: validated the pre-hydration theme value, supplied a default root theme, and bounded the intentional hydration exception to the root element. Theme selection works when localStorage writes fail; saved themes survive reloads.
- Public agency access: reproduced the incorrect redirect to login when `/auth/me` returns 401 for a logged-out public visitor. Added `/agency` to the public route policy with path-segment boundaries, retaining redirects for protected paths and lookalike prefixes.
- Toasts use the active Intl locale rather than separately parsing the cookie, with translated close controls and RTL-aware entry motion.

## Verification evidence

| Check | Latest result | What it establishes |
| --- | --- | --- |
| Backend Jest | 417 / 417 pass, 51 suites | Existing regressions plus 19 trust-override service/controller tests using mocked persistence |
| Frontend Vitest | 67 / 67 pass, 8 files | Risk states, finance, API redirect policy, shared controls, Card semantics, theme storage, formatting and catalogs |
| Catalog coverage | 684 keys per language; matching key and argument sets | Nonempty entries and valid ICU rendering for values 0, 1, 2, 3, 11 and 100 in all three catalogs |
| Live trust-override API / PostgreSQL | 8 / 8 pass | Current rebuilt API authorization, real invoice/payment writes for allowed fixtures, no financial writes for denied fixtures, verified fixture cleanup |
| Browser agent overview | 12 / 12 pass | Desktop/mobile status accuracy, localized priorities/counts, bounded summaries, isolated plates, failure/retry and empty states in all three languages |
| Browser command centre | 28 / 28 pass | Desktop/mobile forms, blocked-renter confirmation/denial, isolated plates, warning/keyboard behavior, walk-in and booking validation/retry, empty/error states and locale switching |
| Browser login feedback | 12 / 12 pass | Associated translated labels, credential/rate-limit/service/network feedback, mobile viewport and root locale/direction |
| Live seeded-role browser login | 15 / 15 pass | Five roles × three locales against the actual local backend, session reload, HttpOnly cookie and renter role routing |
| Browser finance/shared shell | 13 / 13 pass | Desktop/mobile FR/AR/EN, expense/refund request payloads, root language/direction, Arabic sidebar edge, no horizontal page overflow, initial locale negotiation, locale/theme persistence and console-error checks |
| Browser public agency | 3 / 3 pass | Logged-out agency access and reload in each language with the expected 401 auth response |
| TypeScript and ESLint | Both workspaces pass | Frontend lint runs with zero warnings; production build also type-checks frontend |
| Frontend production build | Pass | Next.js compiles and generates the route build successfully |

The agent, command-centre, finance, login-feedback and public-agency suites intercept API calls with deterministic fixtures (68 cases). The separate live-role suite does not intercept APIs (15 cases); it was rerun successfully after the API restart. The eight backend live tests independently verify scoped trust-override transactions against real HTTP/PostgreSQL. Neither suite proves untouched routes, all possible data sizes, all browsers, or production infrastructure. Arabic dashboard/blocked-booking, desktop finance, mobile ledger/pending, expense-dialog, and agent desktop/mobile screenshots in all three languages were inspected.

Commands from the repository root:

```sh
node scripts/verify.mjs
cd backend
CARHUB_LIVE_OVERRIDE_CHECK=1 npx jest --config test/jest-e2e.json --runInBand trust-override-live.e2e-spec.ts
cd ..
cd frontend
CARHUB_E2E_EXTERNAL_SERVERS=1 npx playwright test e2e/agent-locales.e2e.ts e2e/command-centre-locales.e2e.ts e2e/finance-locales.e2e.ts e2e/login-locales.e2e.ts e2e/public-agency-locales.e2e.ts --project=chromium --no-deps
CARHUB_E2E_EXTERNAL_SERVERS=1 CARHUB_ROLE_PASSWORD='<local seeded password>' npx playwright test e2e/live-role-locales.e2e.ts --project=chromium --no-deps
node scripts/audit-localization.mjs
node scripts/audit-localization.mjs --json
```

Browser output lives in `frontend/test-results/` and is ignored. Screenshot capture disables finite animations to avoid reviewing half-faded pages or moving sidebars.

## Remaining work: not complete

**Do not report platform-wide localization as 100%.** Static inspection still finds **909 literal JSX text/attribute candidates in 40 files**. This is a triage inventory, not a percentage: some entries are brand names/currency codes, and dynamic strings, toast bodies, API errors, data arrays, exports and dates require additional inspection. Zero candidates does not certify a route.

Inventory paths below are relative to `frontend/src/`:

| File | Literal candidates |
| --- | ---: |
| `app/(owner)/dashboard/fleet/[id]/page.tsx` | 91 |
| `app/(owner)/dashboard/bookings/page.tsx` | 64 |
| `app/(owner)/dashboard/erp/page.tsx` | 55 |
| `app/(admin)/admin/provision/page.tsx` | 52 |
| `app/(owner)/dashboard/customers/[id]/page.tsx` | 45 |
| `app/(owner)/dashboard/accidents/page.tsx` | 40 |
| `app/(owner)/dashboard/billing/page.tsx` | 37 |
| `app/(owner)/dashboard/customers/page.tsx` | 34 |
| `app/(owner)/dashboard/fleet/page.tsx` | 33 |
| `app/(owner)/dashboard/blacklist/page.tsx` | 32 |
| `app/(owner)/dashboard/staff/page.tsx` | 31 |
| `app/(owner)/dashboard/waitlist/page.tsx` | 31 |
| `app/(owner)/dashboard/hub/page.tsx` | 27 |
| `app/(renter)/portal/page.tsx` | 27 |
| `app/(owner)/dashboard/vault/page.tsx` | 25 |
| `app/(owner)/dashboard/automations/page.tsx` | 24 |
| `app/(public)/landing/_components/ContactSection.tsx` | 24 |
| `app/(admin)/admin/settings/page.tsx` | 23 |
| `app/(owner)/dashboard/settings/page.tsx` | 22 |
| `app/(owner)/dashboard/search/page.tsx` | 17 |
| `app/(owner)/dashboard/vault-files/page.tsx` | 17 |
| `app/(admin)/admin/agencies/page.tsx` | 16 |
| `app/(public)/landing/_components/TrustConsole.tsx` | 16 |
| `app/(owner)/dashboard/ai-vision/page.tsx` | 15 |
| `components/guided-action.tsx` | 15 |
| `app/(owner)/dashboard/customers/[id]/VaultAccessPanel.tsx` | 14 |
| `app/(public)/landing/_components/SolutionsSection.tsx` | 11 |
| `app/(owner)/dashboard/reports/page.tsx` | 10 |
| `app/(renter)/portal/UploadDocumentModal.tsx` | 10 |
| `app/(admin)/admin/logs/page.tsx` | 9 |
| `app/(public)/landing/_components/PricingSection.tsx` | 8 |
| `app/pay/mock/page.tsx` | 8 |
| `app/(admin)/admin/pulse/page.tsx` | 5 |
| `app/(owner)/dashboard/fleet/[id]/VaultFileAttachment.tsx` | 5 |
| `app/(renter)/portal/book/page.tsx` | 4 |
| `components/ThemeSwitcher.tsx` | 4 (brand names) |
| `app/(admin)/admin/page.tsx` | 3 |
| `app/(owner)/dashboard/fleet-map/page.tsx` | 3 |
| `app/(public)/agency/[subdomain]/page.tsx` | 1 (brand; dynamic text still needs review) |
| `components/CommandPalette.tsx` | 1 (ESC key label) |

## Next batches

1. The local trust-override runtime gap is resolved. Continue with remaining fleet/detail, customer/detail and bookings localization; do not reseed the existing database. The opt-in live API suite can regression-check authorization with isolated, cleaned-up fixtures.
2. Finish `/dashboard` acceptance coverage for uncommon API enums and live workflow mutations. Activity and operations tiles still use clickable divs; four KPI cards and compliance alerts are fixed. The existing override audit call precedes later date/availability checks; audit/booking atomicity is a separate remaining hardening check. Preserve canonical API values before declaring the route complete.
3. Continue other owner routes, admin, renter, agent task/inspection workflows and public marketing. Validate each on narrow/mobile and desktop widths in all three languages, not just key parity. The agent overview status/error defects are fixed; its previous zero literal-scan result demonstrates why dynamic strings and API semantics also need inspection.
4. Audit shared API error display, backend-supplied labels, file exports and rich/ICU strings. Do not translate renter-entered content or identifiers implicitly.
5. Expand live workflow tests without destructive reseeding. All five seeded-role logins now pass in AR/FR/EN, but login smoke tests and deterministic localization suites do not replace transactional acceptance checks.
6. Reconcile remaining non-i18n backlog separately: report generation/scheduling, fleet GPS, accident attachments/insurance notification, automation dispatch, storage/provider configuration, seasonal pricing decisions and deployment gates. Re-check current implementations before treating old backlog items as missing.

Completion percentages are meaningful only for defined checks: 56 deterministic browser cases, 15 live-login cases and 675-key catalog coverage are fully exercised. Overall product/localization completion remains unquantified until all route and workflow acceptance checks are enumerated and verified.
