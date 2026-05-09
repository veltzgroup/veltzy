# PRD: WhatsApp Multi-Provider

## Contexto

O Veltzy hoje usa **exclusivamente Z-API** para WhatsApp. O Hub já gerencia qual provider está ativo via `companies.active_whatsapp_provider` (valores: `zapi`, `wuzapi`, `revolution`). Credenciais ficam em `public.oauth_integrations.metadata`.

Precisamos abstrair o acesso ao WhatsApp para que trocar de provider seja uma mudança de configuração (sem redeploy).

---

## Estado Atual

### Coluna active_whatsapp_provider
- Existe em `public.companies` (tipo `text`)
- Valores atuais: ambas as empresas ativas usam `'zapi'`

### oauth_integrations
| Coluna | Tipo | Nota |
|--------|------|------|
| id | uuid | PK |
| company_id | uuid | FK companies |
| provider | text | `'zapi'` (unico hoje) |
| status | text | `connected / disconnected / connecting / error` |
| metadata | jsonb | Credenciais provider-specific |
| access_token | text | Não usado pelo Z-API |
| refresh_token | text | Não usado pelo Z-API |

**Metadata Z-API atual:**
```json
{
  "instance_id": "...",
  "token": "...",
  "client_token": "...",
  "server_url": "https://api.z-api.io",
  "phone_number": "...",
  "qr_code": "...",
  "connected_at": "..."
}
```

### Shared Config
`supabase/functions/_shared/zapi-config.ts` (125 linhas)

Exports:
| Função | O que faz |
|--------|-----------|
| `getZApiConfigByCompany(supabase, companyId)` | Busca config filtrando `provider='zapi'` |
| `getZApiConfigByInstanceId(supabase, instanceId)` | Busca config por `metadata->>instance_id` |
| `getAllConnectedZApiConfigs(supabase)` | Lista todas conectadas (para health check) |
| `updateZApiMetadata(supabase, id, updates)` | Atualiza status/qr_code/phone/connected_at |
| `buildZApiUrl(config)` | `{server_url}/instances/{instance_id}/token/{token}` |
| `buildZApiHeaders(config)` | `{ Content-Type, Client-Token }` |

### Edge Functions consumidoras

| # | Function | Usa de zapi-config.ts | Endpoints Z-API chamados |
|---|----------|----------------------|--------------------------|
| 1 | **zapi-send** | `getZApiConfigByCompany`, `buildZApiUrl`, `buildZApiHeaders` | `POST /send-text`, `POST /send-image`, `POST /send-audio`, `POST /send-video`, `POST /send-document` |
| 2 | **zapi-webhook** | `getZApiConfigByInstanceId`, `updateZApiMetadata`, `buildZApiUrl` | `GET /profile-picture?phone=X` |
| 3 | **whatsapp-manager** | `getZApiConfigByCompany`, `updateZApiMetadata`, `buildZApiUrl` | `GET /status`, `GET /qr-code`, `POST /disconnect`, `POST /restart` |
| 4 | **check-whatsapp-health** | `getAllConnectedZApiConfigs`, `updateZApiMetadata`, `buildZApiUrl` | `GET /status` |
| 5 | **process-message-queue** | `getZApiConfigByCompany`, `buildZApiUrl`, `buildZApiHeaders` | `POST /send-text`, `POST /send-image`, etc. |
| 6 | **fix-lead-names** | `getZApiConfigByCompany`, `buildZApiUrl` | `GET /chats` |

### Operações abstraíveis

Consolidando os endpoints, as operações que o Veltzy faz são:

| Operação | Z-API endpoint | Usada em |
|----------|----------------|----------|
| **sendText** | `POST /send-text` | zapi-send, process-message-queue |
| **sendMedia** | `POST /send-{image,audio,video,document}` | zapi-send, process-message-queue |
| **getStatus** | `GET /status` | whatsapp-manager, check-whatsapp-health |
| **getQrCode** | `GET /qr-code` | whatsapp-manager |
| **disconnect** | `POST /disconnect` | whatsapp-manager |
| **restart** | `POST /restart` | whatsapp-manager |
| **getProfilePicture** | `GET /profile-picture?phone=X` | zapi-webhook |
| **getChats** | `GET /chats` | fix-lead-names |

