# Production Topology and Deployment Trigger

**Audit date:** 2026-11-19  
**Audit task:** `P0-05`  
**Repository:** `MOUBI9A/carhubos`  
**Canonical application base audited:** `ff6d1674aa9350c03dbb0dc915c1bdf778d0ccbd`  
**Method:** read-only repository, GitHub, Vercel, Render, DNS, HTTP and Supabase inspection

This record names the systems that currently serve Fider without publishing
secret values. It is production topology evidence, not a release approval or a
claim that staging, backup, restore, rollback or real-user readiness is proven.

## Verified production path

| Layer | Verified current state | Evidence boundary |
|---|---|---|
| Source | Private GitHub repository `MOUBI9A/carhubos`; production branch `main` | Vercel project metadata and GitHub deployment records |
| Hosting owner | Vercel team `hel-moues-projects` (`hel-moue's projects`), Hobby plan; authenticated account is team owner | `vercel whoami`, `vercel teams ls` |
| Hosting project | Vercel project `carhubos` (`prj_YG0iAooP1Tnf6KNOPbi1vW1wJDKE`), framework `services`, root at repository root, Node.js `24.x` | `vercel project inspect carhubos --scope hel-moues-projects` |
| Application shape | One Next.js frontend service and one NestJS container service, routed together by root `vercel.json` | Repository config and deployed build metadata |
| Current production revision | Vercel deployment `dpl_CoTyp78nFzyKXiSmQpKhG8tcziTv`, target `production`, state `READY`, Git SHA `ff6d1674aa9350c03dbb0dc915c1bdf778d0ccbd`, Git ref `main` | Vercel deployment list/inspect and GitHub deployment status |
| Public domains | `carhub.codes` redirects to `www.carhub.codes`; both are assigned to the current production deployment | Vercel domain/alias inspection and live HTTP checks |
| DNS ownership | Domain is registered through a third party and uses external Name.com nameservers; Vercel reports the configuration as valid | Vercel domain inspection and public DNS |
| Database | Supabase project `carhubos` (`nsnashznakiofxopdsfg`), region `eu-west-1`, status `ACTIVE_HEALTHY`, PostgreSQL `17.6.1.147` | Supabase project metadata |
| Object storage | Supabase Storage bucket `vault-files`; bucket is private | Read-only `storage.buckets` metadata query |
| Render | Render workspace `My Workspace` contains no service or database linked to `MOUBI9A/carhubos` | Render workspace resource inventory |

The Render service named `carhub-infinity-api` is linked to the different
repository `MOUBI9A/carhub-infinity`. It is not part of the verified Fider
production path and must not be used as deployment evidence for this repository.

## Main-to-production behavior

Merging or pushing `main` automatically starts a Vercel production deployment.
The merge of PR #30 produced Git SHA
`ff6d1674aa9350c03dbb0dc915c1bdf778d0ccbd`; Vercel created a production
deployment for that exact SHA, marked it `READY`, and assigned the production
domains. GitHub recorded the deployment as `success` at
`2026-11-19T07:45:11Z`.

Feature-branch pushes create Vercel preview deployments. The `P0-05` claim
commit `480860db92069f92bb16bd7c5997f92cdef34d4a` produced a preview deployment,
not a production deployment.

There is no production promotion stage between protected `main` and Vercel
production. Therefore a merge is also a production deployment trigger even
when the diff is documentation-only.

## Runtime and health evidence

At `2026-11-19T07:56Z`:

- `https://carhub.codes` returned `308` to `https://www.carhub.codes/`.
- `https://www.carhub.codes` completed at `/landing` with HTTP `200`.
- `https://www.carhub.codes/api/health` returned HTTP `200` with service
  `fider-api` and status `ok`.
- `https://www.carhub.codes/api/ready` returned HTTP `200` with service
  `fider-api`, status `ready`, and database `reachable`.

These checks prove reachability at that time. They do not prove every role
journey, tenant boundary, payment path, storage upload or rollback path.

## Environment ownership and configuration names

Vercel currently stores these names for **Production only**:

