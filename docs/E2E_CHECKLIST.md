# E2E Checklist — ClienteZero

## Objetivo
Validar fluxo completo: Mercado Pago (sandbox) → N8N → MySQL → Evolution WhatsApp → logs.

## Pré-requisitos
- Ter variáveis no `env` (use `env.example` como referência).
- Migration `migrations/001_create_automation_log.sql` aplicada.
- N8N rodando em sandbox com auth token configurado.

## Passos de validação

### 1) Dia 1 — Setup
- Aplicar migration: `migrations/001_create_automation_log.sql`.
- Configurar credenciais N8N: DB MySQL + Evolution API.
- Registrar webhook MP (sandbox) apontando para N8N `/mp-payment`.
- Criar planos/tests MP com `external_reference={{id_user}}`.

### 2) Testes básicos
- Disparar webhook simulado com `action=payment` e `status=approved` e um `id` de pagamento.
- Verificar node 2 (IF) passa para node 3.
- Node 5: executar `sql/update_safe.sql` via node MySQL; confirmar `affected_rows>0` para novo pagamento.
- Node 6: SELECT `dados`, `nome`, `tel` retorna entradas corretas.

### 3) Teste de sanitização e envio
- Inserir `acesso.dados` com HTML complexo/entidades; executar node 7 (Code) e validar `dados_limpos`.
- Simular envio para Evolution (node 8) apontando para sandbox/endpoint de teste; validar formato do payload.

### 4) Teste E2E (sandbox)
- Fazer um pagamento real em modo sandbox (ou simular MP callback real) com `external_reference` válido.
- Validar: `fatura.situ=1`, mensagem WhatsApp recebida (sandbox), e `automation_log` com `status='success'`.

### 5) Falhas e retries
- Forçar falha no envio Evolution (timeout/500) e validar Error Handler: log com `status='error'` e WhatsApp admin enviado.
- Verificar política de retry e que não haja duplicação de ativação (idempotência).

## Critérios de aceite
- Todas as etapas do fluxo completam sem erro no sandbox.
- `automation_log` contém entradas legíveis com `mp_payment_id` e `id_user`.
- Mensagem enviada com `dados_limpos` e sem tags HTML.

## Observações
- Automatizar estes passos com scripts ou testes integrados é recomendado após validação manual.
