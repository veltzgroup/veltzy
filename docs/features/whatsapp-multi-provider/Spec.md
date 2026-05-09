# Spec: WhatsApp Multi-Provider - Fase 1 (Abstração)

**PRD:** `docs/features/whatsapp-multi-provider/PRD.md`
**Escopo:** Abstração retrocompatível. Apenas Z-API. Zero mudança funcional.

---

## Objetivo

Extrair todo o acoplamento Z-API para trás de uma interface genérica `WhatsAppProvider`, de modo que adicionar WUZAPI ou Revolution no futuro seja apenas criar um novo arquivo em `_shared/providers/` sem tocar nas Edge Functions.

---

## Arquivos a Criar

### 1. `_shared/whatsapp-provider.ts`

Interface e tipos compartilhados. Nenhuma implementação.

```typescript
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Tipos ---

export type WhatsAppProviderType = 'zapi' | 'wuzapi' | 'revolution'

export interface WhatsAppConfig {
  id: string                    // oauth_integrations.id
  company_id: string
  provider: WhatsAppProviderType
  status: string                // connected | disconnected | connecting | error
  phone_number: string | null
  qr_code: string | null
  connected_at: string | null
  metadata: Record<string, unknown>  // provider-specific, nunca acessado diretamente fora do provider
}

export interface SendMessagePayload {
  phone: string
  content: string
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  mediaUrl?: string
  fileName?: string
}

export interface StatusResult {
  connected: boolean
  phoneNumber?: string
}

export interface QrCodeResult {
  qrCode: string
}

export interface ChatEntry {
  phone: string
  name?: string
  isGroup: boolean
}

// --- Interface ---

export interface WhatsAppProvider {
  sendMessage(config: WhatsAppConfig, payload: SendMessagePayload): Promise<void>
  getStatus(config: WhatsAppConfig): Promise<StatusResult>
  getQrCode(config: WhatsAppConfig): Promise<QrCodeResult>
  disconnect(config: WhatsAppConfig): Promise<void>
  restart(config: WhatsAppConfig): Promise<void>
  getProfilePicture(config: WhatsAppConfig, phone: string): Promise<string | null>
  getChats(config: WhatsAppConfig): Promise<ChatEntry[]>
}
```

**Regras:**
- Nenhum import de provider concreto
- Tipos exportados para uso em todas as Edge Functions
- `metadata` é opaco -- só o provider concreto interpreta

---

### 2. `_shared/providers/zapi.ts`

Implementação Z-API extraída de `zapi-config.ts`. Contém toda a lógica Z-API-specific.

