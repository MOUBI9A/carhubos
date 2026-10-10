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

The repository provides `scripts/db-restore.sh`. It intentionally refuses to run unless the operator opts into a destructive restore.

Create an isolated target database, then:

```bash
export DATABASE_URL='postgresql://.../fider_recovery_test'
export ALLOW_DB_RESTORE=YES
bash scripts/db-restore.sh /secure/fider-backups/fider_host_timestamp.dump
```

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
