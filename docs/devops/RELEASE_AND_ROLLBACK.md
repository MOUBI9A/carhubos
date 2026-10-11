# Fider (CarHub OS) — Production Release & Rollback Runbook

**Runbook ID:** REL-OPS-2026-01  
**Author / Owner:** Agent 10 (DevOps / SRE Engineer) & Agent 14 (CTO / Supervisor)  
**Target Environment:** Production Pilot (Moroccan Agency Deployment)  
**Status:** ACTIVE & MANDATORY FOR ALL DEPLOYMENTS

---

## 1. Release Architecture & Principles

1. **Zero-Downtime Migration Policy (Expand / Contract):**
   - Database schema changes must always be backward-compatible (additive only).
   - Never rename or drop active columns in the same release that introduces new code.
   - First Release: Add new column as optional or with default.
   - Second Release: Migrate data and update application references.
   - Third Release: Remove deprecated column in subsequent maintenance cycle.
2. **Deterministic Versioning:** Releases follow Semantic Versioning (`vMAJOR.MINOR.PATCH`). Production pilot tagged `v1.0.0-pilot`.
3. **Automated Gate Verification:** Every release candidate must pass CI (lint, tsc, jest, vitest, migrations, Playwright e2e, and production builds) before artifacts are promoted.

---

## 2. Pre-Release Gate Checklist

Before deploying any release to staging or production, the release captain must verify:

- [ ] All CI checks passing on `main` branch.
- [ ] Automated backup verified within the last 24 hours via `scripts/verify_backup.sh`.
- [ ] No uncommitted database migrations (`npx prisma migrate status`).
- [ ] Feature flags configured appropriately (`ai_damage_detection: true`, `cloud_vision_inference: false` until live credentials).
- [ ] Rate limits and security middleware active (`ThrottlerGuard`, `CorrelationIdMiddleware`).
- [ ] Node environment set to `NODE_ENV=production`.

---

## 3. Production Deployment Execution Sequence

Execute the deployment in the following strict order:

### Step 1: Pre-Deployment Snapshot Backup
```bash
# Generate immediate safety backup before any schema changes
bash scripts/backup_db.sh
```

### Step 2: Apply Database Migrations
```bash
cd backend
# Deploy pending migrations idempotently (never runs seed in production)
npx prisma migrate deploy
```

### Step 3: Deploy Backend Service (Blue/Green or Rolling)
1. Deploy new container with healthcheck monitoring:
   ```bash
   # Liveness probe
   curl -f http://localhost:5406/api/health || exit 1
   # Deep readiness probe (DB ping + memory check)
   curl -f http://localhost:5406/api/health/readiness || exit 1
   ```
2. Switch incoming reverse proxy traffic (Nginx / Cloudflare) to the new backend instance once readiness probe returns HTTP 200.

### Step 4: Deploy Frontend Service & Invalidate Edge Cache
1. Build Next.js 16 standalone production bundle:
   ```bash
   cd frontend && npm run build
   ```
2. Deploy container or static edge assets.
3. Invalidate CDN cache for `/landing` and public static assets.

### Step 5: Post-Deployment Smoke Verification
Run automated pilot validation against live endpoints:
```bash
node scripts/benchmark_pilot.js
```

---

## 4. Emergency Rollback Playbook

If a critical P0 failure occurs post-deployment (e.g., error rate > 1%, crash loop, severe data inconsistency):

### Phase 1: Immediate Traffic Divert (< 2 Minutes)
1. Revert reverse proxy routing to the previous healthy container version (Blue instance).
2. Confirm health status:
   ```bash
   curl -I http://localhost:5406/api/health
   ```

### Phase 2: Application Code Rollback
1. Pull the previous Git release tag:
   ```bash
   git checkout tags/v1.0.0-pilot -b rollback-branch
   ```
2. Re-deploy previous backend and frontend images.

### Phase 3: Database Rollback (If Migration Failed)
Because all migrations adhere to the additive Expand/Contract model, rolled-back application code will continue to operate safely on the expanded database schema without needing schema rollbacks.

If a corrupted data state occurred during a failed migration:
1. Identify the pre-deployment dump created in Step 1:
   ```bash
   ls -lat /tmp/carhub_backups/
   ```
2. Restore database to the clean snapshot:
   ```bash
   # Extract dump path
   LATEST_DUMP=$(ls -t /tmp/carhub_backups/*.dump | head -n 1)
   
   # Stop write traffic
   # Restore clean database
   docker exec -i carhub-db pg_restore -U carhub -d carhub_os --clean --if-exists "$LATEST_DUMP"
   ```
3. Run verification test:
   ```bash
   bash scripts/verify_backup.sh
   ```

---

## 5. Incident Response & Post-Mortem

1. **Incident Severity Classification:**
   - **SEV-1 (Critical):** Data loss risk, tenant isolation compromise, authentication outage.
   - **SEV-2 (High):** Booking creation failures, payment capture errors, PDF generation crash.
   - **SEV-3 (Moderate):** Minor UI formatting, non-blocking telemetry delay.
2. **Log Collection:** Inspect request correlation IDs in logs:
   ```bash
   grep "[ERROR]" /tmp/carhub_logs/app.log | grep "requestId"
   ```
3. **Blameless Post-Mortem:** Conducted within 48 hours documenting root cause, detection time, recovery time, and permanent architectural preventative measures.
