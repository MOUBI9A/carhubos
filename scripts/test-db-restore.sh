#!/usr/bin/env bash
set -euo pipefail

# Isolate all libpq environment defaults and avoid inherited production URLs.
if [[ "${1:-}" != --clean-environment ]]; then
  exec env -i PATH="$PATH" HOME="$HOME" LC_ALL=C bash "$0" --clean-environment
fi
scripts="$(cd "$(dirname "$0")" && pwd)"
for tool in initdb pg_ctl postgres pg_dump pg_restore psql; do
  [[ "$("$tool" --version)" =~ PostgreSQL\)\ 17\. ]] || { echo "PostgreSQL 17 required: $tool" >&2; exit 2; }
done
cluster="$(mktemp -d /tmp/fider-restore.XXXXXXXX)"
export HOME="$cluster" PGHOST="$cluster" PGPORT=55432 PGUSER=drill
cleanup() {
  if [[ -f "$cluster/data/postmaster.pid" ]]; then
    pg_ctl -D "$cluster/data" -m immediate -w stop >/dev/null || return 1
  fi
  rm -rf -- "$cluster"
}
trap cleanup EXIT
initdb -D "$cluster/data" --no-locale -E UTF8 -U drill >/dev/null 2>&1
pg_ctl -D "$cluster/data" -o "-k $cluster -p $PGPORT -c listen_addresses=''" -l "$cluster/server.log" -w start >/dev/null
for db in fider_source fider_recovery_test fider_wrong; do createdb "$db"; done
query() { psql -XAtq -v ON_ERROR_STOP=1 -d "$1" -c "$2"; }
for migration in "$scripts"/../backend/prisma/migrations/*/migration.sql; do
  psql -Xq -v ON_ERROR_STOP=1 -d fider_source -f "$migration" >/dev/null
done
query fider_source "CREATE TABLE restore_probe(id int primary key, state text); INSERT INTO restore_probe VALUES (1,'backup')"
DATABASE_URL="postgresql:///fider_source" BACKUP_DIR="$cluster/backup" bash "$scripts/db-backup.sh" >/dev/null
archive=("$cluster"/backup/*.dump)
export DATABASE_URL="postgresql:///fider_recovery_test" ALLOW_DB_RESTORE=YES
export RESTORE_TARGET_DB=fider_recovery_test RESTORE_TARGET_ID=bc898b86-b78e-4daf-bdbd-05c2755e07dc
query fider_recovery_test "ALTER DATABASE fider_recovery_test SET fider.restore_target_id = '$RESTORE_TARGET_ID'"
restore() { bash "$scripts/db-restore.sh" "${archive[0]}"; }
deny() { if "$@" >"$cluster/failure.log" 2>&1; then echo "Expected restore rejection" >&2; exit 1; fi; }
query fider_wrong "CREATE TABLE restore_probe(id int, state text); INSERT INTO restore_probe VALUES (1,'untouched')"
ALLOW_DB_RESTORE=NO deny restore
DATABASE_URL=postgresql:///fider_wrong deny restore
# Supplying the wrong DB name and a forged session setting must still fail.
DATABASE_URL=postgresql:///fider_wrong RESTORE_TARGET_DB=fider_wrong PGOPTIONS="-c fider.restore_target_id=$RESTORE_TARGET_ID" deny restore
[[ "$(query fider_wrong 'SELECT state FROM restore_probe')" = untouched ]]
start="$(python3 -c 'import time; print(time.monotonic())')"
restore
[[ "$(query fider_recovery_test 'SELECT state FROM restore_probe')" = backup ]]
tables="SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1"
[[ "$(query fider_source "$tables")" = "$(query fider_recovery_test "$tables")" ]]
python3 -c 'import sys,time; print(f"Synthetic restore and catalog/data verification: {time.monotonic()-float(sys.argv[1]):.2f}s")' "$start"
query fider_recovery_test "UPDATE restore_probe SET state='before_failure'"
# A dependency owned by the recovery target raises an error during cleanup.
# Earlier archive objects have already been processed when the DROP fails.
query fider_recovery_test 'CREATE VIEW drill_dependency AS SELECT id FROM "Agency"'
deny restore
[[ "$(query fider_recovery_test 'SELECT state FROM restore_probe')" = before_failure ]]
[[ "$(query fider_recovery_test 'SELECT count(*) FROM drill_dependency')" = 0 ]]
query fider_recovery_test 'DROP VIEW drill_dependency'
# The archive table of contents survives truncation; late decompression must
# fail and disconnect before COMMIT, preserving the pre-existing target.
python3 - "${archive[0]}" "$cluster/truncated.dump" <<'PYARCHIVE'
from pathlib import Path
import sys
data = Path(sys.argv[1]).read_bytes()
Path(sys.argv[2]).write_bytes(data[:-128])
PYARCHIVE
pg_restore --list "$cluster/truncated.dump" >/dev/null
deny bash "$scripts/db-restore.sh" "$cluster/truncated.dump"
[[ "$(query fider_recovery_test 'SELECT state FROM restore_probe')" = before_failure ]]
restore
[[ "$(query fider_recovery_test 'SELECT state FROM restore_probe')" = backup ]]
echo "PASS: registered restore, wrong target, session spoof, SQL-error rollback, truncated-stream rollback, clean retry."
