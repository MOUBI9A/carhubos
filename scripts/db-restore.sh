#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set to the restore target}"

BACKUP_FILE="${1:-}"
if [[ -z "${BACKUP_FILE}" || ! -f "${BACKUP_FILE}" ]]; then
  echo "Usage: DATABASE_URL=... ALLOW_DB_RESTORE=YES $0 /path/to/backup.dump" >&2
  exit 2
fi

if [[ "${ALLOW_DB_RESTORE:-}" != "YES" ]]; then
  echo "Refusing destructive restore. Set ALLOW_DB_RESTORE=YES after verifying DATABASE_URL points to an isolated recovery target." >&2
  exit 3
fi

pg_restore --list "${BACKUP_FILE}" >/dev/null

echo "[restore] restoring ${BACKUP_FILE} into configured target"
pg_restore \
  --dbname="${DATABASE_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "${BACKUP_FILE}"

echo "[restore] restore completed; run application smoke tests before promoting this database"
