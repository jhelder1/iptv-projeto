# iptv-projeto

# ⚡ ClienteZero — Product Requirements Document
**MVP v1.0 | Março 2026 | CONFIDENCIAL**

> Automação de Pagamentos IPTV & ISP via N8N + WhatsApp

| Campo | Valor |
|---|---|
| Produto | ClienteZero MVP |
| Versão | 1.0 |
| Stack Alvo | N8N + MySQL + Evolution API + Mercado Pago |
| Prazo MVP | 3 dias úteis após setup |

---

## 1. Visão Geral

### 1.1 Problema
Operadores de IPTV/ISP gerenciam pagamentos 100% manual. Com 74+ inadimplentes no ISP e ativações IPTV aguardando, o custo operacional é crítico.

### 1.2 Solução
Automação: **Mercado Pago → MySQL IPTV → WhatsApp**. Pagamento aprovado = acesso enviado em < 30s.

### 1.3 Métricas de Sucesso

| Métrica | Baseline | Meta |
|---|---|---|
| Tempo pagamento → ativação | > 24h | < 30s |
| Horas manuais/semana | ~5h | 0h |
| Taxa de erro | ~15% | < 1% |

---

## 2. Escopo MVP

**✅ IN SCOPE**
- Webhook `payment.approved` Mercado Pago
- `UPDATE fatura SET situ=1` no MySQL IPTV
- `SELECT` dados de acesso (tabela `acesso`)
- Envio WhatsApp via Evolution API
- Log em `automation_log`
- Alerta admin em caso de erro

**❌ OUT OF SCOPE**
- Dashboard web, portal cliente, GestorV3 (ISP), multi-tenant, boletos/PIX

---

## 3. Arquitetura

### Fluxo Principal
```
MP (payment.approved) → N8N Webhook
→ Validar status
→ GET /v1/payments/{id} (MP API)
→ Extrair id_user do external_reference
→ MySQL: UPDATE fatura SET situ=1 WHERE id_user=X AND situ=0
→ MySQL: SELECT dados, nome, tel FROM acesso JOIN user WHERE id_user=X
→ Code Node: strip HTML → texto limpo
→ Evolution API: POST /message/sendText
→ MySQL: INSERT automation_log
```

### Stack
| Componente | Tecnologia |
|---|---|
| Orquestrador | N8N self-hosted |
| Banco | MySQL (MariaDB 10.x) — banco `gigante` |
| Pagamento | Mercado Pago IPN Webhooks |
| WhatsApp | Evolution API v2 |

### Schema Relevante

**`fatura`**: `id`, `id_user`, **`situ` (0=pendente/1=pago ← alvo)**, `valor`, `forma`, `vencimento`

**`acesso`**: `id`, `id_user`, `dados` (TEXT HTML com credenciais)

**`user`**: `id`, `nome`, **`tel`** (WhatsApp), `email`

---

## 4. User Stories

### US-01 — Ativação Automática
- **Como** cliente que pagou via MP
- **Quero** receber dados de acesso no WhatsApp imediatamente
- **Critérios:** webhook em < 5s · fatura atualizada em < 10s · WhatsApp em < 30s · mensagem com nome + links + user/senha

### US-02 — Alerta de Falha
- **Como** operador
- **Quero** WhatsApp quando ativação falhar
- **Critérios:** erro no N8N → WhatsApp admin com id_user + erro + timestamp

### US-03 — Log de Auditoria
- **Como** operador
- **Quero** registro de cada execução
- **Critérios:** `automation_log` com status, erro, timestamp para cada run

---

## 5. Workflow N8N — 10 Nodes

| # | Node | Tipo | Config |
|---|---|---|---|
| 1 | MP Webhook | Webhook POST | `/mp-payment` com auth token |
| 2 | Validar Approved | IF | `body.action=='payment' AND status=='approved'` |
| 3 | Buscar MP | HTTP Request | `GET /v1/payments/{{id}}` + Bearer token |
| 4 | Extrair id_user | Set Node | `external_reference → id_user` |
| 5 | UPDATE Fatura | MySQL | `UPDATE fatura SET situ=1 WHERE id_user={{id_user}} AND situ=0` |
| 6 | SELECT Acesso | MySQL | `SELECT a.dados, u.nome, u.tel FROM acesso a JOIN user u ON a.id_user=u.id WHERE a.id_user={{id_user}}` |
| 7 | Sanitizar HTML | Code (JS) | Strip tags → texto limpo |
| 8 | Enviar WhatsApp | HTTP Request | `POST Evolution /message/sendText` |
| 9 | Log Sucesso | MySQL | `INSERT automation_log` |
| 10 | Error Handler | Error Trigger | WhatsApp admin + log erro |

### Code Node — Sanitizar HTML
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
🎉 Olá, {{nome}}! Pagamento confirmado!

Seus dados de acesso:
{{dados_limpos}}

⚠️ Guarde essas informações.
— Cine Play TV
```

---

## 6. Infraestrutura

### SQL — Criar Tabela de Log
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

### Variáveis de Ambiente N8N
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

### Dia 1 — Setup
- [ ] Criar tabela `automation_log` no MySQL
- [ ] Configurar credenciais MySQL e Evolution API no N8N
- [ ] Registrar webhook no painel MP
- [ ] Configurar `external_reference={{id_user}}` nos planos MP
- [ ] Testar webhook em sandbox

### Dia 2 — Workflow
- [ ] Construir nodes 1–7
- [ ] Testar UPDATE + SELECT no banco real
- [ ] Implementar node WhatsApp
- [ ] Implementar Error Handler e log

### Dia 3 — Go-Live
- [ ] Teste E2E com 1 pagamento real
- [ ] Verificar log, WhatsApp e `fatura.situ`
- [ ] Ativar produção
- [ ] Monitorar 3 ativações reais
- [ ] Documentar no Notion

---

## 8. Definition of Done

- [ ] Webhook processa `payment.approved` sem erro
- [ ] `fatura.situ=1` em < 15s do webhook
- [ ] Dados `acesso` lidos corretamente
- [ ] HTML sanitizado — sem tags no WhatsApp
- [ ] Cliente recebe WhatsApp em < 30s
- [ ] Admin recebe alerta em caso de erro
- [ ] Log gravado em `automation_log`
- [ ] 3 pagamentos reais consecutivos sem falha
- [ ] Credenciais em variáveis N8N (não hard-coded)
- [ ] Documentação no Notion

---

## 9. Riscos

| Risco | Prob. | Mitigação |
|---|---|---|
| MySQL inacessível remotamente | **Alta** | SSH tunnel ou liberar porta 3306 com IP fixo |
| `external_reference` ausente nos planos | **Alta** | Recriar preferências MP antes do go-live |
| Evolution API desconectada | Média | Health-check diário automatizado |
| HTML mal formatado no `acesso.dados` | Média | Sanitização robusta + teste com dados reais |
| Webhook MP com duplicatas | Baixa | Checar `situ` antes de atualizar (idempotência) |

---
*ClienteZero PRD v1.0 — Para agente de programação IA — Março 2026*