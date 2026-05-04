# Spec -- Migrar credenciais Z-API de whatsapp_configs para oauth_integrations

> PRD: [docs/features/zapi-migrate-oauth/PRD.md](./PRD.md)

---

## 1. Arquitetura da mudanca

### 1.1 Banco de dados

**Nenhuma tabela nova.** A tabela `public.oauth_integrations` ja existe e ja contem as credenciais Z-API gravadas pelo Hub.

**Migration unica -- indice JSONB:**

```sql
-- supabase/migrations/20260503_zapi_oauth_index.sql

CREATE INDEX IF NOT EXISTS idx_oauth_integrations_zapi_instance
ON public.oauth_integrations ((metadata->>'instance_id'))
WHERE provider = 'zapi';

COMMENT ON INDEX idx_oauth_integrations_zapi_instance
IS 'Indice parcial para lookup por instance_id no webhook da Z-API';
```

Justificativa: `zapi-webhook` busca por `metadata->>'instance_id'` em cada request. Sem indice, faria seq scan.

### 1.2 Mapeamento de campos

| whatsapp_configs (atual) | oauth_integrations (destino) | Notas |
|---|---|---|
| `instance_id` (coluna) | `metadata->>'instance_id'` | Mesmo nome |
| `instance_token` (coluna) | `metadata->>'token'` | **Nome diferente!** |
| `client_token` (coluna) | `metadata->>'client_token'` | Mesmo nome |
| (nao existe) | `metadata->>'server_url'` | Novo, default `https://api.z-api.io` |
| `status` (coluna) | `status` (coluna) | Mesmo nome, mesmos valores |
| `phone_number` (coluna) | `metadata->>'phone_number'` | Mover para JSONB |
| `qr_code` (coluna) | `metadata->>'qr_code'` | Mover para JSONB |
| `connected_at` (coluna) | `metadata->>'connected_at'` | Mover para JSONB |
| `company_id` (coluna) | `company_id` (coluna) | Mesmo nome |

### 1.3 Helper de leitura (Edge Functions)

Criar um helper compartilhado `_shared/zapi-config.ts` para evitar duplicacao nas 5 Edge Functions:

```typescript
// supabase/functions/_shared/zapi-config.ts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface ZApiConfig {
  id: string
  company_id: string
  instance_id: string
  instance_token: string
  client_token: string
  server_url: string
  status: string
  phone_number: string | null
  qr_code: string | null
  connected_at: string | null
}

/**
 * Le credenciais Z-API de oauth_integrations e retorna no formato padrao.
 * Mapeia metadata.token -> instance_token para manter compatibilidade.
 */
export async function getZApiConfigByCompany(
  supabase: SupabaseClient,
  companyId: string,
  extraFilters?: { status?: string }
): Promise<ZApiConfig | null> {
  let query = supabase
    .from('oauth_integrations')
    .select('id, company_id, provider, status, metadata')
    .eq('provider', 'zapi')
    .eq('company_id', companyId)

  if (extraFilters?.status) {
    query = query.eq('status', extraFilters.status)
  }

  const { data, error } = await query.maybeSingle()
  if (error || !data) return null

  return mapToZApiConfig(data)
}

export async function getZApiConfigByInstanceId(
  supabase: SupabaseClient,
  instanceId: string
): Promise<ZApiConfig | null> {
  const { data, error } = await supabase
    .from('oauth_integrations')
    .select('id, company_id, provider, status, metadata')
    .eq('provider', 'zapi')
    .eq('metadata->>instance_id', instanceId)
    .maybeSingle()

  if (error || !data) return null

  return mapToZApiConfig(data)
}

export async function getAllConnectedZApiConfigs(
  supabase: SupabaseClient
): Promise<ZApiConfig[]> {
  const { data, error } = await supabase
    .from('oauth_integrations')
    .select('id, company_id, provider, status, metadata')
    .eq('provider', 'zapi')
    .eq('status', 'connected')

  if (error || !data) return []

  return data.map(mapToZApiConfig)
}

export async function updateZApiMetadata(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Pick<ZApiConfig, 'status' | 'phone_number' | 'qr_code' | 'connected_at'>>
): Promise<void> {
  // Busca metadata atual para merge
  const { data: current } = await supabase
    .from('oauth_integrations')
    .select('metadata, status')
    .eq('id', id)
    .single()

  if (!current) return

  const newMetadata = { ...current.metadata }
  if (updates.phone_number !== undefined) newMetadata.phone_number = updates.phone_number
  if (updates.qr_code !== undefined) newMetadata.qr_code = updates.qr_code
  if (updates.connected_at !== undefined) newMetadata.connected_at = updates.connected_at

  const updatePayload: Record<string, unknown> = { metadata: newMetadata }
  if (updates.status !== undefined) updatePayload.status = updates.status

  await supabase
    .from('oauth_integrations')
    .update(updatePayload)
    .eq('id', id)
}

function mapToZApiConfig(row: {
  id: string
  company_id: string
  status: string
  metadata: Record<string, unknown>
}): ZApiConfig {
  const m = row.metadata
  return {
    id: row.id,
    company_id: row.company_id,
    instance_id: (m.instance_id as string) ?? '',
    instance_token: (m.token as string) ?? '',   // NOME DIFERENTE: token -> instance_token
    client_token: (m.client_token as string) ?? '',
    server_url: (m.server_url as string) ?? 'https://api.z-api.io',
    status: row.status,
    phone_number: (m.phone_number as string) ?? null,
    qr_code: (m.qr_code as string) ?? null,
    connected_at: (m.connected_at as string) ?? null,
  }
}

export function buildZApiUrl(config: ZApiConfig): string {
  return `${config.server_url}/instances/${config.instance_id}/token/${config.instance_token}`
}

export function buildZApiHeaders(config: ZApiConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Client-Token': config.client_token,
  }
}
```

