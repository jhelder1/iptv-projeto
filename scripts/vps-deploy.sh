#!/usr/bin/env sh
set -eu

# Deploy script for VPS
# - loads .env.vps
# - deploys containers
# - runs DB migrations if DATABASE_URL is present and psql is available

if [ ! -f ".env.vps" ]; then
  echo "Missing .env.vps. Copy .env.vps.example and fill secrets."
  exit 1
fi

if [ ! -f ".env.n8n" ]; then
  echo "Missing .env.n8n. Copy .env.n8n.example and fill settings."
  exit 1
fi

# export env vars from .env.vps for this script
set -a
. ./.env.vps
set +a

echo "Pulling images..."
docker compose pull

echo "Building clientezero-web..."
docker compose build --no-cache clientezero-web

echo "Bringing up containers..."
docker compose up -d

echo "Waiting for containers..."
docker compose ps

# Run migrations if DATABASE_URL is provided
if [ -n "${DATABASE_URL:-}" ]; then
  if command -v psql >/dev/null 2>&1; then
    echo "Running DB migrations..."
    ./scripts/run-migrations.sh
  else
    echo "psql not found on PATH — skipping automatic migrations. Run scripts/run-migrations.sh manually on the server."
  fi
else
  echo "DATABASE_URL not set — skipping migrations. If using Supabase, run sql/supabase/001_init_schema.sql in the SQL Editor."
fi

echo "Deploy complete. Run ./scripts/vps-smoke-test.sh <url> to validate." 
