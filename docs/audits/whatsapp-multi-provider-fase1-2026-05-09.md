# Auditoria: WhatsApp Multi-Provider Fase 1
**Data:** 2026-05-09
**Area:** Abstração multi-provider (6 Edge Functions + 4 shared files)
**Foco:** Retrocompatibilidade, paridade funcional, segurança

---

## Sumario Executivo

| Dimensão | Status | Gaps |
|----------|--------|------|
| 1. Funcional | 🟢 | 1 |
| 2. Dados | 🟢 | 0 |
| 3. Integração | 🟢 | 0 |
| 4. UX/Visual | N/A | 0 |
| 5. Comercial | N/A | 0 |

**Semaforo geral: 🟢 VERDE**

A migração está correta e retrocompatível. Todas as 6 Edge Functions mantêm paridade funcional com o código original. A auth do webhook está preservada. O único gap é cosmético (fix-lead-names continua hardcoded para Veltz Group, mas isso já existia antes).

---

## Checklist de Conformidade com a Spec

### Arquivos criados

| # | Arquivo | Status | Conforme Spec |
|---|---------|--------|---------------|
| 1 | `_shared/whatsapp-provider.ts` | Criado | Sim - interface + 6 tipos |
| 2 | `_shared/providers/zapi.ts` | Criado | Sim - 7 métodos implementados |
| 3 | `_shared/whatsapp-config.ts` | Criado | Sim - 4 funções |
| 4 | `_shared/whatsapp-factory.ts` | Criado | Sim - singleton factory |
| 5 | `_shared/zapi-config.ts` | Deprecated | Sim - re-exports |

### Edge Functions migradas

| # | Function | Deploy | Imports limpos | Paridade funcional |
|---|----------|--------|----------------|-------------------|
| 1 | whatsapp-manager | OK | Sim | Sim |
| 2 | check-whatsapp-health | OK | Sim | Sim |
| 3 | zapi-send | OK | Sim | Sim |
| 4 | process-message-queue | OK | Sim | Sim |
| 5 | fix-lead-names | OK | Sim | Sim |
| 6 | zapi-webhook | OK | Sim | Sim |

### Critérios de aceite da Spec

| Critério | Status |
|----------|--------|
| Todas as 6 Edge Functions buildando sem erro | OK (6/6 deployadas) |
| Nenhuma Edge Function importa `providers/zapi.ts` diretamente | OK |
| Nenhuma Edge Function importa `zapi-config.ts` | OK |
| `zapi-config.ts` existe com re-exports deprecated | OK |
| Retrocompatibilidade com `active_whatsapp_provider = 'zapi'` | OK |

---

## Verificação de Paridade Funcional

### whatsapp-manager

| Action | Original | Migrado | Match |
|--------|----------|---------|-------|
| status | `fetch(baseUrl/status)` → parse `connected` | `provider.getStatus()` → mesma lógica em ZApiProvider | Sim |
| qrcode | `fetch(baseUrl/qr-code)` → `data.value` | `provider.getQrCode()` → `data.value` | Sim |
| disconnect | `fetch(baseUrl/disconnect, POST)` | `provider.disconnect()` | Sim |
| restart | `fetch(baseUrl/restart, POST)` | `provider.restart()` | Sim |
| updateMetadata | `updateZApiMetadata` | `updateWhatsAppMetadata` (mesma lógica) | Sim |

### zapi-send

| Aspecto | Original | Migrado | Match |
|---------|----------|---------|-------|
| Build URL | `buildZApiUrl(config)` | Encapsulado em `ZApiProvider.buildUrl()` | Sim |
| Build headers | `buildZApiHeaders(config)` | Encapsulado em `ZApiProvider.buildHeaders()` | Sim |
| Endpoints por tipo | Map `text→/send-text`, etc. | Mesmo map em `ZApiProvider.sendMessage()` | Sim |
| Body construction | `phone + message/caption + media` | Mesma lógica | Sim |
| Error check | `!res.ok \|\| data.error` | Mesma validação em ZApiProvider | Sim |
| Insert mensagem | Preservado integralmente | Sim | Sim |
| conversation_status | Preservado | Sim | Sim |
| first_response_at | Preservado | Sim | Sim |

### zapi-webhook (mais sensível)