### 1.4 Frontend -- type adapter

Atualizar `src/types/database.ts` para manter a interface `WhatsAppConfig` como alias (consumidores nao quebram), mas os services passam a ler de `oauth_integrations`:

```typescript
// Manter a interface existente (sem quebrar imports)
export interface WhatsAppConfig {
  id: string
  company_id: string
  instance_id: string
  instance_token: string
  client_token: string
  phone_number: string | null
  status: WhatsAppStatus
  qr_code: string | null
  connected_at: string | null
  created_at: string
  updated_at: string
}
```

A interface nao muda. O mapeamento `metadata.token -> instance_token` acontece nos services.

---

## 2. Lista de arquivos a criar/modificar

### Criar

| # | Arquivo | Descricao |
|---|---|---|
| 1 | `supabase/migrations/20260503_zapi_oauth_index.sql` | Indice parcial em `metadata->>'instance_id'` |
| 2 | `supabase/functions/_shared/zapi-config.ts` | Helper compartilhado: leitura, mapeamento, update de oauth_integrations |

### Modificar -- Edge Functions

| # | Arquivo | Mudanca |
|---|---|---|
| 3 | `supabase/functions/zapi-webhook/index.ts` | Trocar query de `whatsapp_configs` por `getZApiConfigByInstanceId()`. Manter validacao de `instance_token` contra header `z-api-token`. Update de status via `updateZApiMetadata()`. |
| 4 | `supabase/functions/zapi-send/index.ts` | Trocar query por `getZApiConfigByCompany()`. Usar `buildZApiUrl()` e `buildZApiHeaders()`. |
| 5 | `supabase/functions/process-message-queue/index.ts` | Trocar query por `getZApiConfigByCompany(supabase, companyId, { status: 'connected' })`. Usar helpers de URL/headers. |
| 6 | `supabase/functions/check-whatsapp-health/index.ts` | Trocar query por `getAllConnectedZApiConfigs()`. Update de status via `updateZApiMetadata()`. |
| 7 | `supabase/functions/whatsapp-manager/index.ts` | Trocar query por `getZApiConfigByCompany()`. Updates de `status`, `phone_number`, `qr_code`, `connected_at` via `updateZApiMetadata()`. |

### Modificar -- Frontend

| # | Arquivo | Mudanca |
|---|---|---|
| 8 | `src/services/whatsapp.service.ts` | `getConfig()`: ler de `supabase.from('oauth_integrations')` com `.eq('provider', 'zapi')`, mapear metadata. Remover `saveConfig()` (Hub gerencia credenciais). Manter funcoes que invocam Edge Functions (nao mudam). |
| 9 | `src/hooks/use-whatsapp-status.ts` | Trocar query para `supabase.from('oauth_integrations').select('status').eq('provider', 'zapi').eq('company_id', ...)`. |
| 10 | `src/services/messages.service.ts` | `isWhatsAppConnected()`: trocar para `supabase.from('oauth_integrations').select('id').eq('provider', 'zapi').eq('company_id', ...).eq('status', 'connected')`. Usar import `supabase` (schema public) em vez de `db()` (schema veltzy) para esta funcao. |

### Nao alterar

- `src/types/database.ts` -- manter `WhatsAppConfig` intacta como adapter
- `src/components/` -- nenhum componente acessa a tabela diretamente
- `veltzy.whatsapp_configs` -- manter no banco como fallback por 1 semana

---

## 3. Detalhamento por arquivo

### 3.1 Migration: `20260503_zapi_oauth_index.sql`

