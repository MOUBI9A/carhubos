#!/usr/bin/env bash
set -euo pipefail

echo "[security-baseline] Starting repository baseline checks"

echo "[security-baseline] Backend production dependency audit"
(cd backend && npm audit --omit=dev --audit-level=high)

echo "[security-baseline] Frontend production dependency audit"
(cd frontend && npm audit --omit=dev --audit-level=high)

echo "[security-baseline] Backend static security checks"
(cd backend && bash ./scripts/security-baseline.sh)

echo "[security-baseline] Checking for committed .env files"
tracked_env_files=$(git ls-files "*.env" "*.env.*" ":!:*.env.example" ":!:*.env.sample" || true)
if [[ -n "$tracked_env_files" ]]; then
  echo "[security-baseline] FAIL: committed environment files detected"
  echo "$tracked_env_files"
  exit 1
fi

echo "[security-baseline] PASS: repository baseline checks completed successfully."
