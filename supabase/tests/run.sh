#!/usr/bin/env bash
# Sobe um Postgres descartável, aplica stub + migrations e roda os testes.
# Uso: supabase/tests/run.sh   (requer postgresql-16 instalado)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PGBIN=/usr/lib/postgresql/16/bin
WORK="${TEST_PG_DIR:-/home/claude/.cache/coachin-pgtest-$$}"
mkdir -p "$WORK"
PORT="${TEST_PG_PORT:-54329}"
DB=coachin_test
as_pg() { if [ "$(id -u)" = 0 ]; then runuser -u claude -- "$@"; else "$@"; fi; }
chmod 777 "$WORK"
as_pg $PGBIN/initdb -D "$WORK/data" -A trust -U claude >/dev/null
as_pg $PGBIN/pg_ctl -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null
trap 'as_pg $PGBIN/pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT
PSQL="psql -h $WORK -p $PORT -U claude -v ON_ERROR_STOP=1 -q"
as_pg $PGBIN/createdb -h "$WORK" -p $PORT -U claude $DB
as_pg $PSQL -d $DB -f "$HERE/00_stub_supabase.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo ">> migration $(basename "$f")"
  as_pg $PSQL -d $DB -f "$f"
done
as_pg $PSQL -d $DB -f "$HERE/10_tests.sql"
echo "== TODOS OS TESTES PASSARAM =="