```sql
CREATE INDEX IF NOT EXISTS idx_oauth_integrations_zapi_instance
ON public.oauth_integrations ((metadata->>'instance_id'))
WHERE provider = 'zapi';
```

### 3.2 Helper: `_shared/zapi-config.ts`

Codigo completo na secao 1.3 acima. Funcoes exportadas:

- `getZApiConfigByCompany(supabase, companyId, extraFilters?)` -- busca por company_id
- `getZApiConfigByInstanceId(supabase, instanceId)` -- busca por metadata instance_id (webhook)
- `getAllConnectedZApiConfigs(supabase)` -- lista todas conectadas (health check)
- `updateZApiMetadata(supabase, id, updates)` -- atualiza status/phone/qr/connected_at
- `buildZApiUrl(config)` -- monta URL da Z-API
- `buildZApiHeaders(config)` -- monta headers com Client-Token
- `mapToZApiConfig(row)` -- mapeia row do banco para interface padrao

### 3.3 Edge Function: `zapi-webhook/index.ts`

**Antes:**
```typescript
const supabase = createClient(url, key, { db: { schema: 'veltzy' } })
const { data: config } = await supabase
  .from('whatsapp_configs')
  .select('company_id, instance_id, instance_token, client_token')
  .eq('instance_id', payload.instanceId)
  .single()
```

**Depois:**
```typescript
import { getZApiConfigByInstanceId, updateZApiMetadata, buildZApiUrl, buildZApiHeaders } from '../_shared/zapi-config.ts'

const supabase = createClient(url, key) // schema public (default)
const config = await getZApiConfigByInstanceId(supabase, payload.instanceId)
```

Validacao do header `z-api-token` continua usando `config.instance_token` (ja mapeado de `metadata.token`).

Update de status:
```typescript
// ANTES
await supabase.from('whatsapp_configs').update({ status: 'connected' }).eq('id', config.id)

// DEPOIS
await updateZApiMetadata(supabase, config.id, { status: 'connected' })
```

### 3.4 Edge Function: `zapi-send/index.ts`

**Antes:**
```typescript
const { data: config } = await supabase
  .from('whatsapp_configs')
  .select('*')
  .eq('company_id', companyId)
  .single()

const baseUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.instance_token}`
```

**Depois:**
```typescript
import { getZApiConfigByCompany, buildZApiUrl, buildZApiHeaders } from '../_shared/zapi-config.ts'

const config = await getZApiConfigByCompany(supabase, companyId)
if (!config || config.status !== 'connected') { /* erro */ }

const baseUrl = buildZApiUrl(config)
const headers = buildZApiHeaders(config)
```

### 3.5 Edge Function: `process-message-queue/index.ts`

Mesmo padrao do `zapi-send`. Diferenca: ja filtra por status na query.

```typescript
const config = await getZApiConfigByCompany(supabase, item.company_id, { status: 'connected' })
if (!config) continue // skip item sem config conectada
```

### 3.6 Edge Function: `check-whatsapp-health/index.ts`

**Antes:**
```typescript
const { data: configs } = await supabase
  .from('whatsapp_configs')
  .select('id, company_id, instance_id, instance_token, client_token, status')
  .eq('status', 'connected')
```

**Depois:**
```typescript
import { getAllConnectedZApiConfigs, updateZApiMetadata, buildZApiUrl, buildZApiHeaders } from '../_shared/zapi-config.ts'

const configs = await getAllConnectedZApiConfigs(supabase)
```

Update de status quando desconectado:
```typescript
await updateZApiMetadata(supabase, config.id, { status: 'disconnected' })
```

### 3.7 Edge Function: `whatsapp-manager/index.ts`

Mais complexo pois faz updates de multiplos campos:

```typescript
import { getZApiConfigByCompany, updateZApiMetadata, buildZApiUrl, buildZApiHeaders } from '../_shared/zapi-config.ts'

const config = await getZApiConfigByCompany(supabase, companyId)

// Conectado com sucesso
await updateZApiMetadata(supabase, config.id, {
  status: 'connected',
  phone_number: phoneNumber,
  connected_at: new Date().toISOString(),
})

// QR code recebido
await updateZApiMetadata(supabase, config.id, {
  status: 'connecting',
  qr_code: qrCode,
})

// Desconectado
await updateZApiMetadata(supabase, config.id, {
  status: 'disconnected',
  phone_number: null,
  qr_code: null,
})
```

### 3.8 Frontend: `whatsapp.service.ts`

```typescript
import { supabase } from '@/lib/supabase'
import type { WhatsAppConfig } from '@/types/database'

