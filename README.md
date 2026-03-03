# ClienteZero — Gestão de Pagamentos IPTV/ISP

Sistema completo de automação: Mercado Pago → PostgreSQL → WhatsApp em < 30s.
Inclui painel admin, baixa automática de inadimplentes, retry de WhatsApp e chargeback.

---

## Stack

| Componente | Tecnologia |
|---|---|
| Backend / Webhook | Next.js 16 (App Router) |
| Banco de dados | PostgreSQL 16 (Docker) |
| Automação visual | N8N self-hosted (Docker) |
| WhatsApp | Evolution API v2 (Docker) |
| Pagamento | Mercado Pago Webhooks |
| Proxy / HTTPS | Caddy (automático) |

---

## Fluxos implementados

### 1. Pagamento aprovado
```
MP (payment.approved) → POST /api/mp/webhook
  → Valida secret + status
  → UPDATE fatura situ=0→1 + reativa acesso
  → WhatsApp cliente com credenciais IPTV
  → [WhatsApp falhou] → job_queue para retry automático
  → INSERT automation_log
```

### 2. Chargeback / Estorno
```
MP (payment.cancelled | refunded | charged_back) → POST /api/mp/webhook
  → UPDATE fatura situ=1→2 (cancelada)
  → UPDATE acesso ativo=false (suspenso)
  → WhatsApp cliente: acesso suspenso
  → INSERT automation_log
```

### 3. Retry de WhatsApp (N8N a cada 5min)
```
POST /api/cron/process-jobs
  → Busca job_queue com status=pending
  → Tenta reenviar WhatsApp
  → Backoff exponencial: 5min → 15min → 30min → failed
```

### 4. Geração de faturas mensais (N8N todo dia 00:00)
```
POST /api/cron/gerar-faturas
  → Clientes ativos com plano e vencimento ≤ 3 dias
  → Cria fatura com valor do plano
  → WhatsApp aviso de vencimento
```

### 5. Cobranças de inadimplentes (N8N todo dia 08:00)
```
POST /api/cron/cobrar-inadimplentes
  → 3–6 dias vencido → WhatsApp de aviso
  → 7+ dias vencido → suspende acesso + WhatsApp de suspensão
```

---

## Painel Admin

Acesse `https://seu-dominio.com/admin` e faça login com o `ADMIN_TOKEN`.

| Rota | Descrição |
|---|---|
| `/admin/dashboard` | Métricas: ativos, inadimplentes, receita do mês, suspensos |
| `/admin/clientes` | Lista, busca e paginação de clientes |
| `/admin/clientes/novo` | Criar cliente com plano e dados de acesso IPTV |
| `/admin/clientes/[id]` | Detalhes, faturas, reenviar WA, suspender/reativar |
| `/admin/faturas` | Lista com filtros por status |
| `/admin/logs` | Últimas 50 execuções com botão Reenviar WA |

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Health check público |
| POST | `/api/mp/webhook` | Webhook Mercado Pago |
| POST | `/api/admin/auth` | Login (retorna cookie) |
| DELETE | `/api/admin/auth` | Logout |
| GET/POST | `/api/admin/clientes` | CRUD clientes |
| GET/PUT/DELETE | `/api/admin/clientes/[id]` | Detalhe / editar / desativar |
| GET/POST | `/api/admin/faturas` | CRUD faturas |
| PUT/DELETE | `/api/admin/faturas/[id]` | Pagar / cancelar / excluir |
| GET/POST | `/api/admin/planos` | CRUD planos |
| POST | `/api/admin/resend/[id_user]` | Reenviar credenciais via WA |
| POST | `/api/cron/process-jobs` | Processar retry jobs |
| POST | `/api/cron/gerar-faturas` | Gerar faturas mensais |
| POST | `/api/cron/cobrar-inadimplentes` | Cobrar / suspender inadimplentes |

**Cron endpoints** requerem header: `x-cron-secret: <CRON_SECRET>`

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | `postgres://user:pass@host:5432/db` |
| `POSTGRES_PASSWORD` | Sim (VPS) | Senha do container PostgreSQL |
| `MP_ACCESS_TOKEN` | Sim | Token Mercado Pago |
| `WEBHOOK_SECRET` | Não | Valida header `x-webhook-secret` |
| `EVOLUTION_API_URL` | Sim | `http://evolution-api:8080` (interno Docker) |
| `EVOLUTION_API_KEY` | Sim | Chave de autenticação da Evolution API |
| `EVOLUTION_INSTANCE` | Sim | Nome da instância WhatsApp |
| `ADMIN_WHATSAPP` | Sim | Número admin para alertas de erro |
| `ADMIN_TOKEN` | Sim | Senha do painel admin (mín. 16 chars) |
| `CRON_SECRET` | Sim | Autenticação dos endpoints cron (mín. 16 chars) |
| `DOMAIN` | Sim (VPS) | Domínio principal (ex: `meusite.com`) |
| `NEXT_PUBLIC_APP_URL` | Não | URL pública da aplicação |