```typescript
import type { WhatsAppProvider, WhatsAppConfig, SendMessagePayload, StatusResult, QrCodeResult, ChatEntry } from '../whatsapp-provider.ts'

export class ZApiProvider implements WhatsAppProvider {
  // --- Helpers internos (extraídos de zapi-config.ts) ---

  private buildUrl(config: WhatsAppConfig): string {
    const m = config.metadata
    const serverUrl = (m.server_url as string) ?? 'https://api.z-api.io'
    const instanceId = m.instance_id as string
    const token = m.token as string
    return `${serverUrl}/instances/${instanceId}/token/${token}`
  }

  private buildHeaders(config: WhatsAppConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Client-Token': (config.metadata.client_token as string) ?? '',
    }
  }

  // --- Interface WhatsAppProvider ---

  async sendMessage(config: WhatsAppConfig, payload: SendMessagePayload): Promise<void> {
    const baseUrl = this.buildUrl(config)
    const headers = this.buildHeaders(config)

    const endpoints: Record<string, string> = {
      text: '/send-text',
      image: '/send-image',
      audio: '/send-audio',
      video: '/send-video',
      document: '/send-document',
    }

    const body: Record<string, unknown> = { phone: payload.phone }
    if (payload.type === 'text') {
      body.message = payload.content
    } else {
      body.caption = payload.content
      if (payload.type === 'image') body.image = payload.mediaUrl
      if (payload.type === 'audio') body.audio = payload.mediaUrl
      if (payload.type === 'video') body.video = payload.mediaUrl
      if (payload.type === 'document') {
        body.document = payload.mediaUrl
        body.fileName = payload.fileName
      }
    }

    const res = await fetch(`${baseUrl}${endpoints[payload.type] ?? '/send-text'}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok || data.error) {
      throw new Error(`Z-API error: ${data.error ?? res.status}`)
    }
  }

  async getStatus(config: WhatsAppConfig): Promise<StatusResult> {
    const res = await fetch(`${this.buildUrl(config)}/status`, {
      headers: { 'Client-Token': (config.metadata.client_token as string) ?? '' },
    })
    const data = await res.json()
    return {
      connected: data.connected === true,
      phoneNumber: data.phoneNumber ?? undefined,
    }
  }

  async getQrCode(config: WhatsAppConfig): Promise<QrCodeResult> {
    const res = await fetch(`${this.buildUrl(config)}/qr-code`, {
      headers: { 'Client-Token': (config.metadata.client_token as string) ?? '' },
    })
    const data = await res.json()
    return { qrCode: data.value }
  }

  async disconnect(config: WhatsAppConfig): Promise<void> {
    await fetch(`${this.buildUrl(config)}/disconnect`, {
      method: 'POST',
      headers: { 'Client-Token': (config.metadata.client_token as string) ?? '' },
    })
  }

  async restart(config: WhatsAppConfig): Promise<void> {
    await fetch(`${this.buildUrl(config)}/restart`, {
      method: 'POST',
      headers: { 'Client-Token': (config.metadata.client_token as string) ?? '' },
    })
  }

  async getProfilePicture(config: WhatsAppConfig, phone: string): Promise<string | null> {
    const res = await fetch(
      `${this.buildUrl(config)}/profile-picture?phone=${phone}`,
      { headers: { 'Client-Token': (config.metadata.client_token as string) ?? '' } },
    )
    const data = await res.json()
    return data?.link ?? data?.value ?? null
  }

  async getChats(config: WhatsAppConfig): Promise<ChatEntry[]> {
    const res = await fetch(`${this.buildUrl(config)}/chats`, {
      headers: { 'Client-Token': (config.metadata.client_token as string) ?? '' },
    })
    const data = await res.json() as Array<{ phone: string; name?: string; isGroup: boolean }>
    return data.map((c) => ({
      phone: c.phone,
      name: c.name,
      isGroup: c.isGroup,
    }))
  }
}
```

**Regras:**
- Toda lógica Z-API (URL building, headers, mapping de response) fica AQUI
- Nenhuma Edge Function deve importar deste arquivo diretamente
- Acessa `config.metadata` para campos Z-API-specific (instance_id, token, client_token, server_url)

---

### 3. `_shared/whatsapp-config.ts`

Resolução de config e CRUD de metadata. Substitui `zapi-config.ts`.

```typescript
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { WhatsAppConfig, WhatsAppProviderType } from './whatsapp-provider.ts'

// --- Mapear row do banco para WhatsAppConfig ---

function mapRow(row: {
  id: string
  company_id: string
  provider: string
  status: string
  metadata: Record<string, unknown>
}): WhatsAppConfig {
  const m = row.metadata ?? {}
  return {
    id: row.id,
    company_id: row.company_id,
    provider: row.provider as WhatsAppProviderType,
    status: row.status,
    phone_number: (m.phone_number as string) ?? null,
    qr_code: (m.qr_code as string) ?? null,
    connected_at: (m.connected_at as string) ?? null,
    metadata: m,
  }
}

// --- Buscar config por company ---