export const getConfig = async (companyId: string): Promise<WhatsAppConfig | null> => {
  const { data, error } = await supabase
    .from('oauth_integrations')
    .select('id, company_id, status, metadata, created_at, updated_at')
    .eq('provider', 'zapi')
    .eq('company_id', companyId)
    .maybeSingle()

  if (error || !data) return null

  const m = data.metadata as Record<string, unknown>
  return {
    id: data.id,
    company_id: data.company_id,
    instance_id: (m.instance_id as string) ?? '',
    instance_token: (m.token as string) ?? '',
    client_token: (m.client_token as string) ?? '',
    phone_number: (m.phone_number as string) ?? null,
    status: data.status as WhatsAppConfig['status'],
    qr_code: (m.qr_code as string) ?? null,
    connected_at: (m.connected_at as string) ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

// REMOVIDO: saveConfig() -- credenciais sao gerenciadas pelo Hub

// Funcoes que invocam Edge Functions permanecem inalteradas:
// - getStatus(companyId)
// - getQrCode(companyId)
// - disconnect(companyId)
```

### 3.9 Frontend: `use-whatsapp-status.ts`

```typescript
import { supabase } from '@/lib/supabase'

// Dentro do useQuery:
const { data } = await supabase
  .from('oauth_integrations')
  .select('status')
  .eq('provider', 'zapi')
  .eq('company_id', companyId)
  .maybeSingle()

return data?.status ?? 'disconnected'
```

### 3.10 Frontend: `messages.service.ts`

Apenas a funcao `isWhatsAppConnected` muda. Usar `supabase` diretamente (schema public):

```typescript
import { supabase } from '@/lib/supabase'

export const isWhatsAppConnected = async (companyId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('oauth_integrations')
    .select('id')
    .eq('provider', 'zapi')
    .eq('company_id', companyId)
    .eq('status', 'connected')
    .maybeSingle()
  return !!data
}
```

**Atencao:** O import atual e `import { veltzy as db } from '@/lib/supabase'`. Adicionar `supabase` ao import existente:
```typescript
import { veltzy as db, supabase } from '@/lib/supabase'
```
O `supabase` ja e importado nesse arquivo (verificado na linha 1).

---

## 4. Ordem de implementacao

1. Migration (indice)
2. `_shared/zapi-config.ts` (helper)
3. `zapi-webhook` (mais critico -- recebe mensagens)
4. `zapi-send` (segundo mais critico -- envia mensagens)
5. `process-message-queue` (depende do mesmo padrao do zapi-send)
6. `check-whatsapp-health` (menos urgente)
7. `whatsapp-manager` (gerenciamento de conexao)
8. `whatsapp.service.ts` (frontend -- leitura)
9. `use-whatsapp-status.ts` (frontend -- polling)
10. `messages.service.ts` (frontend -- check de conexao)

Deploy: Edge Functions e frontend devem ser deployados juntos para evitar inconsistencia.

---

## 5. Criterios de aceite

- [ ] Edge Functions leem credenciais de `public.oauth_integrations` (nao mais de `veltzy.whatsapp_configs`)
- [ ] Webhook recebe mensagem e roteia corretamente (busca por `metadata->>'instance_id'`)
- [ ] Envio de mensagem funciona via `zapi-send`
- [ ] Fila de mensagens processa corretamente via `process-message-queue`
- [ ] Health check detecta desconexao e atualiza status em `oauth_integrations`
- [ ] `whatsapp-manager` atualiza `phone_number`, `qr_code`, `connected_at` no metadata JSONB
- [ ] Frontend exibe status correto do WhatsApp (polling via `use-whatsapp-status`)
- [ ] `isWhatsAppConnected()` retorna true quando Z-API conectada
- [ ] `getConfig()` retorna dados mapeados corretamente (instance_token <- metadata.token)
- [ ] `saveConfig()` removido do `whatsapp.service.ts`
- [ ] Indice `idx_oauth_integrations_zapi_instance` criado no banco
- [ ] `whatsapp_configs` permanece intacta no banco (fallback por 1 semana)
- [ ] Build passa sem erros (`npm run build`)
- [ ] Nenhum import de `whatsapp_configs` restante no codigo (exceto types)

---

## 6. Riscos e mitigacao

| Risco | Mitigacao |
|---|---|
| Webhook falha (perda de mensagens) | Testar `zapi-webhook` primeiro e isoladamente. Manter `whatsapp_configs` como fallback |
| Query JSONB lenta | Indice parcial `idx_oauth_integrations_zapi_instance` |
| Nome `instance_token` vs `token` esquecido | Helper centralizado `mapToZApiConfig` faz o mapeamento unico |
| `updateZApiMetadata` sobrescreve metadata | Faz merge com metadata atual antes de atualizar |
| Deploy parcial (EF atualizada, frontend nao) | Deploy atomico: EF + frontend juntos |
| RLS de `oauth_integrations` nao cobre cenario | Verificar policies existentes cobrem `company_id` isolation |