- `PUBLIC_APP_URL`
- `SUPABASE_SECRET_KEY`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_VAULT_BUCKET`
- `JWT_SECRET`
- `IDENTITY_PEPPER`
- `ALLOWED_ORIGINS`
- `PAYMENT_PROVIDER`
- `AI_VISION_MODE`

Secret values were not read or copied. The live configuration reports
`PAYMENT_PROVIDER=DISABLED` and `AI_VISION_MODE=disabled`; this is configuration
evidence only, not proof that every unfinished feature is unreachable.

No Preview or Development variables were listed for the Vercel project. A
preview can therefore be build-green while its backend is not a
production-shaped acceptance environment. Environment rules and isolated
staging remain `P0-06` and `P1-02` work.

Vercel ownership is verified to the authenticated team owner account. The
Supabase connector verifies the project and organization identifiers, but does
not expose a human organization-role inventory; named Supabase break-glass and
migration owners remain to be recorded.

## Database and migration provenance

The checkout contains 21 Prisma migration directories. Production
`public._prisma_migrations` contains the same 21 migration names, all with a
non-null completion timestamp and no rollback timestamp. The latest applied
migration is `20261111190000_private_feature_tables_rls`, completed at
`2026-11-11T09:31:08Z`.

Supabase's platform-native migration list is empty because this application
records migrations through Prisma's `_prisma_migrations` table. This is not
evidence that no migrations ran.

The verified production application image does **not** run
`prisma migrate deploy` on startup:

- `backend/Dockerfile.vercel` starts `node dist/main` directly.
- Root `vercel.json` defines the services and routes but no migration step.
- GitHub Actions applies migrations only to fresh CI databases.
- `docker-compose.yml` has a one-shot migration gate, but that file describes
  the local/container-compose path, not the Vercel production release path.

Consequently, schema code can auto-deploy from `main` without an enforced
pre-code production migration gate. Until staging, rehearsal, backup/PITR and
a controlled release sequence exist, schema/migration PRs must not merge under
the routine documentation-only delegation.

## Database access-control observation

The production database has 41 ordinary tables in the `public` schema. RLS is
disabled on 33 and enabled on 8. A direct privilege check found zero public
tables on which either `anon` or `authenticated` currently has any of
`SELECT`, `INSERT`, `UPDATE` or `DELETE`.

This means the audit did **not** prove direct anonymous Data API access to
those 33 tables. RLS remains an important defense-in-depth gap: a future grant
or configuration change could expose a table without row policies, and direct
database roles bypass the application tenant layer. Do not bulk-enable RLS in
production without compatible policies and application tests. The exact
grants, exposed-schema settings and table policies belong in `P1-01` and
`P1-05`.

The `vault-files` storage bucket is private. Upload authorization, signed-read
behavior, retention, scanning and recovery are not accepted by this topology
audit.

## DNS record summary

- Apex A record: `216.198.79.1`.
- `www.carhub.codes` CNAME: Vercel-managed target.
- Nameservers: `ns1bqx.name.com`, `ns2dky.name.com`, `ns3gxy.name.com`,
  `ns4ksy.name.com`.
- No `api.carhub.codes` CNAME was present; the API is served under
  `www.carhub.codes/api/*` through the Vercel service rewrite.
- No apex MX record was returned during this audit.

Provider-generated DNS targets can change. Vercel's domain status and live
resolution are the authoritative operational checks, not the copied address
above.

## Confirmed gaps and release restrictions

1. No production-shaped staging environment or manual promotion gate exists.
2. `main` auto-deploys, so merging runtime, dependency, environment,
   infrastructure or schema changes is a production action.
3. No automated production migration gate is attached to the Vercel release.
4. Backup, PITR, restore ownership, measured RPO/RTO and rollback have not been
   verified.
5. Vercel Preview lacks a verified isolated database/provider configuration.
6. Supabase human role inventory and break-glass ownership are not yet recorded.
7. Public-schema RLS and Data API exposure must be reviewed deliberately before
   any grant or client-side Supabase access is introduced.

## Safe next gates

- `P0-06`: publish the environment/provider/data matrix and state that Vercel
  Preview is not staging.
- `P1-01`: perform the deeper read-only schema, extension, drift, scale,
  access-control and data-quality provenance audit without raw customer export.
- `P1-02`: select and provision isolated production-shaped staging plus the
  accepted managed PostgreSQL backup/PITR posture.
- `P1-03`: rehearse restore and the exact migration/forward-repair sequence in a
  disposable environment before any production schema release.

## Audit safety and limitations

This audit made no deployment, alias, DNS, environment, database, storage,
provider or billing mutation. It did not reveal secrets, export customer rows,
run a migration, alter RLS, create a bucket or connect Render to the repository.
The user-owned untracked `screenshots/` directory was not touched.

A bounded, read-only Antigravity review of the document, state files and
deployment configuration returned `NO BLOCKER`. It specifically found the
production/Preview distinction, migration conclusions, RLS containment wording,
secret handling and release restrictions consistent with the supplied live
evidence.

