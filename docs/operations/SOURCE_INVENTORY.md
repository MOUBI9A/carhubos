# Application source inventory

Source commit `a854a21d6970a0dd2c6c3abb3c21d945d8ed2b83`.
Reproduce from the repository root with `python3 scripts/source-inventory.py a854a21d6970a0dd2c6c3abb3c21d945d8ed2b83`.
This snapshot lists declarations in committed code. Deployment, configuration and role acceptance require separate evidence. Counts include declarations even when access is conditional.

## Web pages (52)

- `/` — `frontend/src/app/page.tsx`
- `/account-deletion` — `frontend/src/app/(public)/account-deletion/page.tsx`
- `/admin/agencies` — `frontend/src/app/(admin)/admin/agencies/page.tsx`
- `/admin/logs` — `frontend/src/app/(admin)/admin/logs/page.tsx`
- `/admin/provision` — `frontend/src/app/(admin)/admin/provision/page.tsx`
- `/admin/pulse` — `frontend/src/app/(admin)/admin/pulse/page.tsx`
- `/admin/settings` — `frontend/src/app/(admin)/admin/settings/page.tsx`
- `/admin` — `frontend/src/app/(admin)/admin/page.tsx`
- `/agency/[subdomain]` — `frontend/src/app/(public)/agency/[subdomain]/page.tsx`
- `/agent/diagnostics` — `frontend/src/app/(agent)/agent/diagnostics/page.tsx`
- `/agent/guardian` — `frontend/src/app/(agent)/agent/guardian/page.tsx`
- `/agent/inspections` — `frontend/src/app/(agent)/agent/inspections/page.tsx`
- `/agent/tasks` — `frontend/src/app/(agent)/agent/tasks/page.tsx`
- `/agent` — `frontend/src/app/(agent)/agent/page.tsx`
- `/dashboard/accidents` — `frontend/src/app/(owner)/dashboard/accidents/page.tsx`
- `/dashboard/ai-vision` — `frontend/src/app/(owner)/dashboard/ai-vision/page.tsx`
- `/dashboard/automations` — `frontend/src/app/(owner)/dashboard/automations/page.tsx`
- `/dashboard/billing` — `frontend/src/app/(owner)/dashboard/billing/page.tsx`
- `/dashboard/blacklist` — `frontend/src/app/(owner)/dashboard/blacklist/page.tsx`
- `/dashboard/bookings` — `frontend/src/app/(owner)/dashboard/bookings/page.tsx`
- `/dashboard/customers/[id]` — `frontend/src/app/(owner)/dashboard/customers/[id]/page.tsx`
- `/dashboard/customers` — `frontend/src/app/(owner)/dashboard/customers/page.tsx`
- `/dashboard/diagnostics` — `frontend/src/app/(owner)/dashboard/diagnostics/page.tsx`
- `/dashboard/erp` — `frontend/src/app/(owner)/dashboard/erp/page.tsx`
- `/dashboard/finance` — `frontend/src/app/(owner)/dashboard/finance/page.tsx`
- `/dashboard/fleet-map` — `frontend/src/app/(owner)/dashboard/fleet-map/page.tsx`
- `/dashboard/fleet/[id]` — `frontend/src/app/(owner)/dashboard/fleet/[id]/page.tsx`
- `/dashboard/fleet` — `frontend/src/app/(owner)/dashboard/fleet/page.tsx`
- `/dashboard/guardian` — `frontend/src/app/(owner)/dashboard/guardian/page.tsx`
- `/dashboard/hub` — `frontend/src/app/(owner)/dashboard/hub/page.tsx`
- `/dashboard/reports` — `frontend/src/app/(owner)/dashboard/reports/page.tsx`
- `/dashboard/search` — `frontend/src/app/(owner)/dashboard/search/page.tsx`
- `/dashboard/settings` — `frontend/src/app/(owner)/dashboard/settings/page.tsx`
- `/dashboard/staff` — `frontend/src/app/(owner)/dashboard/staff/page.tsx`
- `/dashboard/vault-files` — `frontend/src/app/(owner)/dashboard/vault-files/page.tsx`
- `/dashboard/vault` — `frontend/src/app/(owner)/dashboard/vault/page.tsx`
- `/dashboard/waitlist` — `frontend/src/app/(owner)/dashboard/waitlist/page.tsx`
- `/dashboard/work-orders` — `frontend/src/app/(owner)/dashboard/work-orders/page.tsx`
- `/dashboard` — `frontend/src/app/(owner)/dashboard/page.tsx`
- `/estimate-approval/[token]` — `frontend/src/app/estimate-approval/[token]/page.tsx`
- `/landing` — `frontend/src/app/(public)/landing/page.tsx`
- `/login` — `frontend/src/app/login/page.tsx`
- `/onboarding` — `frontend/src/app/onboarding/page.tsx`
- `/portal/book` — `frontend/src/app/(renter)/portal/book/page.tsx`
- `/portal/history` — `frontend/src/app/(renter)/portal/history/page.tsx`
- `/portal/inspections` — `frontend/src/app/(renter)/portal/inspections/page.tsx`
- `/portal` — `frontend/src/app/(renter)/portal/page.tsx`
- `/privacy` — `frontend/src/app/(public)/privacy/page.tsx`
- `/signup` — `frontend/src/app/signup/page.tsx`
- `/support` — `frontend/src/app/(public)/support/page.tsx`
- `/terms` — `frontend/src/app/(public)/terms/page.tsx`
- `/verify-email` — `frontend/src/app/verify-email/page.tsx`