export async function getWhatsAppConfig(
  supabase: SupabaseClient,
  companyId: string,
  extraFilters?: { status?: string },
): Promise<WhatsAppConfig | null> {
  // Resolve provider ativo da empresa
  const { data: company } = await supabase
    .from('companies')
    .select('active_whatsapp_provider')
    .eq('id', companyId)
    .single()

  const provider = (company?.active_whatsapp_provider as string) ?? 'zapi'

  let query = supabase
    .from('oauth_integrations')
    .select('id, company_id, provider, status, metadata')
    .eq('company_id', companyId)
    .eq('provider', provider)

  if (extraFilters?.status) {
    query = query.eq('status', extraFilters.status)
  }

  const { data } = await query.maybeSingle()
  if (!data) return null

  return mapRow(data)
}

// --- Buscar config por instance_id (usado pelo webhook Z-API) ---

export async function getWhatsAppConfigByInstanceId(
  supabase: SupabaseClient,
  instanceId: string,
): Promise<WhatsAppConfig | null> {
  const { data } = await supabase
    .from('oauth_integrations')
    .select('id, company_id, provider, status, metadata')
    .eq('metadata->>instance_id', instanceId)
    .maybeSingle()

  if (!data) return null
  return mapRow(data)
}

// --- Listar todas as configs conectadas (para health check) ---

export async function getAllConnectedConfigs(
  supabase: SupabaseClient,
): Promise<WhatsAppConfig[]> {
  const { data } = await supabase
    .from('oauth_integrations')
    .select('id, company_id, provider, status, metadata')
    .in('provider', ['zapi', 'wuzapi', 'revolution'])
    .eq('status', 'connected')

  if (!data) return []
  return data.map(mapRow)
}

// --- Atualizar metadata ---

