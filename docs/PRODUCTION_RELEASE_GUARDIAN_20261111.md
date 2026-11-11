# CarHub OS Guardian Vision production release — November 11, 2026

## Source of truth

- Feature branch: `feat/guardian-vision-mutual-approval` (reconciled with `origin/main`)
- Vercel project: `carhubos`, scope `hel-moues-projects`
- Supabase project: `nsnashznakiofxopdsfg`
- Do not use a preview deployment as a production deployment; production must be built with production environment, validated, then promoted.

## Verified backup and database upgrade rehearsal

The project's existing application database was exported with Supabase CLI to restricted-permission schema and data SQL files on the authorized Mac, in:

`~/Documents/CarHub_Production_Backups/2026-11-11_before_guardian_release/`

The schema and data exports cover 33 existing application tables, and were restored successfully into a network-isolated PostgreSQL 17 database. Before upgrades, test counts matched production: 4 agencies, 11 users, 4 bookings, 13 cars.

A second local PostgreSQL 17 instance restored the same production backup. `prisma migrate deploy` successfully applied all seven pending migrations in order, with 21 total Prisma migrations recorded. All above application row counts were preserved. The final migration protects eight private-feature tables with RLS and revokes Data API privileges for `anon` and `authenticated` roles, while leaving privileged server access in place.

The Supabase project currently shows no managed physical backups or PITR enabled. Protect the logical files; no backup has been copied to a remote repository.

## Before production database changes

1. Verify the production Vercel and Supabase environments resolve to the intended same project.
2. Recheck backup file SHA-256, readability and restorable test results.
3. Verify that no other Prisma migration deployment is running.
4. Apply seven additive migrations in order. Record exact Prisma checksums and successful migration history for each.
5. Verify 21 applied migrations, eight new tables, RLS enabled on eight private tables, and unchanged legacy row counts.
6. Do **not** point carhub.codes at the new build if any migration fails.

## Before promoting a production deployment

- Green GitHub CI (backend Jest/E2E, frontend Vitest/lint/build, browser Playwright, container build, mobile where relevant)
- Production-mode Vercel deployment staged without assigning the live custom domain
- Verify API liveness, authorized/unauthorized route behavior, agency/renter review paths, private file permissions, PDF generation and billing safety
- Make sure existing booking, payment, contact and vehicle operations continue to work
- Keep prior production deployment available for immediate rollback; database changes are additive to preserve compatibility

## Honest scope

Guardian Vision implements guided evidence capture, corrections, version-locked approvals, PDFs, persistent damage records, repair verification and controlled WhatsApp notification actions. It does **not** yet deliver real AI video damage inference, resumable large-video streaming, provider-confirmed WhatsApp delivery, or passwordless renter entry. Do not describe those as production features.
