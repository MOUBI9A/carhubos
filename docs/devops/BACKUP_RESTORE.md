# Fider PostgreSQL Backup & Restore Runbook

This runbook covers the repository-provided backup/restore tooling. It is an operational baseline, not a substitute for managed-database point-in-time recovery or offsite backup policy.

## Objectives

- Keep encrypted/offsite copies outside the primary database host.
- Detect corrupt/unreadable archives immediately after creation.
- Practice restores against an isolated database on a recurring schedule.
- Never test a restore destructively against the live production database.

## Backup command

The repository provides `scripts/db-backup.sh`.

Required environment:

```bash
export DATABASE_URL='postgresql://...'
```

Optional configuration:

```bash
export BACKUP_DIR=/secure/fider-backups
export BACKUP_RETENTION_DAYS=14
```

Run:

```bash
bash scripts/db-backup.sh
```

The script:

1. creates a PostgreSQL custom-format archive with `pg_dump`;
2. uses restrictive file permissions via `umask 077`;
3. verifies the archive is readable with `pg_restore --list`;
4. prunes local archives older than `BACKUP_RETENTION_DAYS`.

A local backup on the database host is not enough. Copy verified archives to encrypted offsite/object storage managed by the deployment platform and enable provider-native retention/versioning where available.

## Scheduling

Use the scheduler native to the production platform (managed Postgres backups, cron, Kubernetes CronJob, systemd timer, or an equivalent managed scheduler). The scheduler should invoke `scripts/db-backup.sh` with secrets injected at runtime; never commit a production `DATABASE_URL`.

Recommended pilot baseline:

- daily logical backup;
- provider-native continuous/PITR backups where available;
- 14 daily logical backups retained;
- at least one monthly restore exercise;
- alert when a scheduled backup exits non-zero or no fresh backup appears within the expected window.

## Restore drill

Use a fresh, isolated recovery database and a trusted custom archive produced by `scripts/db-backup.sh`. A PostgreSQL dump contains executable SQL. The restore role needs access to create the archived objects and clean up existing versions. Objects outside the archive may survive a restore into a reused database.

When provisioning the disposable target, verify the cluster and database in the provider or local cluster inventory. Generate a unique UUID (for example with `uuidgen`) and record it with the recovery database name in the drill record. From the **independently verified provisioning session**, register that ID on the database. Substitute the actual database name and UUID in this SQL.

```sql
ALTER DATABASE fider_recovery_test SET fider.restore_target_id = '<UUID from the recovery record>';
```

Obtain the expected name and UUID from that record. Supply the connection URI separately using the secret manager. The script compares both fields with the live database and its database-level marker inside the same transaction as the restore. Role or session settings cannot supply this marker. Register a fresh ID if provisioning a new target from a cloned cluster.

```bash
export RESTORE_TARGET_DB=fider_recovery_test
export RESTORE_TARGET_ID='<UUID from the recovery record>'
export ALLOW_DB_RESTORE=YES
# DATABASE_URL is injected by the secret manager for this target.
bash scripts/db-restore.sh /secure/fider-backups/fider_host_timestamp.dump
```

The restore commits after successful archive decoding and SQL execution. If the client loses contact during commit, inspect the target before retrying. Error output omits raw SQL and row data. Keep the target isolated from traffic until verification succeeds. Dropping the disposable database when the drill closes also removes its marker.

For a local rehearsal, run `bash scripts/test-db-restore.sh` with PostgreSQL 17 tools and Python 3 on PATH. It creates a temporary socket-only cluster, applies repository migration SQL, restores a synthetic row and verifies the table list. Negative cases cover a wrong database, a forged session marker, a SQL failure, and a truncated archive that still passes the contents check. The test shuts down and removes its private cluster on exit. Hosted PITR and application recovery require a separate rehearsal on the selected service.

After restore:

1. point a non-production Fider backend at the restored database;
2. start the API;
3. verify `/api/ready` returns success;
4. compare critical table counts and relationships;
5. log in with recovery-test credentials;
6. exercise critical workflows (fleet, customer, booking, contract/payment where test data permits);
7. record restore duration and any manual intervention.

Do not call a backup strategy verified until a restore drill has succeeded.

## Recovery targets

Final RPO/RTO depend on the selected production database provider. For the controlled pilot, set explicit targets before go-live and record them here. A reasonable starting target for discussion is:

- RPO: <= 24 hours when only daily logical backups are available; lower when PITR is enabled.
- RTO: <= 4 hours for a small pilot, subject to measured restore drills.

These are operational targets, not measured guarantees, until a production-like recovery exercise is timed.

## Security

- Keep backup storage private and encrypted.
- Restrict restore permissions to production operators.
- Never print credentials in logs.
- Treat backups as sensitive because they contain the same customer/agency data as the primary database.
- Rotate database credentials independently of backup retention; old backups remain sensitive after credential rotation.
