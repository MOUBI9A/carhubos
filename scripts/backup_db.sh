#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Fider / CarHub OS — Automated Database Backup Script
# Usage: ./scripts/backup_db.sh [backup_dir]
# ==============================================================================

BACKUP_DIR="${1:-${BACKUP_DIR:-/tmp/carhub_backups}}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
CONTAINER_NAME="${CONTAINER_NAME:-carhub-db}"
DB_USER="${DB_USER:-carhub_admin}"
DB_NAME="${DB_NAME:-carhub_os}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/carhub_${DB_NAME}_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "📦 [$(date +'%Y-%m-%d %H:%M:%S')] Starting automated database backup for '${DB_NAME}'..."

# Check if running in Docker environment
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "🐳 Detected running Docker container '${CONTAINER_NAME}'"
  docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" -F c -b > "${BACKUP_FILE}"
else
  echo "🖥️ Using local pg_dump"
  pg_dump -U "${DB_USER}" -d "${DB_NAME}" -F c -b > "${BACKUP_FILE}"
fi

# Verification
if [[ ! -s "${BACKUP_FILE}" ]]; then
  echo "❌ [ERROR] Backup file '${BACKUP_FILE}' is missing or empty!"
  exit 1
fi

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ [SUCCESS] Backup created successfully: ${BACKUP_FILE} (${FILE_SIZE})"

# Retention management: Prune backups older than RETENTION_DAYS
echo "🧹 Pruning backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}..."
find "${BACKUP_DIR}" -name "carhub_${DB_NAME}_*.dump" -type f -mtime +"${RETENTION_DAYS}" -exec rm -f {} + || true

echo "🎯 Backup operation complete."
echo "${BACKUP_FILE}"
