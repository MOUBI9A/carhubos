#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HOSTNAME_SAFE="$(hostname 2>/dev/null | tr -cs 'A-Za-z0-9._-' '_' || echo host)"
OUTPUT="${BACKUP_DIR}/fider_${HOSTNAME_SAFE}_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"
umask 077

echo "[backup] creating ${OUTPUT}"
pg_dump \
  --dbname="${DATABASE_URL}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="${OUTPUT}"

# Validate that the custom archive can be read before calling it successful.
pg_restore --list "${OUTPUT}" >/dev/null

echo "[backup] verified archive ${OUTPUT}"

if [[ "${RETENTION_DAYS}" =~ ^[0-9]+$ ]] && (( RETENTION_DAYS > 0 )); then
  find "${BACKUP_DIR}" -type f -name 'fider_*.dump' -mtime "+${RETENTION_DAYS}" -print -delete
fi

echo "[backup] complete"