---

## Schema do banco

```sql
-- v1 (001_init_schema.sql)
app_user      (id, nome, tel, email)
fatura        (id, id_user, situ[0=pendente/1=pago/2=cancelada], valor, forma, vencimento, data_pagamento, mp_payment_id)
acesso        (id, id_user, dados TEXT, ativo)
automation_log(id, id_user, id_fatura, mp_payment_id, status, erro, whatsapp_enviado, created_at)

-- v2 (002_expand_schema.sql)
plano         (id, nome, valor, dias_vigencia, ativo)
job_queue     (id, tipo, payload JSONB, tentativas, max_tentativas, status, proximo_em, erro)
-- + colunas: app_user.{plano_id, ativo, data_vencimento}, acesso.ativo
```

---

## Rodar local

```bash
# 1. Configurar variáveis
cp env.example .env.local
nano .env.local

# 2. PostgreSQL local via Docker
docker run -d --name cz-db \
  -e POSTGRES_DB=clientezero \
  -e POSTGRES_USER=clientezero \
  -e POSTGRES_PASSWORD=local123 \
  -p 5432:5432 postgres:16-alpine

# 3. Aplicar schemas
docker exec -i cz-db psql -U clientezero clientezero < sql/supabase/001_init_schema.sql
docker exec -i cz-db psql -U clientezero clientezero < sql/002_expand_schema.sql

# 4. Instalar e rodar
npm install && npm run dev
```

---

## Deploy na VPS

```bash
# 1. Configurar arquivos de ambiente
cp .env.vps.example .env.vps && nano .env.vps
cp .env.n8n.example .env.n8n && nano .env.n8n

# 2. Deploy (sobe PostgreSQL + Next.js + N8N + Evolution API + Caddy)
chmod +x scripts/*.sh
./scripts/vps-deploy.sh

# 3. Aplicar schema v2 (primeira vez apenas)
docker exec -i clientezero-db psql -U clientezero clientezero \
  < sql/002_expand_schema.sql

# 4. Validar
./scripts/vps-smoke-test.sh https://seudominio.com
```

### Após o deploy

1. **Parear WhatsApp**: Acesse `https://evolution.seudominio.com` → criar instância → escanear QR code
2. **Configurar N8N** em `https://n8n.seudominio.com`:
   - Schedule a cada 5min → `POST https://seudominio.com/api/cron/process-jobs`
   - Schedule todo dia 00:00 → `POST https://seudominio.com/api/cron/gerar-faturas`
   - Schedule todo dia 08:00 → `POST https://seudominio.com/api/cron/cobrar-inadimplentes`
   - Todos com header `x-cron-secret: <CRON_SECRET>`
3. **Registrar webhook no MP**: `https://seudominio.com/api/mp/webhook` com header `x-webhook-secret`
4. **Acessar painel**: `https://seudominio.com/admin` com o `ADMIN_TOKEN`
5. **Criar primeiro plano** em `/admin` → usar API `POST /api/admin/planos`
6. **Cadastrar clientes** em `/admin/clientes/novo`

---

## Estrutura do projeto

```
app/
  admin/
    layout.tsx              # Nav lateral (Client Component)
    login/page.tsx          # Login com ADMIN_TOKEN
    dashboard/page.tsx      # Métricas e últimos logs
    clientes/               # CRUD clientes
    faturas/page.tsx        # Lista de faturas
    logs/page.tsx           # Logs + botão Reenviar WA
  api/
    health/route.ts
    mp/webhook/route.ts     # MP: aprovado + chargeback
    admin/                  # CRUD API (clientes, faturas, planos, resend, auth)
    cron/                   # process-jobs, gerar-faturas, cobrar-inadimplentes
lib/
  db.ts                     # Conexão PostgreSQL (pool)
  env.ts                    # Validação de variáveis (Zod)
  job-queue.ts              # Fila de retry
  automation-log.ts
  mercado-pago.ts
  evolution.ts
  sanitize.ts
middleware.ts               # Proteção /admin/* via cookie
sql/
  supabase/001_init_schema.sql
  002_expand_schema.sql     # v2: plano, job_queue, colunas novas
  seed.sql
scripts/
  vps-deploy.sh
  vps-smoke-test.sh
  run-migrations.sh
```

---

## Troubleshooting

```bash
# Logs dos containers
docker compose logs -f clientezero-web
docker compose logs -f evolution-api
docker compose logs -f n8n

# Testar banco
docker exec -it clientezero-db psql -U clientezero clientezero

# Ver jobs pendentes de retry
docker exec -it clientezero-db psql -U clientezero clientezero \
  -c "SELECT id, tipo, tentativas, status, proximo_em FROM job_queue WHERE status != 'done';"

# Restart serviço
docker compose restart clientezero-web

# Checar Evolution API
curl http://localhost:8080  # direto no servidor
```