## Expo Router screen files (15)

- `mobile/app/(agent)/index.tsx`
- `mobile/app/(agent)/inspection.tsx`
- `mobile/app/(agent)/scanner.tsx`
- `mobile/app/(agent)/settings.tsx`
- `mobile/app/(auth)/login.tsx`
- `mobile/app/(owner)/bookings.tsx`
- `mobile/app/(owner)/fleet.tsx`
- `mobile/app/(owner)/index.tsx`
- `mobile/app/(owner)/settings.tsx`
- `mobile/app/(renter)/index.tsx`
- `mobile/app/(renter)/settings.tsx`
- `mobile/app/(renter)/vault.tsx`
- `mobile/app/index.tsx`
- `mobile/app/inspection/wizard.tsx`
- `mobile/app/settings/delete-account.tsx`

## Nest controller prefixes (42)

- `/api/accidents` — `backend/src/accidents/accidents.controller.ts`
- `/api/agencies` — `backend/src/agencies/agencies.controller.ts`
- `/api/agency/staff` — `backend/src/agency-staff/agency-staff.controller.ts`
- `/api/ai-vision` — `backend/src/ai-vision/ai-vision.controller.ts`
- `/api/analytics` — `backend/src/analytics/analytics.controller.ts`
- `/api/` — `backend/src/app.controller.ts`
- `/api/audit-logs` — `backend/src/audit-logs/audit-logs.controller.ts`
- `/api/auth` — `backend/src/auth/auth.controller.ts`
- `/api/automations` — `backend/src/automations/automations.controller.ts`
- `/api/bookings` — `backend/src/bookings/bookings.controller.ts`
- `/api/cars` — `backend/src/cars/cars.controller.ts`
- `/api/payments` — `backend/src/checkout/checkout.controller.ts`
- `/api/search` — `backend/src/common/search/search.controller.ts`
- `/api/agency/consent` — `backend/src/consent/consent.controller.ts`
- `/api/contracts` — `backend/src/contracts/contracts.controller.ts`
- `/api/customers` — `backend/src/customers/customers.controller.ts`
- `/api/diagnostics` — `backend/src/diagnostics/diagnostics.controller.ts`
- `/api/documents` — `backend/src/documents/documents.controller.ts`
- `/api/` — `backend/src/entitlements/entitlements.controller.ts`
- `/api/expenses` — `backend/src/expenses/expenses.controller.ts`
- `/api/guardian/staff` — `backend/src/guardian/guardian-notifications.controller.ts`
- `/api/guardian/staff` — `backend/src/guardian/guardian-pdf.controller.ts`
- `/api/guardian/customer` — `backend/src/guardian/guardian-pdf.controller.ts`
- `/api/guardian/staff` — `backend/src/guardian/guardian.controller.ts`
- `/api/guardian/customer` — `backend/src/guardian/guardian.controller.ts`
- `/api/hub` — `backend/src/hub/hub.controller.ts`
- `/api/inspections` — `backend/src/inspections/inspections.controller.ts`
- `/api/maintenance` — `backend/src/maintenance/maintenance.controller.ts`
- `/api/notifications` — `backend/src/notifications/notifications.controller.ts`
- `/api/onboarding` — `backend/src/onboarding/onboarding.controller.ts`
- `/api/parts` — `backend/src/parts/parts.controller.ts`
- `/api/payments` — `backend/src/payments/payments.controller.ts`
- `/api/portal` — `backend/src/portal/portal.controller.ts`
- `/api/public` — `backend/src/public/public.controller.ts`
- `/api/refusal-logs` — `backend/src/refusal-logs/refusal-logs.controller.ts`
- `/api/reports` — `backend/src/saas-admin/reports.controller.ts`
- `/api/saas-admin` — `backend/src/saas-admin/saas-admin.controller.ts`
- `/api/tasks` — `backend/src/tasks/tasks.controller.ts`
- `/api/trust` — `backend/src/trust/trust.controller.ts`
- `/api/vault/files` — `backend/src/vault/vault.controller.ts`
- `/api/webhooks` — `backend/src/webhooks/webhooks.controller.ts`
- `/api/work-orders` — `backend/src/work-orders/work-orders.controller.ts`

