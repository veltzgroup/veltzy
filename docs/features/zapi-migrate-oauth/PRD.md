# PRD — Migrar credenciais Z-API de whatsapp_configs para oauth_integrations

## Objetivo

Unificar a fonte de credenciais Z-API no ecossistema Veltz Group. Hoje existem duas tabelas com os mesmos dados:

| Tabela | Schema | Quem usa | Quem escreve |
|---|---|---|---|
| `veltzy.whatsapp_configs` | Colunas dedicadas | 5 Edge Functions + 3 services frontend | Admin do Veltzy |
| `public.oauth_integrations` | JSONB metadata | Hub (centro de controle) | Super admin (Hub) |

O Hub ja salva credenciais Z-API em `oauth_integrations.metadata`. As 5 Edge Functions e o frontend do Veltzy ainda buscam de `veltzy.whatsapp_configs`. A migração consiste em apontar tudo para `public.oauth_integrations`.

## Estado atual

### Dados no banco (mesma empresa, mesmas credenciais)

**`public.oauth_integrations`** (fonte desejada):
```json
{
  "company_id": "d20f7d62-...",
  "provider": "zapi",
  "status": "connected",
  "metadata": {
    "instance_id": "3DC4AAA5DC42708B4E3FD61B890DAA45",
    "token": "1F5F39F8BBE748D3966A8071",
    "client_token": "Fbf1cab850b7d4fda9dae6656e7e4c736S",
    "server_url": "https://api.z-api.io"
  }
}
```

**`veltzy.whatsapp_configs`** (fonte atual):
```
instance_id:     "3DC4AAA5DC42708B4E3FD61B890DAA45"
instance_token:  (coluna dedicada, mesmo valor que metadata.token)
client_token:    (coluna dedicada, mesmo valor)
status:          "connected"
phone_number:    null
qr_code:         null
```

### Diferenças de schema

| Campo | whatsapp_configs | oauth_integrations |
|---|---|---|
| instance_id | coluna TEXT | metadata.instance_id |
| instance_token | coluna TEXT | metadata.token |
| client_token | coluna TEXT | metadata.client_token |
| server_url | (nao existe) | metadata.server_url |
| status | coluna TEXT | coluna TEXT |
| phone_number | coluna TEXT | (nao existe) |
| qr_code | coluna TEXT | (nao existe) |
| connected_at | coluna TIMESTAMPTZ | (nao existe) |
| last_sync_at | (nao existe) | coluna TIMESTAMPTZ |

**Campos exclusivos de whatsapp_configs que precisam ser preservados:**
- `phone_number` — numero do WhatsApp conectado
- `qr_code` — QR code para pareamento (temporario)
- `connected_at` — timestamp da ultima conexao

Esses campos podem ir para `oauth_integrations.metadata`.

### Mapeamento de nomes

| whatsapp_configs | oauth_integrations.metadata |
|---|---|
| `instance_id` | `instance_id` (igual) |
| `instance_token` | `token` (nome diferente!) |
| `client_token` | `client_token` (igual) |
| (nao tem) | `server_url` (novo) |

**ATENCAO:** O campo `instance_token` no Veltzy se chama `token` no Hub. Todas as Edge Functions usam `config.instance_token` para montar a URL da Z-API.

## Pontos de mudanca

### 5 Edge Functions (backend)

Todas seguem o mesmo padrao de busca:

