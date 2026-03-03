#!/usr/bin/env sh
set -eu

# Run canonical schema and postgres migrations against DATABASE_URL.
# Usage: ensure DATABASE_URL is exported or present in .env.vps, then run this script.

if [ -f ./.env.vps ]; then
  set -a
  . ./.env.vps
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Please set it (postgres://user:pass@host:5432/db)" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is not installed or not on PATH. Install psql to run migrations." >&2
  exit 1
fi

echo "Applying canonical schema: sql/supabase/001_init_schema.sql"
psql "$DATABASE_URL" -f sql/supabase/001_init_schema.sql

echo "Applying postgres migrations from migrations/*postgres.sql (if any)"
for f in migrations/*postgres.sql; do
  [ -e "$f" ] || continue
  echo "Applying $f"
  psql "$DATABASE_URL" -f "$f"
done

echo "Applying seed (if present): sql/seed.sql"
if [ -f sql/seed.sql ]; then
  psql "$DATABASE_URL" -f sql/seed.sql
fi

echo "Migrations complete."