## Nest HTTP method declarations (206)

- `DELETE /api/agency/staff/:userId`
- `DELETE /api/auth/me`
- `DELETE /api/automations/:id`
- `DELETE /api/cars/:id`
- `DELETE /api/customers/:id`
- `DELETE /api/documents/:id`
- `DELETE /api/expenses/:id`
- `DELETE /api/vault/files/:id`
- `DELETE /api/webhooks/:id`
- `GET /api/accidents/:id`
- `GET /api/accidents`
- `GET /api/agencies/me/stats`
- `GET /api/agencies/me`
- `GET /api/agency/billing`
- `GET /api/agency/consent/documents/:renterUserId/:documentId/download-url`
- `GET /api/agency/consent/documents/:renterUserId`
- `GET /api/agency/staff`
- `GET /api/ai-vision/recent`
- `GET /api/analytics/agency`
- `GET /api/analytics/car/:id`
- `GET /api/analytics/command-centre`
- `GET /api/analytics/erp-dashboard`
- `GET /api/analytics/financial-pulse`
- `GET /api/analytics/utilization`
- `GET /api/audit-logs`
- `GET /api/auth/me`
- `GET /api/auth/verification-status`
- `GET /api/automations`
- `GET /api/bookings/:id/contract`
- `GET /api/bookings/:id`
- `GET /api/bookings/pricing/quote`
- `GET /api/bookings`
- `GET /api/cars/:id`
- `GET /api/cars`
- `GET /api/contracts/:id`
- `GET /api/customers/:id`
- `GET /api/customers/blacklisted`
- `GET /api/customers`
- `GET /api/diagnostics/access`
- `GET /api/diagnostics/knowledge/dtc/:code`
- `GET /api/diagnostics/knowledge/search`
- `GET /api/diagnostics/knowledge/system/:system`
- `GET /api/diagnostics/scenarios`
- `GET /api/diagnostics/sessions/:id/health-summary`
- `GET /api/diagnostics/sessions/:id/report.pdf`
- `GET /api/diagnostics/sessions/:id/report`
- `GET /api/diagnostics/sessions/:id`
- `GET /api/diagnostics/sessions`
- `GET /api/diagnostics/vehicles`
- `GET /api/documents/car/:carId`
- `GET /api/documents`
- `GET /api/expenses/summary`
- `GET /api/expenses`
- `GET /api/guardian/customer/reports/:id/media/:evidenceId/url`
- `GET /api/guardian/customer/reports/:id/pdf`
- `GET /api/guardian/customer/reports/:id`
- `GET /api/guardian/customer/reports`
- `GET /api/guardian/staff/booking/:bookingId`
- `GET /api/guardian/staff/cars/:carId/active-damage`
- `GET /api/guardian/staff/reports/:id/media/:evidenceId/url`
- `GET /api/guardian/staff/reports/:id/notifications/whatsapp`
- `GET /api/guardian/staff/reports/:id/pdf`
- `GET /api/guardian/staff/reports/:id`
- `GET /api/health`
- `GET /api/hub/discover`
- `GET /api/inspections/booking/:bookingId/diff`
- `GET /api/inspections/booking/:bookingId`
- `GET /api/inspections/car/:carId`
- `GET /api/inspections`
- `GET /api/maintenance/agency`
- `GET /api/maintenance/car/:carId/schedule`
- `GET /api/maintenance/car/:carId`
- `GET /api/maintenance/predictive-overview`
- `GET /api/notifications/unread-count`
- `GET /api/notifications/whatsapp-link`
- `GET /api/notifications`
- `GET /api/onboarding/state`
- `GET /api/parts/cross-reference/:number`
- `GET /api/parts/dtc/:code`
- `GET /api/parts/search`
- `GET /api/payments/pending`
- `GET /api/payments/recent`
- `GET /api/platform/plans`
- `GET /api/portal/bookings`
- `GET /api/portal/consent`
- `GET /api/portal/documents/:id/download-url`
- `GET /api/portal/documents`
- `GET /api/portal/me`
- `GET /api/portal/notifications`
- `GET /api/public/agency-by-subdomain/:subdomain`
- `GET /api/public/estimates/:token`
- `GET /api/public/fleet`
- `GET /api/ready`
- `GET /api/refusal-logs`
- `GET /api/reports/contract/:bookingId`
- `GET /api/reports/fleet-audit`
- `GET /api/saas-admin/audit-logs`
- `GET /api/saas-admin/metrics`
- `GET /api/saas-admin/overview`
- `GET /api/search`
- `GET /api/tasks`
- `GET /api/trust/blacklist`
- `GET /api/vault/files/:id/download-url`
- `GET /api/vault/files`
- `GET /api/webhooks`
- `GET /api/work-orders/:id/pdf`
- `GET /api/work-orders/:id/share-link`
- `GET /api/work-orders/:id`
- `GET /api/work-orders/metrics/summary`
- `GET /api/work-orders`
- `GET /api`
- `PATCH /api/accidents/:id`
- `PATCH /api/agencies/me`
- `PATCH /api/agency/staff/:userId/capabilities`
- `PATCH /api/automations/:id`
- `PATCH /api/bookings/:id/deposit`
- `PATCH /api/bookings/:id/status`
- `PATCH /api/cars/:id`
- `PATCH /api/contracts/:id/sign`
- `PATCH /api/customers/:id/blacklist`
- `PATCH /api/customers/:id/unblacklist`
- `PATCH /api/customers/:id`
- `PATCH /api/documents/:id`
- `PATCH /api/expenses/:id`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/onboarding/step`
- `PATCH /api/payments/:id/verify`
- `PATCH /api/portal/notifications/:id/read`
- `PATCH /api/refusal-logs/:id/recovered`
- `PATCH /api/refusal-logs/:id/status`
- `PATCH /api/saas-admin/agency/:id/subscription`
- `PATCH /api/saas-admin/agency/:id/tier`
- `PATCH /api/saas-admin/invoice/:id/mark-paid`
- `PATCH /api/tasks/:id/status`
- `PATCH /api/trust/blacklist/:id/lift`
- `PATCH /api/work-orders/:id/status`
- `POST /api/accidents`
- `POST /api/agency/consent/request`
- `POST /api/agency/staff`
- `POST /api/ai-vision/analyze`
- `POST /api/auth/exit-impersonation`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/register`
- `POST /api/auth/resend-verification`
- `POST /api/auth/verify-email`
- `POST /api/automations`
- `POST /api/bookings/:id/deposit`
- `POST /api/bookings`
- `POST /api/cars`
- `POST /api/contracts/generate/:bookingId`
- `POST /api/customers`
- `POST /api/diagnostics/knowledge/copilot`
- `POST /api/diagnostics/sessions/:id/analyze`
- `POST /api/diagnostics/sessions/:id/confirm`
- `POST /api/diagnostics/sessions/:id/events`
- `POST /api/diagnostics/sessions/:id/explain`
- `POST /api/diagnostics/sessions/:id/report`
- `POST /api/diagnostics/sessions/:id/simulate`
- `POST /api/diagnostics/sessions/:id/tests`
- `POST /api/diagnostics/sessions`
- `POST /api/diagnostics/vehicles`
- `POST /api/documents`
- `POST /api/expenses`
- `POST /api/guardian/customer/reports/:id/approve`
- `POST /api/guardian/customer/reports/:id/dispute`
- `POST /api/guardian/customer/reports/:id/evidence`
- `POST /api/guardian/customer/reports/:id/findings`
- `POST /api/guardian/staff/reports/:id/evidence`
- `POST /api/guardian/staff/reports/:id/findings/:findingId/decision`
- `POST /api/guardian/staff/reports/:id/findings/:findingId/repair`
- `POST /api/guardian/staff/reports/:id/findings`
- `POST /api/guardian/staff/reports/:id/notifications/whatsapp`
- `POST /api/guardian/staff/reports/:id/publish`
- `POST /api/guardian/staff/reports/:id/reopen`
- `POST /api/guardian/staff/reports`
- `POST /api/hub/list`
- `POST /api/inspections`
- `POST /api/maintenance`
- `POST /api/notifications/mark-all-read`
- `POST /api/notifications/push-token`
- `POST /api/onboarding/cars/bulk-csv`
- `POST /api/onboarding/complete`
- `POST /api/payments/checkout/:invoiceId`
- `POST /api/payments/checkout/subscription`
- `POST /api/payments/webhooks/:provider`
- `POST /api/payments`
- `POST /api/portal/consent/:id/approve`
- `POST /api/portal/consent/:id/revoke`
- `POST /api/portal/documents`
- `POST /api/portal/trust-qr`
- `POST /api/public/estimates/:token/approve`
- `POST /api/refusal-logs`
- `POST /api/saas-admin/agency/:id/impersonate`
- `POST /api/saas-admin/agency/:id/invoice`
- `POST /api/saas-admin/provision`
- `POST /api/tasks`
- `POST /api/trust/assess`
- `POST /api/trust/backfill`
- `POST /api/trust/blacklist`
- `POST /api/trust/reviews`
- `POST /api/vault/files`
- `POST /api/webhooks/subscribe`
- `POST /api/work-orders/:id/verify`
- `POST /api/work-orders`
- `PUT /api/diagnostics/sessions/:id/estimate`

