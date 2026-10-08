#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${DATABASE_URL:?Supply DATABASE_URL securely}"
target=${1:?Usage: backup.sh /secure/path/backup.dump}
[[ ! -e "$target" && ! -e "${target}.sha256" && ! -e "${target}.source.json" ]] || { echo 'Refusing overwrite' >&2; exit 1; }
command -v pg_dump >/dev/null
command -v pg_restore >/dev/null
# libpq credentials live only in the child process environment.
export PGSSLMODE=verify-full
export PGSSLROOTCERT=${PGSSLROOTCERT:-/etc/ssl/certs/ca-certificates.crt}
tmp=$(mktemp "${target}.partial.XXXXXX")
trap 'rm -f "$tmp"' EXIT
python3 "$(dirname "$0")/libpq-run.py" DATABASE_URL pg_dump --format=custom --no-owner --no-acl --file="$tmp"
pg_restore --list "$tmp" >/dev/null
mv "$tmp" "$target"
(
  cd "$(dirname "$target")"
  sha256sum -- "$(basename "$target")" > "$(basename "$target").sha256"
)
python3 - "$target" <<'PYMETA'
import json,os,sys
from urllib.parse import urlsplit
u=urlsplit(os.environ['DATABASE_URL'])
with open(sys.argv[1]+'.source.json','x') as f:
 json.dump({'host':u.hostname,'port':u.port or 5432,'database':u.path.lstrip('/')},f)
PYMETA
