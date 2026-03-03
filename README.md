# iptv-projeto

## MVP Next.js + Supabase (implementado)

### 1) Requisitos
- Node 20+
- Projeto Supabase criado
- Credenciais Mercado Pago e Evolution API

### 2) Configuração
1. Copie `env.example` para `.env.local`.
2. Preencha `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN`, `EVOLUTION_*` e `ADMIN_WHATSAPP`.
3. Rode o SQL `sql/supabase/001_init_schema.sql` no Supabase SQL Editor.

### 3) Rodar local
`ash
npm install
npm run dev
`$insert

### 4) Endpoints
- `GET /api/health`
- `POST /api/mp/webhook` (header opcional: `x-webhook-secret`)
- `GET /admin/logs`

### 5) Payload esperado no webhook
```json
{
  "action": "payment.updated",
  "type": "payment",
  "data": { "id": "123456789" }
}
```

### 6) Fluxo implementado
1. Recebe webhook do Mercado Pago.
2. Consulta pagamento em `GET /v1/payments/{id}`.
3. Valida `status=approved` e lê `external_reference` como `id_user`.
4. Atualiza uma `fatura` pendente (`situ=0` -> `situ=1`).
5. Busca `acesso.dados` e `app_user` para montar mensagem.
6. Sanitiza HTML para texto.
7. Envia WhatsApp para cliente via Evolution.
8. Insere log em `automation_log`.
9. Em erro, envia alerta para `ADMIN_WHATSAPP` e registra log de erro.

---
## PRD original

# âš¡ ClienteZero â€” Product Requirements Document
**MVP v1.0 | MarÃ§o 2026 | CONFIDENCIAL**

> AutomaÃ§Ã£o de Pagamentos IPTV & ISP via N8N + WhatsApp

| Campo | Valor |
|---|---|
| Produto | ClienteZero MVP |
| VersÃ£o | 1.0 |
| Stack Alvo | N8N + MySQL + Evolution API + Mercado Pago |
| Prazo MVP | 3 dias Ãºteis apÃ³s setup |

---

## 1. VisÃ£o Geral

### 1.1 Problema
Operadores de IPTV/ISP gerenciam pagamentos 100% manual. Com 74+ inadimplentes no ISP e ativaÃ§Ãµes IPTV aguardando, o custo operacional Ã© crÃ­tico.

### 1.2 SoluÃ§Ã£o
AutomaÃ§Ã£o: **Mercado Pago â†’ MySQL IPTV â†’ WhatsApp**. Pagamento aprovado = acesso enviado em < 30s.

### 1.3 MÃ©tricas de Sucesso

| MÃ©trica | Baseline | Meta |
|---|---|---|
| Tempo pagamento â†’ ativaÃ§Ã£o | > 24h | < 30s |
| Horas manuais/semana | ~5h | 0h |
| Taxa de erro | ~15% | < 1% |

---

## 2. Escopo MVP

**âœ… IN SCOPE**
- Webhook `payment.approved` Mercado Pago
- `UPDATE fatura SET situ=1` no MySQL IPTV
- `SELECT` dados de acesso (tabela `acesso`)
- Envio WhatsApp via Evolution API
- Log em `automation_log`
- Alerta admin em caso de erro

**âŒ OUT OF SCOPE**
- Dashboard web, portal cliente, GestorV3 (ISP), multi-tenant, boletos/PIX

---

## 3. Arquitetura

### Fluxo Principal
```
MP (payment.approved) â†’ N8N Webhook
â†’ Validar status
â†’ GET /v1/payments/{id} (MP API)
â†’ Extrair id_user do external_reference
â†’ MySQL: UPDATE fatura SET situ=1 WHERE id_user=X AND situ=0
â†’ MySQL: SELECT dados, nome, tel FROM acesso JOIN user WHERE id_user=X
â†’ Code Node: strip HTML â†’ texto limpo
â†’ Evolution API: POST /message/sendText
â†’ MySQL: INSERT automation_log
```

### Stack
| Componente | Tecnologia |
|---|---|
| Orquestrador | N8N self-hosted |
| Banco | MySQL (MariaDB 10.x) â€” banco `gigante` |
| Pagamento | Mercado Pago IPN Webhooks |
| WhatsApp | Evolution API v2 |

### Schema Relevante

**`fatura`**: `id`, `id_user`, **`situ` (0=pendente/1=pago â† alvo)**, `valor`, `forma`, `vencimento`

**`acesso`**: `id`, `id_user`, `dados` (TEXT HTML com credenciais)

**`user`**: `id`, `nome`, **`tel`** (WhatsApp), `email`

---

## 4. User Stories

### US-01 â€” AtivaÃ§Ã£o AutomÃ¡tica
- **Como** cliente que pagou via MP
- **Quero** receber dados de acesso no WhatsApp imediatamente
- **CritÃ©rios:** webhook em < 5s Â· fatura atualizada em < 10s Â· WhatsApp em < 30s Â· mensagem com nome + links + user/senha

### US-02 â€” Alerta de Falha
- **Como** operador
- **Quero** WhatsApp quando ativaÃ§Ã£o falhar
- **CritÃ©rios:** erro no N8N â†’ WhatsApp admin com id_user + erro + timestamp

