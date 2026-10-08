#!/usr/bin/env bash
set -euo pipefail
: "${RESTORE_DATABASE_URL:?Supply a dedicated empty recovery database}"
: "${ALLOW_RESTORE_TEST:?Set ALLOW_RESTORE_TEST=yes after checking recovery destination}"
[[ "$ALLOW_RESTORE_TEST" == yes ]] || exit 1
backup=${1:?Usage: restore-test.sh backup.dump}
(
  cd "$(dirname "$backup")"
  sha256sum --check "$(basename "$backup").sha256"
)
python3 - "$backup" <<'PYDEST'
import json,os,sys
from urllib.parse import urlsplit
source=json.load(open(sys.argv[1]+'.source.json'))
u=urlsplit(os.environ['RESTORE_DATABASE_URL'])
if (source['host'],source['port'],source['database'])==(u.hostname,u.port or 5432,u.path.lstrip('/')):
 raise SystemExit('Refusing restoration into the backup source database')
PYDEST
export PGSSLMODE=verify-full
export PGSSLROOTCERT=${PGSSLROOTCERT:-/etc/ssl/certs/ca-certificates.crt}
count=$(python3 "$(dirname "$0")/libpq-run.py" RESTORE_DATABASE_URL psql -X -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')")
[[ "$count" == 0 ]] || { echo 'Recovery target must be empty' >&2; exit 1; }
python3 "$(dirname "$0")/libpq-run.py" RESTORE_DATABASE_URL pg_restore --exit-on-error --single-transaction --no-owner --no-acl "$backup"
python3 "$(dirname "$0")/libpq-run.py" RESTORE_DATABASE_URL psql -X -v ON_ERROR_STOP=1 -Atc 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL'