| Aspecto | Original | Migrado | Match |
|---------|----------|---------|-------|
| Auth: `z-api-token` header | `zapiToken !== config.instance_token` | `zapiToken !== (config.metadata.token as string)` | Sim (mesmo valor) |
| getConfigByInstanceId | `getZApiConfigByInstanceId` | `getWhatsAppConfigByInstanceId` | Sim |
| Profile picture | `fetch(buildZApiUrl/profile-picture)` | `provider.getProfilePicture(config, phone)` | Sim |
| Avatar upload to storage | Preservado integralmente | Sim | Sim |
| Status auto-connect | `updateZApiMetadata` | `updateWhatsAppMetadata` | Sim |
| Lead creation flow | Preservado (pipeline, stage, source, assignee) | Sim | Sim |
| Audio transcription | Preservado (Whisper) | Sim | Sim |
| SDR AI dispatch | Preservado | Sim | Sim |
| Run automations | Preservado | Sim | Sim |
| Auto-reply schedule | Preservado | Sim | Sim |

### check-whatsapp-health

| Aspecto | Original | Migrado | Match |
|---------|----------|---------|-------|
| getAllConnected | Filtrava `provider='zapi'` | Filtra `provider IN ('zapi','wuzapi','revolution')` | Sim (superset, sem breaking) |
| Status check | `fetch(baseUrl/status)` | `provider.getStatus()` via factory | Sim |
| Notificações admin | Preservado | Sim | Sim |

### process-message-queue

| Aspecto | Original | Migrado | Match |
|---------|----------|---------|-------|
| Config lookup | `getZApiConfigByCompany` com `status: 'connected'` | `getWhatsAppConfig` com `status: 'connected'` | Sim |
| Send via provider | `fetch(baseUrl/send-text)` | `provider.sendMessage()` | Sim |
| Message history insert | Preservado | Sim | Sim |
| Queue status update | Preservado | Sim | Sim |
| 2s delay entre envios | Preservado | Sim | Sim |

### fix-lead-names

| Aspecto | Original | Migrado | Match |
|---------|----------|---------|-------|
| Config lookup | `getZApiConfigByCompany` | `getWhatsAppConfig` | Sim |
| Get chats | `fetch(buildZApiUrl/chats)` | `provider.getChats()` | Sim |
| Chat map building | Preservado | Sim | Sim |
| Lead update logic | Preservado | Sim | Sim |
| Error message | `'Z-API nao configurada ou desconectada'` | `'WhatsApp nao configurado ou desconectado'` | Sim (melhorado) |

---

## Achados

### 🟡 F1 - fix-lead-names hardcoded para Veltz Group
**Severidade:** Baixo (preexistente, não introduzido pela migração)
**Arquivo:** `supabase/functions/fix-lead-names/index.ts:19`

```typescript
const companyId = 'd20f7d62-974b-40c4-8f0b-bb8207513554'
```

Company ID hardcoded. Já existia antes da migração. Deveria aceitar `companyId` via body do request.

**Ação:** Backlog para generalizar. Não é escopo da Fase 1.

---

## Verificação de Segurança

| Ponto | Status |
|-------|--------|
| Auth do webhook Z-API (`z-api-token` header) | Preservada. Token comparado com `config.metadata.token` |
| Auth do zapi-send (Bearer token → getUser) | Preservada |
| Auth do whatsapp-manager (Bearer token passado ao supabase) | Preservada |
| company_id filtering em todas as queries | Preservado |
| Service role key não exposta | OK |

---

## Verificação de Arquitetura

| Regra da Spec | Verificado |
|---------------|-----------|
| Nenhuma Edge Function importa `providers/zapi.ts` | OK (grep confirmou 0 matches) |
| Todas usam `whatsapp-config.ts` + `whatsapp-factory.ts` | OK |
| `metadata` é opaco fora do provider | OK - apenas `zapi-webhook:70` acessa `metadata.token` para auth (Z-API-specific, aceitável) |
| Factory usa singletons | OK - instanciado uma vez no map |
| `zapi-config.ts` deprecated com re-exports | OK |

---

## Conclusão

**Fase 1 aprovada.** A migração é fiel ao original, retrocompatível, e segue a Spec. Nenhum gap critico ou alto encontrado. O único achado (fix-lead-names hardcoded) é preexistente e fora de escopo.

Para adicionar WUZAPI (Fase 2), basta:
1. Criar `_shared/providers/wuzapi.ts`
2. Adicionar `wuzapi: new WuzApiProvider()` no factory
3. Criar `wuzapi-webhook` Edge Function