---

## APIs dos Providers

### Z-API (atual)
- **Base URL:** `{server_url}/instances/{instance_id}/token/{token}`
- **Auth:** Header `Client-Token: {client_token}`
- **Status:** `GET /status` → `{ connected: boolean, phoneNumber: string }`
- **QR Code:** `GET /qr-code` → `{ value: string }`
- **Envio texto:** `POST /send-text` body `{ phone, message }`
- **Envio mídia:** `POST /send-{type}` body `{ phone, caption, [type]: url }`
- **Desconectar:** `POST /disconnect`
- **Reiniciar:** `POST /restart`
- **Foto perfil:** `GET /profile-picture?phone=X` → `{ link: string }`
- **Listar chats:** `GET /chats` → `[{ phone, name, isGroup }]`

### WUZAPI
- **Base URL:** `{server_url}`
- **Auth:** Header `Authorization: Bearer {token}`
- **Status:** `GET /status` → `{ connected: boolean, phone: string }`
- **QR Code:** `GET /qrcode` → `{ qrcode: string }` (base64)
- **Envio texto:** `POST /chat/send/text` body `{ phone, body }`
- **Envio mídia:** `POST /chat/send/media` body `{ phone, type, media_url, caption }`
- **Desconectar:** `POST /user/disconnect`
- **Reiniciar:** `POST /user/reconnect`
- **Foto perfil:** `GET /user/info?phone=X` → `{ picture_url: string }`
- **Listar chats:** `GET /chat/list` → `[{ jid, name, isGroup }]`
- **Webhook:** Payload unificado `{ event, data: { phone, message, type, ... } }`

### Revolution API
- **Base URL:** `{api_url}`
- **Auth:** Header `Authorization: Bearer {token}`
- **Instance:** Identificada por `instance_id` no path
- **Status:** `GET /instance/{instance_id}/status` → `{ status: 'open'|'close', number: string }`
- **QR Code:** `GET /instance/{instance_id}/qrcode` → `{ base64: string }`
- **Envio texto:** `POST /message/sendText/{instance_id}` body `{ number, text }`
- **Envio mídia:** `POST /message/sendMedia/{instance_id}` body `{ number, mediatype, media, caption }`
- **Desconectar:** `DELETE /instance/{instance_id}/logout`
- **Reiniciar:** `POST /instance/{instance_id}/restart`
- **Foto perfil:** `GET /chat/fetchProfilePictureUrl/{instance_id}?number=X` → `{ profilePictureUrl: string }`
- **Listar chats:** `GET /chat/findChats/{instance_id}` → `[{ id, name, isGroup }]`
- **Webhook:** Payload: `{ event, instance, data: { key, message, ... } }`

---

## Metadata por provider em oauth_integrations

### Z-API
```json
{
  "instance_id": "...",
  "token": "...",
  "client_token": "...",
  "server_url": "https://api.z-api.io",
  "phone_number": "...",
  "qr_code": "...",
  "connected_at": "..."
}
```

### WUZAPI
```json
{
  "token": "...",
  "server_url": "https://wuzapi.example.com",
  "phone_number": "...",
  "qr_code": "...",
  "connected_at": "..."
}
```

### Revolution
```json
{
  "instance_id": "...",
  "token": "...",
  "api_url": "https://api.revolution.example.com",
  "phone_number": "...",
  "qr_code": "...",
  "connected_at": "..."
}
```

---

## Proposta de Arquitetura

### Nova interface WhatsAppProvider

```typescript
// _shared/whatsapp-provider.ts

interface WhatsAppConfig {
  id: string              // oauth_integrations.id
  company_id: string
  provider: 'zapi' | 'wuzapi' | 'revolution'
  status: string
  phone_number: string | null
  qr_code: string | null
  connected_at: string | null
  metadata: Record<string, unknown>
}

interface SendMessagePayload {
  phone: string
  content: string
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  mediaUrl?: string
  fileName?: string
}

interface WhatsAppProvider {
  sendMessage(config: WhatsAppConfig, payload: SendMessagePayload): Promise<void>
  getStatus(config: WhatsAppConfig): Promise<{ connected: boolean; phoneNumber?: string }>
  getQrCode(config: WhatsAppConfig): Promise<{ qrCode: string }>
  disconnect(config: WhatsAppConfig): Promise<void>
  restart(config: WhatsAppConfig): Promise<void>
  getProfilePicture(config: WhatsAppConfig, phone: string): Promise<string | null>
  getChats(config: WhatsAppConfig): Promise<Array<{ phone: string; name?: string; isGroup: boolean }>>
}
```

