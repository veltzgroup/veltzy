# Runbook: Migracao de empresa para Evolution API

## Pre-requisitos

Antes de migrar uma empresa, confirmar que:

### 1. Instancias Evolution criadas no Hub
```sql
-- Verificar instancias da empresa
SELECT instance_name, phone_number, status, created_at
FROM public.evolution_instances
WHERE company_id = '<COMPANY_ID>'
ORDER BY created_at;
```
Cada numero WhatsApp da empresa deve ter uma instancia Evolution conectada (status='open').

### 2. Vendedores com numero padrao configurado
```sql
-- Verificar vendedores sem numero
SELECT p.id, p.name, p.email, p.default_whatsapp_instance
FROM public.profiles p
WHERE p.company_id = '<COMPANY_ID>'
  AND p.is_available = true
ORDER BY p.name;
```
Todo vendedor ativo deve ter `default_whatsapp_instance` preenchido. Vendedores sem numero nao conseguirao enviar mensagens (chat-input bloqueado).

### 3. Pipelines com instancia SDR (se usar IA SDR)
```sql
-- Verificar pipelines
SELECT id, name, sdr_instance_name, sdr_transfer_message_template
FROM veltzy.pipelines
WHERE company_id = '<COMPANY_ID>'
  AND is_active = true;
```
Se a empresa usa AI SDR, cada pipeline deve ter `sdr_instance_name` configurado. Se null, SDR usara o numero do vendedor atribuido (fallback).

### 4. Webhook do Hub configurado
Confirmar que `evolution-webhook-receiver` no Hub esta chamando `evolution-inbound` do Veltzy com o header `x-hub-secret` correto.

---

## Migracao

### Passo 1: Ativar Evolution para a empresa
```sql
UPDATE public.companies
SET active_whatsapp_provider = 'evolution'
WHERE id = '<COMPANY_ID>';

-- Confirmar
SELECT id, name, active_whatsapp_provider
FROM public.companies
WHERE id = '<COMPANY_ID>';
```

Efeito imediato:
- Novos envios (humano, SDR, automacao) usam Evolution via Hub
- Novos webhooks do Hub sao processados por `evolution-inbound`
- Frontend mostra UI multi-instancia (filtro, badges, config)
- Z-API da empresa e ignorado (mas continua conectado como fallback)

### Passo 2: Teste de envio
1. Abrir o Veltzy como um vendedor da empresa
2. Ir ao inbox, abrir uma conversa existente
3. Enviar mensagem de texto
4. Confirmar que chegou no WhatsApp do lead

```sql
-- Verificar ultima mensagem enviada
SELECT id, content, sender_type, source, instance_name, delivery_status, created_at
FROM veltzy.messages
WHERE company_id = '<COMPANY_ID>'
  AND sender_type = 'human'
ORDER BY created_at DESC
LIMIT 1;
```
Deve mostrar `source='whatsapp'`, `delivery_status='sent'`, `instance_name` preenchido.

### Passo 3: Teste de recebimento
1. Enviar mensagem do WhatsApp de um contato para o numero da empresa
2. Verificar que apareceu no inbox do Veltzy

```sql
-- Verificar ultima mensagem recebida
SELECT id, content, sender_type, source, instance_name, delivery_status, created_at
FROM veltzy.messages
WHERE company_id = '<COMPANY_ID>'
  AND sender_type = 'lead'
ORDER BY created_at DESC
LIMIT 1;
```
Deve mostrar `source='whatsapp'`, `instance_name` preenchido.

### Passo 4: Teste de SDR (se aplicavel)
1. Enviar mensagem de um numero novo (lead nao existente)
2. Verificar que o lead foi criado com `whatsapp_instance_name` preenchido
3. Se `is_ai_active=true`, verificar que a IA respondeu

```sql
-- Verificar lead criado
SELECT id, name, phone, whatsapp_instance_name, is_ai_active, assigned_to
FROM veltzy.leads
WHERE company_id = '<COMPANY_ID>'
ORDER BY created_at DESC
LIMIT 1;
```

### Passo 5: Monitorar por 24-48h
- Verificar logs de erro no Supabase Dashboard > Edge Functions > Logs
- Verificar se ha mensagens com `delivery_status='failed'`:
```sql
SELECT COUNT(*) as failed_count
FROM veltzy.messages
WHERE company_id = '<COMPANY_ID>'
  AND delivery_status = 'failed'
  AND created_at > now() - interval '24 hours';
```

### Passo 6: Desconectar Z-API (apos validacao)
Apos confirmar que tudo funciona por 48h+:
- Desconectar instancia Z-API da empresa no painel Z-API
- Remover registro de `oauth_integrations`:
```sql
DELETE FROM public.oauth_integrations
WHERE company_id = '<COMPANY_ID>'
  AND provider = 'zapi';
```

---

## Rollback

Se algo der errado, reverter e imediato:

```sql
UPDATE public.companies
SET active_whatsapp_provider = 'zapi'
WHERE id = '<COMPANY_ID>';
```

Efeito imediato:
- Envios voltam a usar Z-API
- Webhooks Z-API voltam a funcionar
- Frontend volta para UI single-instance
- Mensagens com `instance_name` preenchido continuam visiveis (sem quebra)
- Z-API deve estar conectado (nao desconectar antes de validacao completa)

---

## Empresas migradas

| Empresa | Company ID | Data migracao | Status |
|---------|-----------|---------------|--------|
| (primeira cobaia) | d20f7d62-974b-40c4-8f0b-bb8207513554 | pendente | - |

---

## Limpeza pos-migracao (todas as empresas)

Apos TODAS as empresas estarem em Evolution por 2+ semanas:

1. Remover `supabase/functions/zapi-send/` (Edge Function legada)
2. Remover `supabase/functions/_shared/providers/zapi.ts`
3. Remover `ZApiProvider` do factory
4. Limpar `oauth_integrations` com provider='zapi'
5. Remover indice `idx_oauth_integrations_zapi_instance`
6. Considerar remover `zapi-webhook` ou manter como no-op