### US-03 â€” Log de Auditoria
- **Como** operador
- **Quero** registro de cada execuÃ§Ã£o
- **CritÃ©rios:** `automation_log` com status, erro, timestamp para cada run

---

## 5. Workflow N8N â€” 10 Nodes

| # | Node | Tipo | Config |
|---|---|---|---|
| 1 | MP Webhook | Webhook POST | `/mp-payment` com auth token |
| 2 | Validar Approved | IF | `body.action=='payment' AND status=='approved'` |
| 3 | Buscar MP | HTTP Request | `GET /v1/payments/{{id}}` + Bearer token |
| 4 | Extrair id_user | Set Node | `external_reference â†’ id_user` |
| 5 | UPDATE Fatura | MySQL | `UPDATE fatura SET situ=1 WHERE id_user={{id_user}} AND situ=0` |
| 6 | SELECT Acesso | MySQL | `SELECT a.dados, u.nome, u.tel FROM acesso a JOIN user u ON a.id_user=u.id WHERE a.id_user={{id_user}}` |
| 7 | Sanitizar HTML | Code (JS) | Strip tags â†’ texto limpo |
| 8 | Enviar WhatsApp | HTTP Request | `POST Evolution /message/sendText` |
| 9 | Log Sucesso | MySQL | `INSERT automation_log` |
| 10 | Error Handler | Error Trigger | WhatsApp admin + log erro |

### Code Node â€” Sanitizar HTML
```javascript
const dadosHtml = $input.first().json.dados;
const dadosLimpos = dadosHtml
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n')
  .replace(/<\/tr>/gi, '\n')
  .replace(/<\/td>/gi, ' | ')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();
return [{ json: { ...$input.first().json, dados_limpos: dadosLimpos } }];
```

### Mensagem WhatsApp
```
ðŸŽ‰ OlÃ¡, {{nome}}! Pagamento confirmado!

Seus dados de acesso:
{{dados_limpos}}

âš ï¸ Guarde essas informaÃ§Ãµes.
â€” Cine Play TV
```

---

## 6. Infraestrutura

### SQL â€” Criar Tabela de Log
```sql
CREATE TABLE automation_log (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  id_user          INT NOT NULL,
  id_fatura        INT,
  mp_payment_id    VARCHAR(100),
  status           ENUM('success','error') NOT NULL,
  erro             TEXT,
  whatsapp_enviado TINYINT(1) DEFAULT 0,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### VariÃ¡veis de Ambiente N8N
```env
MP_ACCESS_TOKEN=APP_USR-xxx
IPTV_DB_HOST=localhost
IPTV_DB_NAME=gigante
IPTV_DB_USER=usuario
IPTV_DB_PASS=senha
EVOLUTION_API_URL=https://evolution.seudominio.com
EVOLUTION_API_KEY=chave
EVOLUTION_INSTANCE=instancia
ADMIN_WHATSAPP=5535999999999
```

---

## 7. Plano 3 Dias

### Dia 1 â€” Setup
- [ ] Criar tabela `automation_log` no MySQL
- [ ] Configurar credenciais MySQL e Evolution API no N8N
- [ ] Registrar webhook no painel MP
- [ ] Configurar `external_reference={{id_user}}` nos planos MP
- [ ] Testar webhook em sandbox

### Dia 2 â€” Workflow
- [ ] Construir nodes 1â€“7
- [ ] Testar UPDATE + SELECT no banco real
- [ ] Implementar node WhatsApp
- [ ] Implementar Error Handler e log

### Dia 3 â€” Go-Live
- [ ] Teste E2E com 1 pagamento real
- [ ] Verificar log, WhatsApp e `fatura.situ`
- [ ] Ativar produÃ§Ã£o
- [ ] Monitorar 3 ativaÃ§Ãµes reais
- [ ] Documentar no Notion

---

## 8. Definition of Done

- [ ] Webhook processa `payment.approved` sem erro
- [ ] `fatura.situ=1` em < 15s do webhook
- [ ] Dados `acesso` lidos corretamente
- [ ] HTML sanitizado â€” sem tags no WhatsApp
- [ ] Cliente recebe WhatsApp em < 30s
- [ ] Admin recebe alerta em caso de erro
- [ ] Log gravado em `automation_log`
- [ ] 3 pagamentos reais consecutivos sem falha
- [ ] Credenciais em variÃ¡veis N8N (nÃ£o hard-coded)
- [ ] DocumentaÃ§Ã£o no Notion

---

## 9. Riscos

| Risco | Prob. | MitigaÃ§Ã£o |
|---|---|---|
| MySQL inacessÃ­vel remotamente | **Alta** | SSH tunnel ou liberar porta 3306 com IP fixo |
| `external_reference` ausente nos planos | **Alta** | Recriar preferÃªncias MP antes do go-live |
| Evolution API desconectada | MÃ©dia | Health-check diÃ¡rio automatizado |
| HTML mal formatado no `acesso.dados` | MÃ©dia | SanitizaÃ§Ã£o robusta + teste com dados reais |
| Webhook MP com duplicatas | Baixa | Checar `situ` antes de atualizar (idempotÃªncia) |

---
*ClienteZero PRD v1.0 â€” Para agente de programaÃ§Ã£o IA â€” MarÃ§o 2026*