## Prisma models (40)

- `Agency`
- `HubListing`
- `User`
- `EmailVerificationToken`
- `AgencyMembership`
- `Car`
- `CarDocument`
- `MaintenanceRecord`
- `Accident`
- `RefusalLog`
- `AuditLog`
- `Booking`
- `Invoice`
- `Payment`
- `CheckoutSession`
- `VaultFile`
- `Expense`
- `Customer`
- `CustomerDocument`
- `Inspection`
- `AutomationRule`
- `Contract`
- `Task`
- `WebhookSubscription`
- `RenterIdentity`
- `RenterReview`
- `BlacklistEntry`
- `ConsentGrant`
- `Notification`
- `RenterDocument`
- `Plan`
- `Subscription`
- `PlatformInvoice`
- `DiagnosticVehicle`
- `DiagnosticSession`
- `WorkOrder`
- `GuardianReport`
- `GuardianEvidence`
- `GuardianFinding`
- `GuardianEvent`

## Prisma SQL migrations (21)

- `20260717234217_init_postgres`
- `20260718005811_money_decimal`
- `20260718011500_phase2_finish`
- `20260718035904_capability_engine`
- `20260718043550_renter_consent`
- `20260718050242_renter_document_vault`
- `20260718120401_saas_business_layer`
- `20260720125819_hot_path_indexes`
- `20260721213211_add_accident`
- `20260723144413_add_agency_website`
- `20260723171043_add_checkout_session`
- `20260724142846_add_vault_file`
- `20260725140835_vault_entity_linking`
- `20260727131401_add_saas_subscription_checkout`
- `20261011170000_email_verification_and_onboarding`
- `20261017200000_diagnostics`
- `20261017203000_add_work_orders`
- `20261105120000_add_car_image_url`
- `20261111140000_guardian_mutual_inspections`
- `20261111170000_guardian_one_photo_per_finding`
- `20261111190000_private_feature_tables_rls`

