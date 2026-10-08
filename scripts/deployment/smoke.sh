#!/usr/bin/env bash
set -euo pipefail
base=${1:?Usage: smoke.sh https://deployment-host}
[[ "$base" == https://* ]] || { echo 'HTTPS required' >&2; exit 1; }
base=${base%/}
check() {
  local path=$1 expected=$2 actual
  actual=$(curl --silent --show-error --max-time 30 --output /dev/null --write-out '%{http_code}' "$base$path")
  [[ "$actual" == "$expected" ]] || { echo "$path expected $expected got $actual" >&2; return 1; }
}
check /login 200
check /api/health 200
check /api/ready 200
check /api/diagnostics/sessions 401
check /api/cars 401
printf 'Public HTTPS, login, API health and authentication boundary passed.\n'