export async function updateWhatsAppMetadata(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Pick<WhatsAppConfig, 'status' | 'phone_number' | 'qr_code' | 'connected_at'>>,
): Promise<void> {
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
```

**Regras:**
- `getWhatsAppConfig` consulta `companies.active_whatsapp_provider` para saber qual provider buscar
- Fallback para `'zapi'` se coluna for null
- `getAllConnectedConfigs` busca TODOS os providers (não só zapi) para health check futuro
- `getWhatsAppConfigByInstanceId` mantém busca por `metadata->>instance_id` (usado pelo webhook Z-API)
- `updateWhatsAppMetadata` é provider-agnostic (atualiza campos comuns no metadata)

---

### 4. `_shared/whatsapp-factory.ts`

Factory que instancia o provider correto.

```typescript
import type { WhatsAppProvider, WhatsAppProviderType } from './whatsapp-provider.ts'
import { ZApiProvider } from './providers/zapi.ts'

const providers: Record<string, WhatsAppProvider> = {
  zapi: new ZApiProvider(),
  // wuzapi: new WuzApiProvider(),     // Fase 2
  // revolution: new RevolutionProvider(), // Fase 3
}

export function createProvider(provider: WhatsAppProviderType): WhatsAppProvider {
  const impl = providers[provider]
  if (!impl) throw new Error(`WhatsApp provider nao suportado: ${provider}`)
  return impl
}
```

**Regras:**
- Instâncias são singletons (stateless, reutilizáveis)
- Adicionar novo provider = 1 import + 1 linha no map
- Throw explícito se provider desconhecido

---

### 5. `_shared/zapi-config.ts` (deprecated)

Re-exporta tudo da nova interface para retrocompatibilidade. Nenhuma Edge Function deve precisar disso após a migração, mas mantém para segurança.

```typescript
// @deprecated - Use whatsapp-config.ts e whatsapp-factory.ts
// Mantido apenas para retrocompatibilidade durante a migração

export { getWhatsAppConfig as getZApiConfigByCompany } from './whatsapp-config.ts'
export { getWhatsAppConfigByInstanceId as getZApiConfigByInstanceId } from './whatsapp-config.ts'
export { getAllConnectedConfigs as getAllConnectedZApiConfigs } from './whatsapp-config.ts'
export { updateWhatsAppMetadata as updateZApiMetadata } from './whatsapp-config.ts'
export type { WhatsAppConfig as ZApiConfig } from './whatsapp-provider.ts'

// buildZApiUrl e buildZApiHeaders não são mais exportados
// Use createProvider(config.provider).sendMessage() etc.
```

**Nota:** Os tipos de retorno mudaram ligeiramente (ex: `ZApiConfig` agora é `WhatsAppConfig` com campo `provider`). Os campos `instance_id`, `instance_token`, `client_token`, `server_url` que antes eram top-level agora estão dentro de `metadata`. As Edge Functions migradas não usarão mais esses campos diretamente.

---

## Migração das Edge Functions

### Padrão geral de migração

**Antes:**
```typescript
import { getZApiConfigByCompany, buildZApiUrl, buildZApiHeaders } from '../_shared/zapi-config.ts'
// ...
const config = await getZApiConfigByCompany(supabase, companyId)
const baseUrl = buildZApiUrl(config)
const headers = buildZApiHeaders(config)
await fetch(`${baseUrl}/send-text`, { method: 'POST', headers, body: ... })
```

**Depois:**
```typescript
import { getWhatsAppConfig } from '../_shared/whatsapp-config.ts'
import { createProvider } from '../_shared/whatsapp-factory.ts'
import type { WhatsAppConfig } from '../_shared/whatsapp-provider.ts'
// ...
const config = await getWhatsAppConfig(supabase, companyId)
const provider = createProvider(config.provider)
await provider.sendMessage(config, { phone, content, type: 'text' })
```

---

### 5a. zapi-send

**Imports:** Trocar `zapi-config` por `whatsapp-config` + `whatsapp-factory`

**Mudanças:**
- `getZApiConfigByCompany(supabasePublic, companyId)` → `getWhatsAppConfig(supabasePublic, companyId)`
- Bloco inteiro de `buildZApiUrl` + `endpoints` + `fetch` (linhas 70-105) → `provider.sendMessage(config, payload)`
- Checar `config?.status === 'connected'` permanece igual
- Resultado da mensagem (insert no banco) permanece igual

**Linhas afetadas:** 2, 67-105

---

### 5b. zapi-webhook

**Imports:** Trocar `zapi-config` por `whatsapp-config` + `whatsapp-factory`

**Mudanças:**
- `getZApiConfigByInstanceId(supabasePublic, instanceId)` → `getWhatsAppConfigByInstanceId(supabasePublic, instanceId)`
- `updateZApiMetadata(supabasePublic, config.id, ...)` → `updateWhatsAppMetadata(supabasePublic, config.id, ...)`
- Bloco de foto de perfil (linhas 206-243): `fetch(buildZApiUrl(config)/profile-picture...)` → `provider.getProfilePicture(config, phone)`
- Auth Z-API específica (`z-api-token` header, linhas 69-74) permanece (webhook é Z-API-specific)

**Nota:** Esta function continua sendo Z-API-specific (recebe payload Z-API). Webhooks de outros providers serão functions separadas (Fase 2/3). Mesmo assim, usamos a interface para `getProfilePicture` e `updateWhatsAppMetadata`.

**Linhas afetadas:** 2, 70-74, 206-243, 247-249

---

### 5c. whatsapp-manager

**Imports:** Trocar `zapi-config` por `whatsapp-config` + `whatsapp-factory`

**Mudanças:**
- `getZApiConfigByCompany` → `getWhatsAppConfig`
- `updateZApiMetadata` → `updateWhatsAppMetadata`
- Action `status`: `fetch(baseUrl/status)` → `provider.getStatus(config)` + `updateWhatsAppMetadata`
- Action `qrcode`: `fetch(baseUrl/qr-code)` → `provider.getQrCode(config)` + `updateWhatsAppMetadata`
- Action `disconnect`: `fetch(baseUrl/disconnect)` → `provider.disconnect(config)` + `updateWhatsAppMetadata`
- Action `restart`: `fetch(baseUrl/restart)` → `provider.restart(config)`

**Linhas afetadas:** 2, 28, 34-78 (praticamente toda a lógica)

---

### 5d. check-whatsapp-health

**Imports:** Trocar `zapi-config` por `whatsapp-config` + `whatsapp-factory`

**Mudanças:**
- `getAllConnectedZApiConfigs` → `getAllConnectedConfigs`
- Loop: `fetch(buildZApiUrl(config)/status)` → `provider.getStatus(config)` (usando `createProvider(config.provider)` para cada config, pois podem ser providers diferentes)
- `updateZApiMetadata` → `updateWhatsAppMetadata`

**Linhas afetadas:** 2, 20, 34-48, 51

---

### 5e. process-message-queue

**Imports:** Trocar `zapi-config` por `whatsapp-config` + `whatsapp-factory`

**Mudanças:**
- `getZApiConfigByCompany(supabasePublic, companyId, { status: 'connected' })` → `getWhatsAppConfig(supabasePublic, companyId, { status: 'connected' })`
- Bloco inteiro de `buildZApiUrl` + `endpoints` + `fetch` (linhas 73-103) → `provider.sendMessage(config, { phone, content, type })`

**Linhas afetadas:** 2, 45, 73-103

---

### 5f. fix-lead-names

**Imports:** Trocar `zapi-config` por `whatsapp-config` + `whatsapp-factory`

**Mudanças:**
- `getZApiConfigByCompany(supabasePublic, companyId, { status: 'connected' })` → `getWhatsAppConfig(supabasePublic, companyId, { status: 'connected' })`
- `fetch(buildZApiUrl(config)/chats)` (linhas 30-33) → `provider.getChats(config)`
- Mensagem de erro `'Z-API nao configurada ou desconectada'` → `'WhatsApp nao configurado ou desconectado'`

**Linhas afetadas:** 2, 21-26, 30-48

---

## Estrutura final de arquivos

```
supabase/functions/_shared/
  whatsapp-provider.ts     # NOVO - Interface + tipos
  whatsapp-config.ts       # NOVO - getWhatsAppConfig, updateWhatsAppMetadata, etc.
  whatsapp-factory.ts      # NOVO - createProvider()
  providers/
    zapi.ts                # NOVO - ZApiProvider implements WhatsAppProvider
  zapi-config.ts           # DEPRECATED - re-exports da nova interface
```

---

## Ordem de implementação

1. Criar `_shared/whatsapp-provider.ts` (sem dependências)
2. Criar `_shared/providers/zapi.ts` (depende de 1)
3. Criar `_shared/whatsapp-config.ts` (depende de 1)
4. Criar `_shared/whatsapp-factory.ts` (depende de 1, 2)
5. Substituir `_shared/zapi-config.ts` por re-exports (depende de 3)
6. Migrar Edge Functions uma a uma:
   - `whatsapp-manager` (mais simples, testa todos os métodos)
   - `check-whatsapp-health` (testa `getAllConnectedConfigs`)
   - `zapi-send` (testa `sendMessage`)
   - `process-message-queue` (mesmo padrão do zapi-send)
   - `fix-lead-names` (testa `getChats`)
   - `zapi-webhook` (mais complexa, testa `getProfilePicture`)

---

## Critérios de aceite

1. **Build:** Todas as 6 Edge Functions devem buildar sem erro (`supabase functions serve` sem falha de import)
2. **Retrocompatibilidade:** Comportamento 100% idêntico ao atual com `active_whatsapp_provider = 'zapi'`
3. **Zero mudança funcional:** Envio de mensagem, webhook, status, QR code, health check, foto de perfil, listagem de chats -- tudo funciona igual
4. **Imports limpos:** Nenhuma Edge Function importa de `providers/zapi.ts` diretamente; todas usam `whatsapp-config.ts` + `whatsapp-factory.ts`
5. **zapi-config.ts deprecated:** Arquivo existe com re-exports, nenhuma Edge Function o importa

---

## Fora de escopo (Fase 1)

- Implementação de WuzApiProvider ou RevolutionProvider
- Webhooks novos (wuzapi-webhook, revolution-webhook)
- Migrations de banco
- UI no frontend
- Deploy (será feito após testes manuais)