```typescript
// ANTES (veltzy.whatsapp_configs)
const supabase = createClient(url, key, { db: { schema: 'veltzy' } })
const { data: config } = await supabase
  .from('whatsapp_configs')
  .select('instance_id, instance_token, client_token, status')
  .eq('company_id', companyId)
  .single()

const baseUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.instance_token}`
const headers = { 'Client-Token': config.client_token }
```

Cada function tem particularidades:

| Edge Function | Como busca | Campos usados | Particularidades |
|---|---|---|---|
| `zapi-webhook` | `.eq('instance_id', payload.instanceId)` | instance_id, instance_token, client_token, company_id | Busca por instance_id (nao company_id!), valida z-api-token header contra instance_token, atualiza status para 'connected' |
| `zapi-send` | `.eq('company_id', companyId)` | Todos (`select('*')`) | Checa `config.status === 'connected'` antes de enviar |
| `process-message-queue` | `.eq('company_id', item.company_id).eq('status', 'connected')` | instance_id, instance_token, client_token, status | Filtra por status na query |
| `check-whatsapp-health` | `.eq('status', 'connected')` sem filtro de empresa | id, company_id, instance_id, instance_token, client_token, status | Itera TODAS as empresas conectadas |
| `whatsapp-manager` | `.eq('company_id', companyId)` | Todos (`select('*')`) | Atualiza status, phone_number, qr_code, connected_at |

### 3 Services frontend

| Service/Hook | Arquivo | Query | O que faz |
|---|---|---|---|
| `whatsapp.service.getConfig` | `src/services/whatsapp.service.ts:4-11` | `veltzy().from('whatsapp_configs').select('*')` | Busca config completa para exibir no admin |
| `whatsapp.service.saveConfig` | `src/services/whatsapp.service.ts:14-24` | `veltzy().from('whatsapp_configs').upsert(...)` | Salva credenciais (admin) |
| `useWhatsAppStatus` | `src/hooks/use-whatsapp-status.ts:12-17` | `veltzy().from('whatsapp_configs').select('status')` | Poll de status a cada 2min |
| `messages.service.isWhatsAppConnected` | `src/services/messages.service.ts:112-119` | `db().from('whatsapp_configs').select('id').eq('status', 'connected')` | Verifica se WhatsApp esta conectado |

### 0 Componentes frontend

Nenhum componente acessa `whatsapp_configs` diretamente. Todos passam pelos services/hooks acima.

## Campos de phone_number e qr_code

O `whatsapp-manager` atualiza `phone_number`, `qr_code` e `connected_at` na tabela. Esses campos nao existem em `oauth_integrations`. Opcoes:

**Opcao escolhida: metadata JSONB**

Armazenar em `oauth_integrations.metadata`:
```json
{
  "instance_id": "...",
  "token": "...",
  "client_token": "...",
  "server_url": "https://api.z-api.io",
  "phone_number": "11999999999",
  "qr_code": "base64...",
  "connected_at": "2026-05-03T..."
}
```

Vantagem: nenhuma migration no banco. Tudo ja cabe no JSONB existente.

## Busca por instance_id (zapi-webhook)

O `zapi-webhook` busca por `instance_id`, nao por `company_id`:

```typescript
.from('whatsapp_configs')
.select(...)
.eq('instance_id', payload.instanceId)
```

Em `oauth_integrations`, o `instance_id` esta dentro do JSONB. A query precisa mudar para:

```typescript
.from('oauth_integrations')
.select(...)
.eq('provider', 'zapi')
.eq('metadata->>instance_id', payload.instanceId)
```

Ou criar um indice no campo JSONB para performance:
```sql
CREATE INDEX idx_oauth_integrations_zapi_instance
ON public.oauth_integrations ((metadata->>'instance_id'))
WHERE provider = 'zapi';
```

## Frontend: remover whatsapp.service.saveConfig

O `saveConfig` escreve em `whatsapp_configs`. Apos a migracao, quem escreve credenciais Z-API e o Hub (via `oauth_integrations`). O Veltzy so le.

O `saveConfig` pode ser removido. A tab de integracoes do Veltzy ja mostra "Hub Managed" e nao permite editar credenciais.

## Estrategia de migracao

### Fase 1 — Compatibilidade (zero downtime)
1. Criar uma **view** `veltzy.whatsapp_configs` que le de `public.oauth_integrations` e mapeia os campos
2. Ou alterar as Edge Functions para ler de `oauth_integrations` diretamente

**View descartada:** O `whatsapp-manager` faz UPDATE na tabela (status, phone_number, qr_code). Views nao suportam UPDATE facilmente.

### Fase 2 — Migracao direta (escolhida)
1. Alterar as 5 Edge Functions para ler/escrever em `public.oauth_integrations`
2. Alterar os 3 services/hooks frontend
3. Deploy das Edge Functions + frontend
4. Manter `whatsapp_configs` por 1 semana como fallback
5. Dropar `veltzy.whatsapp_configs` apos validacao

## Riscos

| Risco | Mitigacao |
|---|---|
| Edge Function falha apos deploy | Manter whatsapp_configs intacta como rollback |
| Webhook para de funcionar | zapi-webhook e a mais critica; testar primeiro |
| Perda de mensagens | Testar zapi-send antes de dropar tabela antiga |
| JSONB query lenta no webhook | Criar indice no metadata->>instance_id |
| Nome do campo (instance_token vs token) | Mapear no codigo, nao no banco |

## Fora de escopo

- Migrar Instagram (instagram_connections) para oauth_integrations
- Implementar OAuth flow real para Google Calendar ou Brevo
- Criptografia de credenciais
- Criar UI de setup de credenciais no Veltzy (e feito pelo Hub)
- Dropar whatsapp_configs neste PR (fazer em PR separado apos validacao)

## Arquivos afetados

### Edge Functions (modificar)
1. `supabase/functions/zapi-webhook/index.ts`
2. `supabase/functions/zapi-send/index.ts`
3. `supabase/functions/process-message-queue/index.ts`
4. `supabase/functions/check-whatsapp-health/index.ts`
5. `supabase/functions/whatsapp-manager/index.ts`

### Frontend (modificar)
6. `src/services/whatsapp.service.ts` — ler de oauth_integrations, remover saveConfig
7. `src/hooks/use-whatsapp-status.ts` — ler status de oauth_integrations
8. `src/services/messages.service.ts` — isWhatsAppConnected de oauth_integrations

### Migration (criar)
9. `supabase/migrations/XXX_zapi_oauth_index.sql` — indice no metadata->>instance_id

### Nao alterar
- `src/types/database.ts` — manter `WhatsAppConfig` como adapter (pode remover depois)
- `src/components/` — nenhum componente acessa a tabela diretamente
