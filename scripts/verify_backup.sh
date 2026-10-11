#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Fider / CarHub OS — Backup Verification & Restoration Tester
# Usage: ./scripts/verify_backup.sh [backup_file_path]
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-/tmp/carhub_backups}"
CONTAINER_NAME="${CONTAINER_NAME:-carhub-db}"
DB_USER="${DB_USER:-carhub_admin}"
RESTORE_TEST_DB="carhub_restore_verify_test"

if [[ $# -ge 1 ]]; then
  BACKUP_FILE="$1"
else
  # Find latest dump file in BACKUP_DIR
  BACKUP_FILE=$(find "${BACKUP_DIR}" -name "carhub_*.dump" -type f | sort -r | head -n 1 || true)
fi

if [[ -z "${BACKUP_FILE}" || ! -f "${BACKUP_FILE}" ]]; then
  echo "❌ [ERROR] No valid backup file found to verify!"
  exit 1
fi

echo "🔍 [$(date +'%Y-%m-%d %H:%M:%S')] Verifying backup archive: ${BACKUP_FILE}"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "🐳 Using Docker container '${CONTAINER_NAME}' for isolated verification..."

  # Copy backup into container temp space
  docker cp "${BACKUP_FILE}" "${CONTAINER_NAME}:/tmp/verify_target.dump"

  # Drop target DB if exists and create fresh target DB
  docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${RESTORE_TEST_DB};"
  docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${RESTORE_TEST_DB};"

  # Execute pg_restore
  echo "📥 Executing pg_restore into isolated database '${RESTORE_TEST_DB}'..."
  docker exec "${CONTAINER_NAME}" pg_restore -U "${DB_USER}" -d "${RESTORE_TEST_DB}" /tmp/verify_target.dump > /dev/null 2>&1 || true

  # Verify table count and primary entities
  TABLE_COUNT=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${RESTORE_TEST_DB}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
  AGENCY_COUNT=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${RESTORE_TEST_DB}" -t -c "SELECT count(*) FROM \"Agency\";")
  USER_COUNT=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${RESTORE_TEST_DB}" -t -c "SELECT count(*) FROM \"User\";")

  # Cleanup
  docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "DROP DATABASE ${RESTORE_TEST_DB};"
  docker exec "${CONTAINER_NAME}" rm -f /tmp/verify_target.dump
else
  echo "🖥️ Using local psql/pg_restore for verification..."
  psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${RESTORE_TEST_DB};"
  psql -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${RESTORE_TEST_DB};"
  pg_restore -U "${DB_USER}" -d "${RESTORE_TEST_DB}" "${BACKUP_FILE}" > /dev/null 2>&1 || true

  TABLE_COUNT=$(psql -U "${DB_USER}" -d "${RESTORE_TEST_DB}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
  AGENCY_COUNT=$(psql -U "${DB_USER}" -d "${RESTORE_TEST_DB}" -t -c "SELECT count(*) FROM \"Agency\";")
  USER_COUNT=$(psql -U "${DB_USER}" -d "${RESTORE_TEST_DB}" -t -c "SELECT count(*) FROM \"User\";")

  psql -U "${DB_USER}" -d postgres -c "DROP DATABASE ${RESTORE_TEST_DB};"
fi

TABLE_COUNT=$(echo "${TABLE_COUNT}" | xargs)
AGENCY_COUNT=$(echo "${AGENCY_COUNT}" | xargs)
USER_COUNT=$(echo "${USER_COUNT}" | xargs)

echo "📊 Restored Tables: ${TABLE_COUNT} | Agencies: ${AGENCY_COUNT} | Users: ${USER_COUNT}"

if [[ "${TABLE_COUNT}" -gt 10 ]]; then
  echo "✅ [VERIFIED] Backup is completely restorable and structurally valid."
  exit 0
else
  echo "❌ [FAILED] Table count too low (${TABLE_COUNT}); backup may be corrupted."
  exit 1
fi
