# Deploy VPS + Supabase Cloud

Este guia implementa a arquitetura:
- VPS com Docker Compose (`clientezero-web`, `n8n`, `caddy`)
- Supabase Cloud (Free)
- Mercado Pago webhook em `/api/mp/webhook`

## 1) Pré-requisitos

- VPS Linux com Docker + Docker Compose plugin.
- Domínio apontando para IP da VPS.
- Portas `80` e `443` liberadas no firewall.
- Projeto Supabase criado.

## 2) Banco no Supabase

1. Abra o SQL Editor do Supabase.
2. Execute `sql/supabase/001_init_schema.sql`.
3. Crie dados de teste:
   - 1 linha em `app_user`
   - 1 linha em `acesso`
   - 1 linha em `fatura` com `situ=0`

## 3) Variáveis de ambiente

No diretório do projeto na VPS:

```bash
cp .env.vps.example .env.vps
cp .env.n8n.example .env.n8n
```

Preencha `.env.vps` com:
- `DOMAIN`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MP_ACCESS_TOKEN`
- `WEBHOOK_SECRET`
- `EVOLUTION_API_*`
- `ADMIN_WHATSAPP`

## 4) Subir serviços

```bash
chmod +x scripts/vps-deploy.sh scripts/vps-smoke-test.sh
./scripts/vps-deploy.sh
```

Validar:

```bash
docker compose ps
./scripts/vps-smoke-test.sh https://SEU_DOMINIO
```

## 5) Configuração Mercado Pago

1. URL do webhook: `https://SEU_DOMINIO/api/mp/webhook`
2. Enviar header `x-webhook-secret` com valor de `WEBHOOK_SECRET`.
3. Garantir `external_reference={{id_user}}`.

## 6) Operação e troubleshooting

- Logs do app:
  ```bash
  docker logs -f clientezero-web
  ```
- Logs do proxy:
  ```bash
  docker logs -f clientezero-proxy
  ```
- Logs do n8n:
  ```bash
  docker logs -f n8n
  ```
- Últimos logs de automação:
  - `https://SEU_DOMINIO/admin/logs`

## 7) Checklist de go-live

- `GET /api/health` em `200`.
- `payment.approved` atualiza `fatura.situ` para `1`.
- WhatsApp entregue ao cliente.
- `automation_log` com `status=success`.
- Reenvio de webhook não duplica ativação.
