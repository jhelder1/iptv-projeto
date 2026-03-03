#!/usr/bin/env sh
set -eu

if [ $# -lt 1 ]; then
  echo "Usage: ./scripts/vps-smoke-test.sh https://seu-dominio.com"
  exit 1
fi

BASE_URL="$1"

echo "Checking health endpoint..."
curl -fsS "${BASE_URL}/api/health"
echo
echo "Health endpoint OK"

echo "Checking logs page..."
curl -fsSI "${BASE_URL}/admin/logs" | head -n 1
echo "Logs page reachable"
