# Deployment and recovery

## Current state

No staging/production endpoint has been verified. `infra/main.bicep` is an Azure resource-group template, not an existing deployment. Applying it creates billable PostgreSQL, Container Apps and logging resources. No resources are created by normal PR validation.

## Build and validate

Use Node from `.nvmrc`, `npm ci` in backend/frontend, Prisma generation, lint/types/unit/live-DB/browser checks in `.github/workflows/ci.yml`. `release-validation.yml` builds backend runner, backend migration and frontend runner images and scans dependencies/images. An image scan must actually pass before release; an unexecuted workflow is not release evidence.

Build from each Docker context, push the three images to an authorized registry, and record immutable `@sha256:` digests. A separate migration stage includes Prisma CLI; the application runtime does not require dev dependencies. Configure a long-lived, read-only registry pull credential (not an expiring Actions job token).

## Azure prerequisites and configuration

Select an existing subscription/resource group, review costs, and configure an Azure OIDC federation for the GitHub repository with least privilege. Configure protected `staging` and `production` GitHub environments. Variables: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_RESOURCE_GROUP`, `PUBLIC_APP_URL`. The secret `AZURE_DEPLOY_PARAMETERS` contains a standard Bicep JSON parameter document. Required parameters: stage, prefix, location, three image digests, registryServer/registryUsername/registryPassword, databasePassword, jwtSecret, jwtRefreshSecret, identityPepper, allowedOrigin and databaseFirewallRules. Store secure values in GitHub environment secrets or Key Vault; never commit a filled parameter file.

The database URL is derived from the created PostgreSQL server. PostgreSQL allows BTREE_GIST for booking migrations. Supply narrow reviewed egress IP ranges; empty rules do not make the DB usable. Managed-environment staticIp is ingress, not a valid assumption about outbound IPs. A reviewed private VNet/NAT architecture is required where stable egress cannot be established. The current template is a pilot baseline, not a complete high-availability production network design.

Set `allowedOrigin` to the exact HTTPS frontend origin, also used for checkout URLs. The frontend forwards `/api/*` at runtime to backend `127.0.0.1:5406` inside the multi-container app. Online payments are disabled. Add live payments, AI, mail, storage and observability only with authorized real credentials and explicit integration verification.

The deployment workflow is manual, main-branch-only, environment-scoped, and requires cost approval. It runs what-if, provisions with `deployApplication=false`, starts the migration job, waits for success, then deploys the app with `deployApplication=true`. Review the what-if before dispatching or running `COST_APPROVED=yes scripts/deployment/azure-deploy.sh ...`. Existing apps remain on their prior image if migrations fail. Before deploying schema changes, verify backups and compatibility with the prior image.

## Domain, TLS, smoke and rollback

Configure carhub.codes DNS only after authorized registrar access and a real Azure ingress target exist. Bind the custom domain and managed certificate; validate TLS externally. Do not claim the domain works from a Bicep output alone. Run `scripts/deployment/smoke.sh https://actual-host` after deployment; additionally run authenticated diagnostic and rental workflows with dedicated test tenants. These tests must not alter customer data.

Rollback to recorded prior image digests through the same environment controls. Do not automatically reverse schema migrations or drop data. Keep old images schema-compatible. The pilot uses a single replica because existing scheduled jobs lack distributed locks; scaling requires that work first.

## Booking migration preflight

Migration `20261008000200_booking_overlap_guard` refuses invalid dates or overlapping blocking bookings. Review failures with the product owner and correct legitimate business records through an auditable process. After a failed migration, use Prisma's documented `migrate resolve --rolled-back` only after verifying its state and resolving the underlying conflict, then redeploy. Never delete conflicting bookings merely to pass migration.

## Backup and restoration

Azure PostgreSQL retention is configured to 14 days. Validate the actual service policy and restore capability after provisioning. Export an encrypted/secure off-host logical backup with `DATABASE_URL` securely supplied to `scripts/deployment/backup.sh /secure/path/backup.dump`. The script uses custom pg_dump, checks archive readability and emits a checksum. PostgreSQL client version must be compatible with the server.

Restore into a dedicated, empty recovery database with `RESTORE_DATABASE_URL` and `ALLOW_RESTORE_TEST=yes`, using `restore-test.sh backup.dump`. Never use production as a restore-test target. Verify migration history, row counts, tenant boundaries and representative application behavior on the recovered database. A local recovery drill may use `LOCAL_RECOVERY_TEST=yes`; this permits TLS off only for loopback and requires the recovery database name to start with `carhub_restore_test_`. Remote backups always normalize TLS to verify-full. Archive checksums and a restore command are not proof that recovery has been tested. Encrypt stored backups and restrict permissions and retention; no storage account is implied by these scripts.

## Known access limitations

Current GitHub integration can read repositories and push the development branch; listing Actions secrets returns HTTP 403. No usable Azure deployment identity, registry pull credential, production database or DNS credentials have been demonstrated. Supply these through secure environment settings or protected GitHub environments, then run and verify staging before production. No secret values should be pasted into chat.
