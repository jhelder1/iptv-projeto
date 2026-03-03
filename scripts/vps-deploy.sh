#!/usr/bin/env sh
set -eu

# Deploy script para VPS
# Pré-requisitos: .env.vps e .env.n8n preenchidos

if [ ! -f ".env.vps" ]; then
  echo "ERRO: .env.vps nao encontrado. Copie .env.vps.example e preencha os valores."
  exit 1
fi

if [ ! -f ".env.n8n" ]; then
  echo "ERRO: .env.n8n nao encontrado. Copie .env.n8n.example e preencha os valores."
  exit 1
fi

# Exporta vars do .env.vps para este script (necessario para POSTGRES_PASSWORD no compose)
set -a
. ./.env.vps
set +a

echo "==> Atualizando imagens..."
docker compose pull

echo "==> Build do clientezero-web..."
docker compose build --no-cache clientezero-web

echo "==> Subindo containers..."
docker compose up -d

echo "==> Aguardando postgres ficar saudavel..."
docker compose wait postgres 2>/dev/null || true

echo "==> Status dos containers:"
docker compose ps

echo ""
echo "Deploy concluido!"
echo "Validar: ./scripts/vps-smoke-test.sh https://\${DOMAIN}"