## Nest scheduled methods (4)

- `CronExpression.EVERY_DAY_AT_MIDNIGHT` — `handleDocumentExpiryChecks` in `backend/src/automations/automations.service.ts`
- `CronExpression.EVERY_HOUR` — `handleOverdueReturns` in `backend/src/automations/automations.service.ts`
- `CronExpression.EVERY_DAY_AT_MIDNIGHT` — `handleBlacklistExpiry` in `backend/src/automations/automations.service.ts`
- `CronExpression.EVERY_HOUR` — `expireDueGrants` in `backend/src/consent/consent.service.ts`

## GitHub workflow jobs (7)

- `.github/workflows/ci.yml` — `backend`
- `.github/workflows/ci.yml` — `backend-container`
- `.github/workflows/ci.yml` — `backend-e2e`
- `.github/workflows/ci.yml` — `frontend`
- `.github/workflows/ci.yml` — `e2e`
- `.github/workflows/mobile-ci.yml` — `mobile-test-and-typecheck`
- `.github/workflows/mobile-ci.yml` — `mobile-build-dryrun`

## Provider adapters, interfaces and integrations (13)

- `backend/src/ai-vision/ai-vision.service.ts`
- `backend/src/diagnostics/providers/anthropic.provider.ts`
- `backend/src/diagnostics/providers/diagnostic-provider.ts`
- `backend/src/email/providers/development-email.provider.ts`
- `backend/src/email/providers/resend-email.provider.ts`
- `backend/src/integrations/stripe/stripe.service.ts`
- `backend/src/integrations/twilio/twilio.service.ts`
- `backend/src/parts/providers/morocco-catalog.provider.ts`
- `backend/src/parts/providers/parts-provider.interface.ts`
- `backend/src/payment-gateway/providers/cmi.gateway.ts`
- `backend/src/payment-gateway/providers/mock.gateway.ts`
- `backend/src/payment-gateway/providers/stripe.gateway.ts`
- `backend/src/vault/vault-storage.service.ts`