### Factory

```typescript
// _shared/whatsapp-factory.ts

function createProvider(provider: string): WhatsAppProvider {
  switch (provider) {
    case 'zapi': return new ZApiProvider()
    case 'wuzapi': return new WuzApiProvider()
    case 'revolution': return new RevolutionProvider()
    default: throw new Error(`Provider nao suportado: ${provider}`)
  }
}
```

### Resolução de config

```typescript
// _shared/whatsapp-config.ts (substitui zapi-config.ts)

async function getWhatsAppConfig(
  supabase: SupabaseClient,
  companyId: string,
  extraFilters?: { status?: string }
): Promise<WhatsAppConfig | null> {
  // 1. Busca active_whatsapp_provider da company
  const { data: company } = await supabase
    .from('companies')
    .select('active_whatsapp_provider')
    .eq('id', companyId)
    .single()

  const provider = company?.active_whatsapp_provider ?? 'zapi'

  // 2. Busca oauth_integration para esse provider
  let query = supabase
    .from('oauth_integrations')
    .select('*')
    .eq('company_id', companyId)
    .eq('provider', provider)

  if (extraFilters?.status) {
    query = query.eq('status', extraFilters.status)
  }

  const { data } = await query.maybeSingle()
  if (!data) return null

  return mapToWhatsAppConfig(data)
}
```

### Webhook routing

O webhook precisa de tratamento especial: cada provider envia payloads diferentes para URLs diferentes. A função `zapi-webhook` recebe callbacks Z-API específicos.

**Solução:** Manter webhooks separados por provider (não há como unificar, pois cada provider envia para URL diferente configurada nele):
- `zapi-webhook` (existente) → payloads Z-API
- `wuzapi-webhook` (novo) → payloads WUZAPI
- `revolution-webhook` (novo) → payloads Revolution

Cada webhook normaliza o payload para um formato interno e chama a mesma lógica de processamento.

---

## Plano de Implementação

### Fase 1: Abstração (sem breaking changes)
1. Criar `_shared/whatsapp-provider.ts` (interface + tipos)
2. Criar `_shared/providers/zapi.ts` (implementação Z-API extraída)
3. Criar `_shared/whatsapp-config.ts` (resolve provider via companies.active_whatsapp_provider)
4. Criar `_shared/whatsapp-factory.ts` (factory)
5. Migrar as 6 Edge Functions para usar nova interface
6. Manter `zapi-config.ts` como deprecated (re-exporta da nova interface)
7. Testar com provider=zapi (sem mudança funcional)

### Fase 2: Provider WUZAPI
1. Criar `_shared/providers/wuzapi.ts`
2. Criar `wuzapi-webhook` Edge Function
3. Testar com instância WUZAPI real

### Fase 3: Provider Revolution
1. Criar `_shared/providers/revolution.ts`
2. Criar `revolution-webhook` Edge Function
3. Testar com instância Revolution real

### Fase 4: UI no Hub
1. Seletor de provider no Hub (já gerencia oauth_integrations)
2. Atualizar `companies.active_whatsapp_provider` ao trocar

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Webhook Z-API tem formato muito diferente dos outros | Webhooks separados por provider, processamento compartilhado |
| Normalização de telefone varia entre providers | Cada provider normaliza na própria implementação |
| Tempo de resposta diferente entre APIs | Timeout configurável por provider |
| `fix-lead-names` é hardcoded para Veltz Group | Generalizar na migração |
| Downtime durante migração | Fase 1 é 100% retrocompatível (só Z-API) |

---

## Fora de escopo

- UI de seleção de provider no Veltzy (fica no Hub)
- Migração de dados entre providers
- Suporte a múltiplos providers simultaneamente por empresa
- Billing diferenciado por provider
