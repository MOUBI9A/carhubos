#!/usr/bin/env bash
set -euo pipefail

# Register a freshly provisioned, isolated recovery DB during provisioning:
# ALTER DATABASE fider_recovery_test SET fider.restore_target_id = '<fresh UUID>';
# Keep its name and UUID with the operator's recovery record. The restore user
# reads the durable database setting; connection/session overrides cannot satisfy it.
: "${DATABASE_URL:?DATABASE_URL must point to an isolated recovery database}"
archive="${1:-}"
if [[ $# -ne 1 || ! -f "$archive" ]]; then
  echo "Usage: bash scripts/db-restore.sh /path/to/trusted-custom.dump" >&2
  exit 2
fi
if [[ "${ALLOW_DB_RESTORE:-}" != YES || -z "${RESTORE_TARGET_DB:-}" ||
      ! "${RESTORE_TARGET_ID:-}" =~ ^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$ ]]; then
  echo "Set ALLOW_DB_RESTORE=YES, RESTORE_TARGET_DB and the independently registered RESTORE_TARGET_ID." >&2
  exit 3
fi
pg_restore --format=custom --list -- "$archive" >/dev/null

# Send the guard and trusted archive through one database session. Only emit
# COMMIT after pg_restore has decoded the entire archive. A client disconnect
# or a SQL error rolls back both object cleanup and the subsequent data load.
if ! {
  cat <<'SQL'
BEGIN;
SELECT current_database() = :'expected_db' AND EXISTS (
  SELECT 1 FROM pg_catalog.pg_db_role_setting AS s
  JOIN pg_catalog.pg_database AS d ON d.oid = s.setdatabase
  WHERE d.datname = current_database() AND s.setrole = 0
    AND ('fider.restore_target_id=' || :'expected_id') = ANY (s.setconfig)
) AS target_matches \gset
\if :target_matches
\else
\warn Restore target name or registered UUID did not match.
DO $$ BEGIN RAISE EXCEPTION 'Unregistered restore target'; END $$;
\endif
SQL
  pg_restore --format=custom --file=- --clean --if-exists --no-owner --no-privileges -- "$archive" || exit 1
  printf '\nCOMMIT;\n'
} | psql --dbname="$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -v VERBOSITY=sqlstate \
      -v expected_db="$RESTORE_TARGET_DB" -v expected_id="$RESTORE_TARGET_ID" \
      --file=- >/dev/null 2> >(awk '
        /^Restore target name or registered UUID did not match[.]$/ { print > "/dev/stderr" }
        /ERROR:  [A-Z0-9]{5}$/ { print "[restore] PostgreSQL SQLSTATE " $NF > "/dev/stderr" }
        /^psql: error: connection/ { print "[restore] database connection failed" > "/dev/stderr" }
      '); then
  # SQL errors can quote private COPY rows. Keep them out of routine logs.
  echo "[restore] failed. Check registered target identity, archive integrity, permissions and lock availability." >&2
  exit 1
fi
echo "[restore] transaction committed. Verify schema and application smoke checks before promotion."
