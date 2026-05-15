# Spec: Integracao Evolution API via Hub

**PRD:** [PRD.md](./PRD.md)
**Data:** 2026-05-14
**Status:** Aprovado

---

## Indice

1. [Migration SQL](#1-migration-sql)
2. [Tipos TypeScript](#2-tipos-typescript)
3. [Provider Evolution (backend)](#3-provider-evolution-backend)
4. [Edge Function: evolution-inbound](#4-edge-function-evolution-inbound)
5. [Edge Function: whatsapp-send (refactor de zapi-send)](#5-edge-function-whatsapp-send)
6. [Edge Function: sdr-ai (alteracoes)](#6-edge-function-sdr-ai-alteracoes)
7. [Edge Function: process-message-queue (alteracoes)](#7-edge-function-process-message-queue-alteracoes)
8. [Shared: lead-inbound-handler](#8-shared-lead-inbound-handler)
9. [Frontend: hooks e services](#9-frontend-hooks-e-services)
10. [Frontend: componentes](#10-frontend-componentes)
11. [Plano de fases e arquivos por fase](#11-plano-de-fases-e-arquivos-por-fase)

---

## 1. Migration SQL

**Arquivo:** `supabase/migrations/XXX_evolution_integration.sql`

```sql
-- =============================================================
-- Migration: Evolution API Integration
-- Adiciona colunas para multi-instancia WhatsApp via Evolution
-- =============================================================

-- 1. profiles: numero padrao do vendedor
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_whatsapp_instance TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.default_whatsapp_instance IS
  'instance_name da Evolution API. Texto livre, sem FK para Hub.';

-- 2. leads: instancia que originou a conversa + resumo de transfer
ALTER TABLE veltzy.leads
  ADD COLUMN IF NOT EXISTS whatsapp_instance_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS transfer_summary TEXT DEFAULT NULL;

COMMENT ON COLUMN veltzy.leads.whatsapp_instance_name IS
  'instance_name da Evolution que recebeu/iniciou esta conversa.';
COMMENT ON COLUMN veltzy.leads.transfer_summary IS
  'Resumo IA gerado quando SDR transfere lead para vendedor. Exibido no card do kanban e na notificacao.';

CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_instance
  ON veltzy.leads (company_id, whatsapp_instance_name)
  WHERE whatsapp_instance_name IS NOT NULL;

-- 3. pipelines: instancia do SDR + template de transfer
ALTER TABLE veltzy.pipelines
  ADD COLUMN IF NOT EXISTS sdr_instance_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sdr_transfer_message_template TEXT DEFAULT NULL;

COMMENT ON COLUMN veltzy.pipelines.sdr_instance_name IS
  'instance_name dedicada para AI SDR neste pipeline.';
COMMENT ON COLUMN veltzy.pipelines.sdr_transfer_message_template IS
  'Template da mensagem de transfer SDR->humano. Suporta {vendedor_nome}. Fallback hardcoded se null.';

-- 4. messages: instancia + delivery status
ALTER TABLE veltzy.messages
  ADD COLUMN IF NOT EXISTS instance_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'sent'
    CHECK (delivery_status IN ('sent', 'failed', 'pending'));

COMMENT ON COLUMN veltzy.messages.delivery_status IS
  'sent=entregue ao provider, failed=instancia offline/erro, pending=aguardando envio.';

CREATE INDEX IF NOT EXISTS idx_messages_delivery_failed
  ON veltzy.messages (company_id, delivery_status, created_at DESC)
  WHERE delivery_status = 'failed';

-- 5. message_queue: instancia para roteamento
ALTER TABLE veltzy.message_queue
  ADD COLUMN IF NOT EXISTS instance_name TEXT DEFAULT NULL;
```

**Notas:**
- `companies.active_whatsapp_provider` ja existe com default 'zapi'. Nao precisa de ALTER; apenas adicionar 'evolution' como valor aceito na logica da aplicacao.
- Todos os campos sao nullable e com defaults, entao a migration e segura para rodar em producao sem downtime.
- Nenhuma FK para tabelas do Hub (cross-database). `instance_name` e texto livre.

---

## 2. Tipos TypeScript

**Arquivo:** `src/types/database.ts`

### Alteracoes em interfaces existentes

```typescript
// --- Novos types ---

export type WhatsAppProviderType = 'zapi' | 'evolution'
export type DeliveryStatus = 'sent' | 'failed' | 'pending'

// --- Profile: adicionar campo ---
export interface Profile {
  // ... campos existentes ...
  default_whatsapp_instance: string | null  // NOVO
}

// --- Lead: adicionar campos ---
export interface Lead {
  // ... campos existentes ...
  whatsapp_instance_name: string | null  // NOVO
  transfer_summary: string | null         // NOVO
}

// --- Pipeline: adicionar campos ---
export interface Pipeline {
  // ... campos existentes ...
  sdr_instance_name: string | null                // NOVO
  sdr_transfer_message_template: string | null     // NOVO
}

// --- Message: adicionar campos ---
export interface Message {
  // ... campos existentes ...
  instance_name: string | null      // NOVO
  delivery_status: DeliveryStatus   // NOVO (default 'sent')
}

// --- SendMessagePayload: adicionar campo ---
export interface SendMessagePayload {
  // ... campos existentes ...
  instanceName?: string  // NOVO - usado quando admin/manager faz override
}
```

### Novas interfaces

```typescript
/** Payload que o Hub envia para evolution-inbound */
export interface EvolutionInboundPayload {
  company_id: string
  instance_name: string
  phone: string
  sender_name?: string
  message_id: string
  content: string
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document'
  media_url?: string
  media_mime_type?: string
  timestamp: string
  ad_context?: {
    ad_id?: string
    ad_title?: string
    source_url?: string
    ctwa_clid?: string
  }
}

/** Instancia Evolution retornada pelo Hub (para UI) */
export interface EvolutionInstance {
  instance_name: string
  company_id: string
  phone_number: string | null
  status: 'open' | 'close' | 'connecting'
  created_at: string
}
```

---

## 3. Provider Evolution (backend)

### 3.1 Novo provider

**Arquivo:** `supabase/functions/_shared/providers/evolution-hub.ts`

```typescript
import type { WhatsAppProvider, WhatsAppConfig, SendMessagePayload, StatusResult, QrCodeResult, ChatEntry } from '../whatsapp-provider.ts'

/**
 * Provider Evolution que envia via Edge Function do Hub (Supabase Central).
 * Veltzy nunca chama Evolution API diretamente (D1 locked).
 */
export class EvolutionHubProvider implements WhatsAppProvider {
  private hubUrl: string
  private hubServiceKey: string

  constructor() {
    this.hubUrl = Deno.env.get('HUB_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL')!
    this.hubServiceKey = Deno.env.get('HUB_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  }

  private async callHub(fnName: string, body: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`${this.hubUrl}/functions/v1/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.hubServiceKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Hub ${fnName} failed (${res.status}): ${text}`)
    }

    return res.json()
  }

  async sendMessage(_config: WhatsAppConfig, payload: SendMessagePayload & { instanceName?: string }): Promise<void> {
    const instanceName = payload.instanceName
    if (!instanceName) {
      throw new Error('instance_name obrigatorio para Evolution provider')
    }

    await this.callHub('evolution-send-message', {
      instance_name: instanceName,
      phone: payload.phone,
      content: payload.content,
      type: payload.type,
      media_url: payload.mediaUrl,
      file_name: payload.fileName,
    })
  }

  async getStatus(_config: WhatsAppConfig): Promise<StatusResult> {
    // Para Evolution, status e consultado on-demand via Hub
    // Nao implementado via provider pattern (UI chama Hub diretamente)
    return { connected: true }
  }

  async getQrCode(_config: WhatsAppConfig): Promise<QrCodeResult> {
    // QR code gerenciado no Hub, nao no Veltzy
    throw new Error('QR code gerenciado no Hub. Acesse o painel do Hub.')
  }

  async disconnect(_config: WhatsAppConfig): Promise<void> {
    throw new Error('Gerenciamento de instancias feito no Hub.')
  }

  async restart(_config: WhatsAppConfig): Promise<void> {
    throw new Error('Gerenciamento de instancias feito no Hub.')
  }

  async getProfilePicture(_config: WhatsAppConfig, _phone: string): Promise<string | null> {
    // Evolution pode nao suportar isso via Hub; retornar null
    return null
  }

  async getChats(_config: WhatsAppConfig): Promise<ChatEntry[]> {
    return []
  }
}
```

### 3.2 Atualizar whatsapp-provider.ts

**Arquivo:** `supabase/functions/_shared/whatsapp-provider.ts`

Alterar tipo:
```typescript
export type WhatsAppProviderType = 'zapi' | 'evolution'
// Removidos 'wuzapi' e 'revolution' que nunca foram implementados
```

### 3.3 Atualizar whatsapp-factory.ts

**Arquivo:** `supabase/functions/_shared/whatsapp-factory.ts`

```typescript
import type { WhatsAppProvider, WhatsAppProviderType } from './whatsapp-provider.ts'
import { ZApiProvider } from './providers/zapi.ts'
import { EvolutionHubProvider } from './providers/evolution-hub.ts'

const providers: Record<string, WhatsAppProvider> = {
  zapi: new ZApiProvider(),
  evolution: new EvolutionHubProvider(),
}

export function createProvider(provider: WhatsAppProviderType): WhatsAppProvider {
  const impl = providers[provider]
  if (!impl) throw new Error(`WhatsApp provider nao suportado: ${provider}`)
  return impl
}
```

### 3.4 Atualizar whatsapp-config.ts

**Arquivo:** `supabase/functions/_shared/whatsapp-config.ts`

Nova funcao helper:

```typescript
/**
 * Retorna o provider ativo da empresa: 'zapi' | 'evolution'
 */
export async function getActiveProvider(
  supabase: SupabaseClient,
  companyId: string,
): Promise<'zapi' | 'evolution'> {
  const { data } = await supabase
    .from('companies')
    .select('active_whatsapp_provider')
    .eq('id', companyId)
    .single()

  const provider = (data?.active_whatsapp_provider as string) ?? 'zapi'
  if (provider !== 'zapi' && provider !== 'evolution') {
    console.warn(`[getActiveProvider] Valor inesperado para active_whatsapp_provider: '${provider}' (company_id=${companyId}). Fallback para 'zapi'.`)
    return 'zapi'
  }
  return provider
}
```

### 3.5 Nova funcao shared: resolve-instance

**Arquivo:** `supabase/functions/_shared/resolve-instance.ts`

```typescript
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ResolveContext {
  leadId: string
  companyId: string
  userId?: string      // para buscar profile.default_whatsapp_instance
  pipelineId?: string  // para buscar pipeline.sdr_instance_name (SDR mode)
  mode: 'human' | 'sdr' | 'automation'
}

/**
 * Resolve qual instance_name usar para enviar mensagem.
 *
 * Prioridade:
 * 1. lead.whatsapp_instance_name (responde pelo mesmo numero que recebeu)
 * 2. Para SDR: pipeline.sdr_instance_name
 * 3. profile.default_whatsapp_instance do vendedor
 * 4. null (erro: vendedor sem numero)
 */
export async function resolveInstanceName(
  supabaseVeltzy: SupabaseClient,
  supabasePublic: SupabaseClient,
  ctx: ResolveContext,
): Promise<string | null> {
  // 1. Instancia do lead (responde pelo numero que recebeu)
  const { data: lead } = await supabaseVeltzy
    .from('leads')
    .select('whatsapp_instance_name, assigned_to, pipeline_id')
    .eq('id', ctx.leadId)
    .single()

  if (lead?.whatsapp_instance_name) {
    return lead.whatsapp_instance_name
  }

  // 2. SDR mode: usa instancia do pipeline
  if (ctx.mode === 'sdr') {
    const pipelineId = ctx.pipelineId ?? lead?.pipeline_id
    if (pipelineId) {
      const { data: pipeline } = await supabaseVeltzy
        .from('pipelines')
        .select('sdr_instance_name')
        .eq('id', pipelineId)
        .single()

      if (pipeline?.sdr_instance_name) {
        return pipeline.sdr_instance_name
      }
    }
  }

  // 3. Instancia do perfil do vendedor (humano ou fallback do SDR)
  const profileId = ctx.userId ?? lead?.assigned_to
  if (profileId) {
    const { data: profile } = await supabasePublic
      .from('profiles')
      .select('default_whatsapp_instance')
      .eq('id', profileId)
      .single()

    if (profile?.default_whatsapp_instance) {
      return profile.default_whatsapp_instance
    }
  }

  return null
}
```

---

## 4. Edge Function: evolution-inbound

**Arquivo:** `supabase/functions/evolution-inbound/index.ts`

Recebe mensagens do Hub (webhook normalizado). Substitui `zapi-webhook` para empresas com provider='evolution'.

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleInboundMessage } from '../_shared/lead-inbound-handler.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-secret',
}

interface EvolutionInboundPayload {
  company_id: string
  instance_name: string
  phone: string
  sender_name?: string
  message_id: string
  content: string
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document'
  media_url?: string
  media_mime_type?: string
  timestamp: string
  ad_context?: {
    ad_id?: string
    ad_title?: string
    source_url?: string
    ctwa_clid?: string
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validar shared secret
    const hubSecret = req.headers.get('x-hub-secret')
    const expectedSecret = Deno.env.get('HUB_WEBHOOK_SECRET')

    if (!hubSecret || hubSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const payload: EvolutionInboundPayload = await req.json()

    const url = Deno.env.get('SUPABASE_URL')!
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabasePublic = createClient(url, key)

    // 2. Verificar que empresa usa Evolution
    const { data: company } = await supabasePublic
      .from('companies')
      .select('active_whatsapp_provider')
      .eq('id', payload.company_id)
      .single()

    if (company?.active_whatsapp_provider !== 'evolution') {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'not_evolution' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Delegar para handler compartilhado
    const result = await handleInboundMessage({
      supabaseUrl: url,
      supabaseKey: key,
      companyId: payload.company_id,
      phone: payload.phone,
      senderName: payload.sender_name ?? null,
      content: payload.content,
      messageType: payload.message_type,
      externalId: payload.message_id,
      fileUrl: payload.media_url ?? null,
      fileName: null,
      fileMimeType: payload.media_mime_type ?? null,
      source: 'whatsapp',
      instanceName: payload.instance_name,
      adContext: payload.ad_context ?? null,
    })

    return new Response(JSON.stringify({ ok: true, leadId: result.leadId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[evolution-inbound] error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
```

**Config (supabase/config.toml):**
```toml
[functions.evolution-inbound]
verify_jwt = false
```

---

## 5. Edge Function: whatsapp-send

**Arquivo:** `supabase/functions/whatsapp-send/index.ts`

Refactor de `zapi-send`. Roteia entre Z-API e Evolution conforme `active_whatsapp_provider`.

**Mudancas em relacao ao `zapi-send` atual (`zapi-send/index.ts:1-116`):**

1. Apos obter `profile.company_id` (linha 47-51), buscar tambem `profile.default_whatsapp_instance` e `profile.id`
2. Chamar `getActiveProvider(supabasePublic, companyId)` para decidir fluxo
3. Se `'evolution'`:
   - Chamar `resolveInstanceName()` com mode='human'
   - Se `instanceName === null`: retornar erro 400
   - Instanciar `EvolutionHubProvider` e enviar com `instanceName`
   - Salvar mensagem com `instance_name` e `delivery_status`
4. Se `'zapi'`: fluxo atual sem mudanca
5. Wrapper try/catch no envio: se falhar, salvar mensagem com `delivery_status='failed'`

```typescript
// Pseudo-codigo das mudancas (delta em relacao a zapi-send/index.ts)

// Apos buscar profile (linha ~47):
const { data: profile } = await supabasePublic
  .from('profiles')
  .select('company_id, id, default_whatsapp_instance')
  .eq('user_id', user.id)
  .single()

// Apos buscar lead (linha ~57):
const activeProvider = await getActiveProvider(supabasePublic, profile.company_id)

let instanceName: string | null = null
let deliveryStatus: 'sent' | 'failed' = 'sent'

if (activeProvider === 'evolution') {
  // Override explicito do frontend (admin/manager)
  instanceName = payload.instanceName ?? null

  if (!instanceName) {
    instanceName = await resolveInstanceName(supabase, supabasePublic, {
      leadId: payload.leadId,
      companyId: profile.company_id,
      userId: profile.id,
      mode: 'human',
    })
  }

  if (!instanceName) {
    return new Response(JSON.stringify({
      error: 'Configure seu numero WhatsApp em Minha Conta para enviar mensagens.',
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    const provider = createProvider('evolution')
    await provider.sendMessage({} as WhatsAppConfig, {
      phone: lead.phone,
      content: payload.content,
      type: (payload.messageType ?? 'text') as 'text' | 'image' | 'audio' | 'video' | 'document',
      mediaUrl: payload.fileUrl,
      fileName: payload.fileName,
      instanceName,
    })
  } catch (err) {
    console.error('[whatsapp-send] Evolution send failed:', err)
    deliveryStatus = 'failed'
  }
} else {
  // Fluxo Z-API existente (linhas 68-81 do zapi-send atual)
  const config = await getWhatsAppConfig(supabasePublic, profile.company_id)
  if (config?.status === 'connected') {
    const provider = createProvider(config.provider)
    await provider.sendMessage(config, { /* payload atual */ })
  }
}

// Salvar mensagem (merge das linhas 83-98 do zapi-send):
const { data: message } = await supabase.from('messages').insert({
  lead_id: payload.leadId,
  company_id: profile.company_id,
  content: payload.content,
  sender_type: 'human',
  message_type: payload.messageType ?? 'text',
  file_url: payload.fileUrl ?? null,
  file_name: payload.fileName ?? null,
  file_mime_type: payload.mimeType ?? null,
  source: deliveryStatus === 'failed' ? 'manual' : 'whatsapp',
  replied_message_id: payload.repliedMessageId ?? null,
  instance_name: instanceName,        // NOVO
  delivery_status: deliveryStatus,    // NOVO
}).select().single()
```

**Nota:** `zapi-send` continua existindo como alias/redirect para `whatsapp-send` durante a migracao, para nao quebrar chamadas do `sdr-ai` e `process-message-queue` que referenciam `zapi-send`. Na Fase 3, atualizar todas as referencias.

**Config (supabase/config.toml):**
```toml
[functions.whatsapp-send]
verify_jwt = true
```

**Autenticacao dual:** `whatsapp-send` recebe chamadas de duas origens:
1. **Frontend (user JWT):** `supabase.functions.invoke('whatsapp-send', ...)` -- Supabase SDK injeta JWT do user no header Authorization. `verify_jwt = true` valida automaticamente. A funcao extrai `user.id` via `supabase.auth.getUser(token)` para buscar profile (fluxo existente do zapi-send, linhas 39-43).
2. **sdr-ai / process-message-queue (service role):** Chamam via `fetch()` com `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`. O service role key e um JWT valido que passa `verify_jwt = true`. A funcao detecta que e service role quando `getUser()` retorna o service user, e nesse caso aceita `senderType` do payload (ao inves de forcar 'human'). `sdr-ai` autentica assim:

```typescript
// Em sdr-ai, ao chamar whatsapp-send:
await fetch(`${url}/functions/v1/whatsapp-send`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, // JWT valido, passa verify_jwt
  },
  body: JSON.stringify({
    leadId,
    content: replyText,
    messageType: 'text',
    senderType: 'ai',        // aceito apenas com service role
    instanceName,
  }),
})
```

**Validacao no whatsapp-send:** Se `senderType` vier no payload mas o caller nao for service role, ignorar e forcar `senderType = 'human'` (defesa em profundidade).

---

## 6. Edge Function: sdr-ai (alteracoes)

**Arquivo:** `supabase/functions/sdr-ai/index.ts`

### 6.1 Mudancas no envio de reply (linhas 340-350)

Substituir chamada a `zapi-send` por `whatsapp-send`:

```typescript
// ANTES (linha 342):
await fetch(`${url}/functions/v1/zapi-send`, { ... })

// DEPOIS:
const activeProvider = await getActiveProvider(supabase, companyId)
let instanceName: string | null = null

if (activeProvider === 'evolution') {
  instanceName = await resolveInstanceName(supabaseVeltzy, supabase, {
    leadId,
    companyId,
    mode: 'sdr',
    pipelineId: lead.pipeline_id,
  })
}

// Salvar mensagem IA com instance_name e delivery_status
let deliveryStatus = 'sent'

await supabaseVeltzy.from('messages').insert({
  lead_id: leadId,
  company_id: companyId,
  content: replyText,
  sender_type: 'ai',
  message_type: 'text',
  source: 'whatsapp',
  instance_name: instanceName,                                     // NOVO
  delivery_status: instanceName ? 'pending' : 'failed',           // NOVO
})

// Enviar via whatsapp-send (best-effort)
if (instanceName || activeProvider === 'zapi') {
  try {
    await fetch(`${url}/functions/v1/whatsapp-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        leadId,
        content: replyText,
        messageType: 'text',
        instanceName,
      }),
    })
    // Atualizar delivery_status para 'sent' apos envio bem-sucedido
    // (whatsapp-send ja salva a mensagem, entao precisamos evitar duplicata)
    // NOTA: refatorar para que sdr-ai NAO salve mensagem separadamente;
    // whatsapp-send cuida de salvar. Apenas chamar whatsapp-send.
  } catch {
    deliveryStatus = 'failed'
  }
}
```

**REFACTOR CRITICO (obrigatorio na Fase 3):** Hoje `sdr-ai` salva a mensagem (linha 331 do sdr-ai/index.ts) E chama `zapi-send` que tambem salva (linhas 83-98 do zapi-send/index.ts). Ate agora isso causa duplicata silenciosa. **Na Fase 3, REMOVER o INSERT de mensagem do sdr-ai (linhas 331-338)** e delegar totalmente para `whatsapp-send`, que salva com `sender_type` controlado pelo campo `senderType` do payload. Checklist:
- [ ] Remover `supabaseVeltzy.from('messages').insert(...)` do bloco de auto-reply do sdr-ai
- [ ] Garantir que `whatsapp-send` aceita `senderType: 'ai'` no payload (apenas com service role)
- [ ] Testar que mensagem SDR aparece uma unica vez no inbox apos a mudanca

Para isso, adicionar campo `senderType` ao payload de `whatsapp-send`:

```typescript
// whatsapp-send aceita senderType opcional
interface SendPayload {
  leadId: string
  content: string
  messageType?: string
  fileUrl?: string
  fileName?: string
  mimeType?: string
  repliedMessageId?: string
  instanceName?: string      // NOVO
  senderType?: 'human' | 'ai'  // NOVO (default 'human')
}
```

### 6.2 Buscar pipeline_id do lead

Adicionar `pipeline_id` ao select do lead (linha 259-263):

```typescript
// ANTES:
.select('name, phone, email, temperature, ai_score, tags, deal_value')

// DEPOIS:
.select('name, phone, email, temperature, ai_score, tags, deal_value, pipeline_id')
```

### 6.3 Transfer SDR --> vendedor

Adicionar logica de transfer apos scoring (apos linha 305):

```typescript
// Apos atualizar lead com score e temperature:

// Verificar se IA decidiu transferir
if (parsed.transfer === true) {
  // Buscar dados necessarios
  const { data: leadFull } = await supabaseVeltzy
    .from('leads')
    .select('assigned_to, pipeline_id, name, phone')
    .eq('id', leadId)
    .single()

  if (leadFull?.assigned_to) {
    // Buscar nome do vendedor
    const { data: vendedor } = await supabase
      .from('profiles')
      .select('name, default_whatsapp_instance')
      .eq('id', leadFull.assigned_to)
      .single()

    // Buscar template de transfer do pipeline
    const { data: pipeline } = await supabaseVeltzy
      .from('pipelines')
      .select('sdr_instance_name, sdr_transfer_message_template')
      .eq('id', leadFull.pipeline_id)
      .single()

    const FALLBACK_TEMPLATE = 'Ola! A partir de agora voce sera atendido por {vendedor_nome}. Em breve ele entrara em contato.'
    const template = pipeline?.sdr_transfer_message_template ?? FALLBACK_TEMPLATE
    const transferMsg = template.replace(/\{vendedor_nome\}/g, vendedor?.name ?? 'nosso time')

    // Enviar mensagem de transfer pelo numero do SDR
    try {
      await fetch(`${url}/functions/v1/whatsapp-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          leadId,
          content: transferMsg,
          messageType: 'text',
          senderType: 'ai',
          instanceName: pipeline?.sdr_instance_name,
        }),
      })
    } catch { /* best-effort */ }

    // Desativar SDR, trocar instancia e salvar resumo no lead
    await supabaseVeltzy.from('leads').update({
      is_ai_active: false,
      whatsapp_instance_name: vendedor?.default_whatsapp_instance ?? null,
      transfer_summary: resumo,  // Salvar no lead para exibir no card do kanban
    }).eq('id', leadId)

    // Gerar resumo IA para o vendedor
    const { data: lastMessages } = await supabaseVeltzy
      .from('messages')
      .select('content, sender_type')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(5)

    let resumo = `${lastMessages?.length ?? 0} mensagens trocadas.`
    try {
      const summaryConfig = await getModelConfig(supabase, 'sdr-reply')
      const summaryResult = await callProvider(
        summaryConfig.provider, summaryConfig.model,
        [{
          role: 'user',
          content: `Resuma em 2-3 frases esta conversa entre SDR e lead. Foque no interesse do lead e proximos passos:\n\n${lastMessages?.reverse().map(m => `${m.sender_type}: ${m.content}`).join('\n')}`,
        }],
        0.3, false,
      )
      resumo = summaryResult.text

      await logUsage(supabase, companyId, 'sdr-transfer-summary', summaryConfig.provider, summaryConfig.model,
        summaryResult.tokensInput, summaryResult.tokensOutput, { lead_id: leadId })
    } catch { /* fallback: resumo simples */ }

    // Notificar vendedor
    await supabase.from('notifications').insert({
      company_id: companyId,
      user_id: (await supabase.from('profiles').select('user_id').eq('id', leadFull.assigned_to).single()).data?.user_id,
      type: 'lead_transferred',
      title: `Lead ${leadFull.name ?? leadFull.phone} transferido do SDR`,
      body: `Resumo: ${resumo}`,
      action_type: 'navigate',
      action_data: { path: `/inbox?lead=${leadId}`, lead_id: leadId, summary: resumo },
    })
  }
}
```

### 6.4 Atualizar system prompt para incluir flag transfer

```typescript
// ANTES (linha 22-31):
const SDR_SYSTEM_PROMPT = `...
Retorne APENAS JSON valido:
{
  "score": number,
  "temperature": "cold" | "warm" | "hot" | "fire",
  "reply": string | null,
  "reasoning": string
}`

// DEPOIS:
const SDR_SYSTEM_PROMPT = `...
Retorne APENAS JSON valido:
{
  "score": number,
  "temperature": "cold" | "warm" | "hot" | "fire",
  "reply": string | null,
  "transfer": boolean,
  "reasoning": string
}

Se o lead esta qualificado (score >= 80 e temperature "hot" ou "fire") e demonstrou
intencao clara de compra, set transfer=true para encaminhar a um vendedor humano.`
```

---

## 7. Edge Function: process-message-queue (alteracoes)

**Arquivo:** `supabase/functions/process-message-queue/index.ts`

### Mudancas

1. Buscar `instance_name` do item na query (linha 26-28):

```typescript
// ANTES:
.select('id, company_id, lead_id, content, message_type, file_url')

// DEPOIS:
.select('id, company_id, lead_id, content, message_type, file_url, instance_name')
```

2. Roteamento por provider (dentro do loop, apos linha 45):

```typescript
const activeProvider = await getActiveProvider(supabasePublic, item.company_id)

if (activeProvider === 'evolution') {
  const instanceName = item.instance_name
  if (!instanceName) {
    await supabase.from('message_queue')
      .update({ status: 'failed', error_message: 'No instance_name for Evolution' })
      .eq('id', item.id)
    failed++
    continue
  }

  const provider = createProvider('evolution')
  await provider.sendMessage({} as WhatsAppConfig, {
    phone: lead.phone,
    content: item.content,
    type: msgType,
    mediaUrl: item.file_url ?? undefined,
    instanceName,
  })
} else {
  // Fluxo Z-API existente (linhas 45-79)
  const config = await getWhatsAppConfig(supabasePublic, item.company_id, { status: 'connected' })
  if (!config) { /* ... falha ... */ }
  const provider = createProvider(config.provider)
  await provider.sendMessage(config, { /* ... */ })
}
```

3. Salvar mensagem com `instance_name` (apos linha 82):

```typescript
await supabase.from('messages').insert({
  lead_id: item.lead_id,
  company_id: item.company_id,
  content: item.content,
  sender_type: 'ai',
  message_type: msgType,
  file_url: item.file_url ?? null,
  source: 'whatsapp',
  instance_name: item.instance_name ?? null,  // NOVO
  delivery_status: 'sent',                     // NOVO
})
```

---

## 8. Shared: lead-inbound-handler

**Arquivo:** `supabase/functions/_shared/lead-inbound-handler.ts`

Logica compartilhada entre `zapi-webhook` e `evolution-inbound` para criar/atualizar lead e salvar mensagem.

Extrair das linhas 116-370 de `zapi-webhook/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface InboundParams {
  supabaseUrl: string
  supabaseKey: string
  companyId: string
  phone: string
  senderName: string | null
  content: string
  messageType: string
  externalId: string | null
  fileUrl: string | null
  fileName: string | null
  fileMimeType: string | null
  source: 'whatsapp' | 'instagram'
  instanceName: string | null        // NOVO: null para Z-API, preenchido para Evolution
  adContext: Record<string, unknown> | null
}

interface InboundResult {
  leadId: string
  isNewLead: boolean
}

export async function handleInboundMessage(params: InboundParams): Promise<InboundResult> {
  const supabase = createClient(params.supabaseUrl, params.supabaseKey, { db: { schema: 'veltzy' } })
  const supabasePublic = createClient(params.supabaseUrl, params.supabaseKey)

  // 1. Buscar/criar lead por (company_id, phone)
  let { data: lead } = await supabase
    .from('leads')
    .select('id, assigned_to, avatar_url, name, whatsapp_instance_name')
    .eq('company_id', params.companyId)
    .eq('phone', params.phone)
    .maybeSingle()

  // Atualizar nome se necessario
  if (lead && (!lead.name || lead.name.startsWith('Contato ')) && params.senderName) {
    await supabase.from('leads').update({ name: params.senderName }).eq('id', lead.id)
  }

  // Atualizar instance_name do lead se veio de instancia nova
  if (lead && params.instanceName && lead.whatsapp_instance_name !== params.instanceName) {
    await supabase.from('leads')
      .update({ whatsapp_instance_name: params.instanceName })
      .eq('id', lead.id)
  }

  const isNewLead = !lead

  if (!lead) {
    // Criar lead (logica extraida de zapi-webhook linhas 132-206)
    let { data: defaultPipeline } = await supabase
      .from('pipelines')
      .select('id')
      .eq('company_id', params.companyId)
      .eq('is_default', true)
      .maybeSingle()

    if (!defaultPipeline) {
      const { data: fallback } = await supabase
        .from('pipelines')
        .select('id')
        .eq('company_id', params.companyId)
        .eq('is_active', true)
        .order('position')
        .limit(1)
        .single()
      defaultPipeline = fallback
    }

    const { data: defaultStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('pipeline_id', defaultPipeline?.id)
      .order('position')
      .limit(1)
      .single()

    const { data: whatsappSource } = await supabase
      .from('lead_sources')
      .select('id')
      .eq('company_id', params.companyId)
      .eq('slug', 'whatsapp')
      .single()

    let assignedTo: string | null = null
    const { data: sellers } = await supabasePublic
      .from('profiles')
      .select('id')
      .eq('company_id', params.companyId)
      .eq('is_available', true)

    if (sellers && sellers.length > 0) {
      const idx = Math.floor(Math.random() * sellers.length)
      assignedTo = sellers[idx].id
    }

    const { data: newLead } = await supabase
      .from('leads')
      .insert({
        company_id: params.companyId,
        phone: params.phone,
        name: params.senderName,
        pipeline_id: defaultPipeline?.id,
        stage_id: defaultStage?.id,
        source_id: whatsappSource?.id,
        assigned_to: assignedTo,
        is_queued: !assignedTo,
        ad_context: params.adContext,
        whatsapp_instance_name: params.instanceName,  // NOVO
      })
      .select('id, assigned_to, avatar_url')
      .single()

    lead = newLead
  }

  if (!lead) throw new Error('Failed to create lead')

  // 2. Atualizar timestamp SLA
  await supabase
    .from('leads')
    .update({ last_customer_message_at: new Date().toISOString() })
    .eq('id', lead.id)

  // 3. Salvar mensagem
  const { data: savedMessage } = await supabase.from('messages').insert({
    lead_id: lead.id,
    company_id: params.companyId,
    content: params.content,
    sender_type: 'lead',
    message_type: params.messageType,
    file_url: params.fileUrl,
    file_name: params.fileName,
    file_mime_type: params.fileMimeType,
    source: params.source,
    external_id: params.externalId,
    instance_name: params.instanceName,  // NOVO
    delivery_status: 'sent',              // NOVO
  }).select('id').single()

  // 4. Transcricao de audio (async, nao bloqueia)
  if ((params.messageType === 'audio') && params.fileUrl && savedMessage?.id) {
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (openaiKey) {
      // Fire-and-forget (mesma logica de zapi-webhook linhas 273-306)
      transcribeAudio(supabase, params.fileUrl, savedMessage.id, openaiKey)
    }
  }

  // 5. Disparar SDR e automacoes (async, best-effort)
  const fnHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${params.supabaseKey}` }

  try {
    const { data: leadFull } = await supabase.from('leads').select('is_ai_active').eq('id', lead.id).single()
    if (leadFull?.is_ai_active) {
      fetch(`${params.supabaseUrl}/functions/v1/sdr-ai`, {
        method: 'POST',
        headers: fnHeaders,
        body: JSON.stringify({
          leadId: lead.id,
          companyId: params.companyId,
          messageContent: params.content,
          conversationHistory: [],
        }),
      }).catch(() => {})
    }
  } catch { /* best-effort */ }

  try {
    fetch(`${params.supabaseUrl}/functions/v1/run-automations`, {
      method: 'POST',
      headers: fnHeaders,
      body: JSON.stringify({
        trigger: isNewLead ? 'lead_created' : 'message_received',
        leadId: lead.id,
        companyId: params.companyId,
        triggerData: { messageContent: params.content, source: params.source },
      }),
    }).catch(() => {})
  } catch { /* best-effort */ }

  // 6. Auto-reply fora do horario (apenas para leads novos)
  if (isNewLead) {
    try {
      const { data: autoReplySetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('company_id', params.companyId)
        .eq('key', 'auto_reply_config')
        .maybeSingle()

      const arConfig = autoReplySetting?.value as {
        enabled?: boolean
        message?: string
        schedule?: { start: string; end: string; days: number[]; timezone: string }
      } | null

      if (arConfig?.enabled && arConfig.message && arConfig.schedule) {
        const now = new Date(new Date().toLocaleString('en', { timeZone: arConfig.schedule.timezone }))
        const day = now.getDay()
        const time = now.getHours() * 60 + now.getMinutes()
        const [startH, startM] = arConfig.schedule.start.split(':').map(Number)
        const [endH, endM] = arConfig.schedule.end.split(':').map(Number)
        const isOutside = !arConfig.schedule.days.includes(day) || time < startH * 60 + startM || time >= endH * 60 + endM

        if (isOutside) {
          await supabase.from('messages').insert({
            lead_id: lead.id,
            company_id: params.companyId,
            content: arConfig.message,
            sender_type: 'ai',
            message_type: 'text',
            source: params.source,
            instance_name: params.instanceName,
            delivery_status: 'sent',
          })
        }
      }
    } catch { /* best-effort */ }
  }

  return { leadId: lead.id, isNewLead }
}

async function transcribeAudio(
  supabase: ReturnType<typeof createClient>,
  audioUrl: string,
  messageId: string,
  openaiKey: string,
): Promise<void> {
  try {
    const audioResponse = await fetch(audioUrl)
    const audioBuffer = await audioResponse.arrayBuffer()

    const formData = new FormData()
    formData.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'audio.ogg')
    formData.append('model', 'whisper-1')
    formData.append('language', 'pt')

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}` },
      body: formData,
    })

    const result = await whisperResponse.json()
    if (result.text) {
      await supabase.from('messages').update({ content: result.text }).eq('id', messageId)
    }
  } catch (err) {
    console.error('Transcription failed:', err)
  }
}
```

---

## 9. Frontend: hooks e services

### 9.1 Novo service: evolution.service.ts

**Arquivo:** `src/services/evolution.service.ts`

```typescript
import { supabase } from '@/lib/supabase'
import type { EvolutionInstance } from '@/types/database'

const HUB_URL = import.meta.env.VITE_HUB_SUPABASE_URL

/**
 * Lista instancias Evolution da empresa (chama Hub on-demand).
 */
export async function getCompanyInstances(companyId: string): Promise<EvolutionInstance[]> {
  const { data: session } = await supabase.auth.getSession()
  if (!session?.session?.access_token) return []

  const res = await fetch(`${HUB_URL}/functions/v1/evolution-instance-manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.session.access_token}`,
    },
    body: JSON.stringify({ action: 'list', company_id: companyId }),
  })

  if (!res.ok) return []
  const data = await res.json()
  return data.instances ?? []
}

/**
 * Conta mensagens com delivery_status='failed' nos ultimos 7 dias.
 */
export async function getFailedMessageCount(companyId: string): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('delivery_status', 'failed')
    .gte('created_at', sevenDaysAgo)

  return count ?? 0
}
```

### 9.2 Novo hook: use-evolution-instances.ts

**Arquivo:** `src/hooks/use-evolution-instances.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { getCompanyInstances } from '@/services/evolution.service'
import { useAuth } from '@/hooks/use-auth'

export function useEvolutionInstances() {
  const { profile } = useAuth()
  const companyId = profile?.company_id

  return useQuery({
    queryKey: ['evolution-instances', companyId],
    queryFn: () => getCompanyInstances(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // cache 5 min (on-demand)
  })
}
```

### 9.3 Novo hook: use-failed-messages.ts

**Arquivo:** `src/hooks/use-failed-messages.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { getFailedMessageCount } from '@/services/evolution.service'
import { useAuth } from '@/hooks/use-auth'

export function useFailedMessages() {
  const { profile, role } = useAuth()
  const companyId = profile?.company_id
  const isAdminOrManager = role === 'admin' || role === 'manager' || role === 'super_admin'

  return useQuery({
    queryKey: ['failed-messages-count', companyId],
    queryFn: () => getFailedMessageCount(companyId!),
    enabled: !!companyId && isAdminOrManager,
    refetchInterval: 5 * 60 * 1000, // refetch a cada 5 min
  })
}
```

### 9.4 Alterar: messages.service.ts

**Arquivo:** `src/services/messages.service.ts`

Mudanca na funcao `routeMessage` (linhas 150-179):

```typescript
// ANTES (linha 159):
const { data, error } = await supabase.functions.invoke('zapi-send', { body: payload })

// DEPOIS:
const { data, error } = await supabase.functions.invoke('whatsapp-send', { body: payload })
```

Mudanca na funcao `isWhatsAppConnected` (linhas 112-121):

```typescript
// Adicionar suporte a Evolution
export const isWhatsAppConnected = async (companyId: string): Promise<boolean> => {
  // Verificar provider ativo
  const { data: company } = await supabase
    .from('companies')
    .select('active_whatsapp_provider')
    .eq('id', companyId)
    .single()

  const provider = company?.active_whatsapp_provider ?? 'zapi'

  if (provider === 'evolution') {
    // Para Evolution, consideramos "conectado" se empresa tem instancias
    // A validacao real acontece no backend ao enviar
    return true
  }

  // Fluxo Z-API existente
  const { data } = await supabase
    .from('oauth_integrations')
    .select('status')
    .eq('company_id', companyId)
    .eq('provider', 'zapi')
    .eq('status', 'connected')
    .maybeSingle()

  return !!data
}
```

### 9.5 Alterar: use-whatsapp-status.ts

**Arquivo:** `src/hooks/use-whatsapp-status.ts`

Adicionar campo `provider` ao retorno e logica para Evolution:

```typescript
export function useWhatsAppStatus() {
  const { profile } = useAuth()
  const companyId = profile?.company_id

  return useQuery({
    queryKey: ['whatsapp-status', companyId],
    queryFn: async () => {
      const { data: company } = await supabase
        .from('companies')
        .select('active_whatsapp_provider')
        .eq('id', companyId!)
        .single()

      const provider = company?.active_whatsapp_provider ?? 'zapi'

      if (provider === 'evolution') {
        return { provider: 'evolution' as const, connected: true }
      }

      // Fluxo Z-API existente
      const { data } = await supabase
        .from('oauth_integrations')
        .select('status')
        .eq('company_id', companyId!)
        .eq('provider', 'zapi')
        .maybeSingle()

      return {
        provider: 'zapi' as const,
        connected: data?.status === 'connected',
      }
    },
    enabled: !!companyId,
    refetchInterval: 2 * 60 * 1000,
  })
}
```

---

## 10. Frontend: componentes

### 10.1 conversation-list.tsx - Filtro por instancia

Adicionar seletor de instancia para admin/manager:

```tsx
// Dentro do header de filtros (apos status filter):
{isAdminOrManager && provider === 'evolution' && (
  <Select value={instanceFilter} onValueChange={setInstanceFilter}>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="Todos os numeros" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos os numeros</SelectItem>
      {instances.map(inst => (
        <SelectItem key={inst.instance_name} value={inst.instance_name}>
          {inst.phone_number
            ? `...${inst.phone_number.slice(-4)}`
            : inst.instance_name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

Filtro no hook `use-conversation-list.ts`:

```typescript
// Adicionar filtro por instancia (apenas admin/manager)
if (instanceFilter && instanceFilter !== 'all') {
  filtered = filtered.filter(c => c.whatsapp_instance_name === instanceFilter)
}

// Vendedor: sem filtro por instancia, ve todos os leads atribuidos (assigned_to)
// Logica existente ja cobre isso (linhas 27-30)
```

### 10.2 conversation-item.tsx - Badge de instancia

```tsx
// Apos o badge de source, se provider='evolution':
{lead.whatsapp_instance_name && provider === 'evolution' && (
  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
    {lead.whatsapp_instance_name.length > 8
      ? `...${lead.whatsapp_instance_name.slice(-4)}`
      : lead.whatsapp_instance_name}
  </span>
)}
```

### 10.3 chat-input.tsx - Bloqueio sem numero

```tsx
// Verificar se vendedor tem numero configurado
const { data: whatsappStatus } = useWhatsAppStatus()
const hasInstance = profile?.default_whatsapp_instance || whatsappStatus?.provider !== 'evolution'

// No JSX do input:
{!hasInstance ? (
  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground border-t">
    <AlertTriangle className="h-4 w-4 text-destructive" />
    <span>Configure seu numero WhatsApp em{' '}
      <Link to="/settings" className="underline text-primary">Minha Conta</Link>
      {' '}para enviar mensagens.
    </span>
  </div>
) : (
  // Input normal existente
)}
```

### 10.4 message-bubble.tsx - Indicador delivery_status='failed'

```tsx
// Ao lado do timestamp (linha ~86):
{message.delivery_status === 'failed' && (
  <Tooltip>
    <TooltipTrigger>
      <AlertTriangle className="h-3 w-3 text-destructive inline ml-1" />
    </TooltipTrigger>
    <TooltipContent>Mensagem nao entregue - instancia offline</TooltipContent>
  </Tooltip>
)}
```

### 10.5 chat-header.tsx - Indicador de instancia

```tsx
// Abaixo do nome do lead:
{provider === 'evolution' && lead.whatsapp_instance_name && (
  <div className="flex items-center gap-1 text-xs text-muted-foreground">
    <Phone className="h-3 w-3" />
    <span>{lead.whatsapp_instance_name}</span>
    {isAdminOrManager && (
      <InstanceOverrideDropdown
        instances={instances}
        current={lead.whatsapp_instance_name}
        onSelect={setOverrideInstance}
      />
    )}
  </div>
)}
```

### 10.6 Pipeline settings - SDR instance + transfer template

Adicionar ao modal de edicao de pipeline:

```tsx
// Campo: Numero WhatsApp do SDR
<FormField
  control={form.control}
  name="sdr_instance_name"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Numero WhatsApp do SDR</FormLabel>
      <Select value={field.value ?? ''} onValueChange={field.onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Usar numero do vendedor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Usar numero do vendedor</SelectItem>
          {instances.map(inst => (
            <SelectItem key={inst.instance_name} value={inst.instance_name}>
              {inst.phone_number ?? inst.instance_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormDescription>
        Numero dedicado que a IA usara para prospectar neste pipeline
      </FormDescription>
    </FormItem>
  )}
/>

// Campo: Template de mensagem de transfer
<FormField
  control={form.control}
  name="sdr_transfer_message_template"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Mensagem de transfer SDR</FormLabel>
      <Textarea
        {...field}
        value={field.value ?? ''}
        placeholder="Ola! A partir de agora voce sera atendido por {vendedor_nome}. Em breve ele entrara em contato."
      />
      <FormDescription>
        Mensagem enviada ao lead quando o SDR transfere para vendedor. Use {'{vendedor_nome}'} para inserir o nome.
      </FormDescription>
    </FormItem>
  )}
/>
```

### 10.7 Settings - Numero padrao do vendedor

Adicionar no perfil do usuario (settings page):

```tsx
// Se provider='evolution':
{provider === 'evolution' && (
  <FormField
    control={form.control}
    name="default_whatsapp_instance"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Numero WhatsApp padrao</FormLabel>
        <Select value={field.value ?? ''} onValueChange={field.onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione seu numero" />
          </SelectTrigger>
          <SelectContent>
            {instances.map(inst => (
              <SelectItem key={inst.instance_name} value={inst.instance_name}>
                {inst.phone_number ?? inst.instance_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormDescription>
          Numero que sera usado para enviar mensagens aos seus leads
        </FormDescription>
      </FormItem>
    )}
  />
)}
```

### 10.8 Integrations tab - Lista de instancias

Quando `provider='evolution'`, substituir card Z-API por lista de instancias:

```tsx
{provider === 'evolution' ? (
  <Card>
    <CardHeader>
      <CardTitle>WhatsApp (Evolution API)</CardTitle>
      <CardDescription>
        Instancias gerenciadas no Hub
      </CardDescription>
    </CardHeader>
    <CardContent>
      {isLoading ? <Skeleton className="h-20" /> : (
        <div className="space-y-2">
          {instances.map(inst => (
            <div key={inst.instance_name} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-2 w-2 rounded-full',
                  inst.status === 'open' ? 'bg-green-500' : 'bg-red-500'
                )} />
                <div>
                  <p className="text-sm font-medium">{inst.instance_name}</p>
                  <p className="text-xs text-muted-foreground">{inst.phone_number ?? 'Sem numero'}</p>
                </div>
              </div>
              <Badge variant={inst.status === 'open' ? 'default' : 'destructive'}>
                {inst.status === 'open' ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </CardContent>
    <CardFooter>
      <Button variant="outline" asChild>
        <a href={HUB_URL} target="_blank" rel="noopener">
          Gerenciar no Hub <ExternalLink className="h-4 w-4 ml-1" />
        </a>
      </Button>
    </CardFooter>
  </Card>
) : (
  // Card Z-API existente
)}
```

### 10.9 Alerta de mensagens nao entregues

No inbox header ou sidebar (visivel para admin/manager):

```tsx
const { data: failedCount } = useFailedMessages()

{failedCount && failedCount > 0 && (
  <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive text-sm rounded-lg">
    <AlertTriangle className="h-4 w-4" />
    <span>{failedCount} mensagem(ns) nao entregue(s) nos ultimos 7 dias</span>
  </div>
)}
```

---

## 11. Plano de fases e arquivos por fase

### Fase 1: Fundacao

| Acao | Arquivo | Tipo |
|------|---------|------|
| Migration SQL | `supabase/migrations/XXX_evolution_integration.sql` | Novo |
| Tipos TypeScript | `src/types/database.ts` | Editar |
| Provider Evolution | `supabase/functions/_shared/providers/evolution-hub.ts` | Novo |
| Atualizar provider type | `supabase/functions/_shared/whatsapp-provider.ts` | Editar |
| Registrar factory | `supabase/functions/_shared/whatsapp-factory.ts` | Editar |
| Helper getActiveProvider | `supabase/functions/_shared/whatsapp-config.ts` | Editar |
| Helper resolveInstanceName | `supabase/functions/_shared/resolve-instance.ts` | Novo |

**Criterio de aceite:** `npm run build` passa. Empresas existentes funcionam sem mudanca.

### Fase 2: Inbound

| Acao | Arquivo | Tipo |
|------|---------|------|
| Handler compartilhado | `supabase/functions/_shared/lead-inbound-handler.ts` | Novo |
| Edge Function evolution-inbound | `supabase/functions/evolution-inbound/index.ts` | Novo |
| Config toml | `supabase/config.toml` | Editar |
| (Opcional) Refatorar zapi-webhook para usar handler | `supabase/functions/zapi-webhook/index.ts` | Editar |

**Criterio de aceite:** Hub envia payload para `evolution-inbound`, lead criado com `whatsapp_instance_name`, mensagem salva com `instance_name`.

### Fase 3: Outbound

| Acao | Arquivo | Tipo |
|------|---------|------|
| whatsapp-send (refactor zapi-send) | `supabase/functions/whatsapp-send/index.ts` | Novo |
| Config toml | `supabase/config.toml` | Editar |
| Atualizar sdr-ai (envio) | `supabase/functions/sdr-ai/index.ts` | Editar |
| **REMOVER INSERT duplicado do sdr-ai** | `supabase/functions/sdr-ai/index.ts` (linhas 331-338) | Editar |
| Atualizar process-message-queue | `supabase/functions/process-message-queue/index.ts` | Editar |
| Atualizar routeMessage | `src/services/messages.service.ts` | Editar |

**Criterio de aceite:** Envio humano, SDR e automacao funcionam via Evolution para empresa de teste. Z-API continua funcionando para demais. Mensagem SDR aparece uma unica vez no inbox (sem duplicata).

### Fase 4: Frontend

| Acao | Arquivo | Tipo |
|------|---------|------|
| Service evolution | `src/services/evolution.service.ts` | Novo |
| Hook instances | `src/hooks/use-evolution-instances.ts` | Novo |
| Hook failed messages | `src/hooks/use-failed-messages.ts` | Novo |
| Atualizar whatsapp status hook | `src/hooks/use-whatsapp-status.ts` | Editar |
| Filtro instancia inbox | `src/components/inbox/conversation-list.tsx` | Editar |
| Badge instancia | `src/components/inbox/conversation-item.tsx` | Editar |
| Bloqueio sem numero | `src/components/inbox/chat-input.tsx` | Editar |
| Indicador failed | `src/components/inbox/message-bubble.tsx` | Editar |
| Indicador instancia | `src/components/inbox/chat-header.tsx` | Editar |
| Config pipeline SDR | `src/components/pipeline/pipeline-board.tsx` ou modal | Editar |
| Config numero vendedor | `src/components/settings/` | Editar |
| Integracao tab | `src/components/admin/integrations-tab.tsx` | Editar |
| Alerta failed | `src/components/inbox/` ou `src/components/layout/` | Editar |

**Criterio de aceite:** Admin ve instancias, filtra por numero. Vendedor ve bloqueio sem numero. Badge de instancia visivel. Alerta de falhas visivel.

### Fase 5: Transfer SDR

| Acao | Arquivo | Tipo |
|------|---------|------|
| Logica transfer no sdr-ai | `supabase/functions/sdr-ai/index.ts` | Editar |
| Atualizar system prompt | `supabase/functions/sdr-ai/index.ts` | Editar |
| Badge transfer no lead card | `src/components/pipeline/lead-card.tsx` | Editar |

**Criterio de aceite:** SDR qualifica lead, envia mensagem de transfer pelo numero do SDR, muda instancia do lead, notifica vendedor com resumo IA.

### Fase 6: Migracao

Nao tem codigo novo. Processo operacional:
1. Migrar empresa de teste
2. Validar 48h
3. Migrar empresas reais uma a uma
4. Apos todas migradas: remover `zapi.ts`, `zapi-webhook/`, `zapi-send/`

**Dados legados:** Mensagens e leads criados antes da migracao terao `instance_name = null` e `delivery_status = 'sent'` (defaults da migration). Isso e esperado e correto -- sao registros do periodo Z-API. O frontend DEVE tratar `instance_name = null` graciosamente:
- Badge de instancia: nao renderizar (nao mostrar "null" ou "desconhecido")
- Filtro por instancia: `instance_name = null` deve aparecer quando filtro e "Todos os numeros"
- Chat header: nao mostrar indicador de instancia quando null
- `lead.whatsapp_instance_name = null`: nao quebra resolveInstanceName (fallback para profile)
- `message.delivery_status = 'sent'` para mensagens antigas: correto, nao confundir com pending/failed

---

## Variaveis de ambiente necessarias

| Variavel | Onde | Descricao |
|----------|------|-----------|
| `HUB_SUPABASE_URL` | Edge Functions | URL do Supabase Central (Hub) |
| `HUB_SERVICE_ROLE_KEY` | Edge Functions | Service role key do Hub (para chamar evolution-send-message) |
| `HUB_WEBHOOK_SECRET` | Edge Functions | Shared secret para validar chamadas do Hub para evolution-inbound |
| `VITE_HUB_SUPABASE_URL` | Frontend | URL do Hub (para chamadas do frontend ao Hub) |