AI Vision supports a simulation mode. Diagnostics separately declares an Anthropic adapter. Its constructor checks for a key and model. Inspect each integration before enabling external calls.

## Literal application, Compose and example configuration keys (37)

- `AI_VISION_MODE`
- `ALLOWED_ORIGINS`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `AUTH_THROTTLE_LIMIT`
- `DAMAGE_AUTO_CHARGE_PLACEHOLDER_AMOUNT`
- `DATABASE_URL`
- `DB_NAME`
- `DB_PASSWORD`
- `DB_USER`
- `EMAIL_FROM`
- `GUARDIAN_WHATSAPP_AGENCY_IDS`
- `GUARDIAN_WHATSAPP_CONTENT_SID`
- `GUARDIAN_WHATSAPP_MODE`
- `IDENTITY_PEPPER`
- `JWT_SECRET`
- `NEXT_DIST_DIR`
- `NEXT_PUBLIC_API_URL`
- `NODE_ENV`
- `PAYMENT_PROVIDER`
- `PORT`
- `POSTGRES_DB`
- `POSTGRES_PASSWORD`
- `POSTGRES_USER`
- `PUBLIC_APP_URL`
- `PUPPETEER_EXECUTABLE_PATH`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_VAULT_BUCKET`
- `THROTTLE_LIMIT`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`

Scope includes literal process.env references, uppercase literal getter keys in application source, Next build settings, Compose and backend example declarations. Dynamic lookups, CI-only variables and secrets configured only in hosting require a separate inventory.

## Plan feature keys (6)

- `trust_network`
- `hub`
- `ai_vision`
- `reports`
- `api_access`
- `priority_support`

Runtime selectors include `AI_VISION_MODE`, `PAYMENT_PROVIDER` and `GUARDIAN_WHATSAPP_MODE` with `GUARDIAN_WHATSAPP_AGENCY_IDS`. A plan entitlement and a configured provider are separate conditions.

## Literal TODO and FIXME markers in application source (2)

- `backend/src/bookings/bookings.service.ts:146` — TODO(Phase 2): add DB-level overlap exclusion constraint on Postgres
- `backend/src/bookings/bookings.service.ts:347` — TODO(Phase 2): add DB-level overlap exclusion constraint on Postgres

## Externally owned decisions

| Decision | Recommended default | Required before |
|---|---|---|
| Legal business identity, controller/contact details, terms/privacy, retention, GPS notice, subprocessors | Founder supplies facts; Moroccan counsel reviews public/operational text | Real-user pilot for affected data |
| Managed PostgreSQL/backup region and budget | Choose one managed service with PITR and documented restore support | Staging/pilot data |
| Transactional email/SMS/WhatsApp provider and sender identity | Enable only contracted channels; unavailable channels remain honest | Outbound production messages |
| Payment provider/merchant contract | One provider first; sandbox then limited live acceptance; CMI remains off until contracted | Real online payment |
| AI provider/model and data terms | One provider, zero-retention/no-training terms where available, strict spend cap | Any real agency data sent to a model |
| Pilot agencies and support commitment | 3–5 named agencies with onboarding owner and feedback cadence | Pilot start |
| Mobile release | Web-first; mobile follows its separate device/store gate | Store submission |
| GPS provider and legal basis | Passive/read-only pilot only | Any real location ingestion |
