# Spec: WhatsApp Admin UI

Referencia: [PRD.md](./PRD.md)

---

## 1. Edge Function: `whatsapp-instance-manage` (Veltzy)

### 1.1 Responsabilidade

Intermediaria entre o frontend do Veltzy e o Hub `evolution-instance-manage`. Valida JWT + role do usuario, resolve company_id, e repassa com service_role.

### 1.2 Configuracao

- Path: `supabase/functions/whatsapp-instance-manage/index.ts`
- `verify_jwt = false` (auth interna, igual padrao do ecossistema)
- Env vars necessarias: `HUB_SUPABASE_URL`, `HUB_SERVICE_ROLE_KEY` (ja existem no Veltzy)

### 1.3 Endpoints

#### POST — Criar instancia

**Request:**
```
POST /functions/v1/whatsapp-instance-manage
Authorization: Bearer <user_jwt>
Content-Type: application/json

{
  "display_name": "Atendimento"  // opcional
}
```

**Validacoes:**
1. JWT valido (via `supabase.auth.getUser(token)`)
2. Buscar profile → company_id
3. Role `admin` ou `super_admin` em `user_roles` para esse company_id
4. Se role invalido → 403

**Payload repassado ao Hub:**
```
POST hub/functions/v1/evolution-instance-manage
Authorization: Bearer <HUB_SERVICE_ROLE_KEY>
Content-Type: application/json

{
  "company_id": "<company_id do profile>",
  "display_name": "Atendimento"
}
```

**Response (sucesso):**
```json
{
  "instance_name": "acme-2",
  "qr_code_base64": "data:image/png;base64,...",
  "status": "qr_pending"
}
```
Status: 201

**Response (erro quota):**
```json
{ "error": "Limite de instancias atingido (3)" }
```
Status: 400

---

#### GET — Buscar QR code

**Request:**
```
GET /functions/v1/whatsapp-instance-manage?instance_name=acme-2
Authorization: Bearer <user_jwt>
```

**Validacoes:**
1. JWT valido
2. Profile → company_id
3. Role `admin` ou `super_admin`
4. Instancia pertence ao company_id (query `evolution_instances`)

**Payload repassado ao Hub:**
```
GET hub/functions/v1/evolution-instance-manage?instance_name=acme-2
Authorization: Bearer <HUB_SERVICE_ROLE_KEY>
```

**Response:**
```json
{
  "qr_code_base64": "data:image/png;base64,..." | null,
  "status": "qr_pending" | "connected"
}
```
Status: 200

---

#### PATCH — Desconectar / Reconectar

**Request:**
```
PATCH /functions/v1/whatsapp-instance-manage
Authorization: Bearer <user_jwt>
Content-Type: application/json

{
  "instance_name": "acme-2",
  "action": "disconnect" | "reconnect"
}
```

**Validacoes:**
1. JWT valido
2. Profile → company_id
3. Role `admin` ou `super_admin`
4. Instancia pertence ao company_id

**Payload repassado ao Hub:**
```
PATCH hub/functions/v1/evolution-instance-manage
Authorization: Bearer <HUB_SERVICE_ROLE_KEY>
Content-Type: application/json

{
  "instance_name": "acme-2",
  "action": "disconnect",
  "company_id": "<company_id>"
}
```

**Response (disconnect):**
```json
{ "success": true, "status": "disconnected" }
```

**Response (reconnect):**
```json
{
  "success": true,
  "status": "qr_pending",
  "qr_code_base64": "data:image/png;base64,..." | null
}
```
Status: 200

---

#### DELETE — Deletar instancia

**Request:**
```
DELETE /functions/v1/whatsapp-instance-manage
Authorization: Bearer <user_jwt>
Content-Type: application/json

{
  "instance_name": "acme-2"
}
```

**Validacoes:**
1. JWT valido
2. Profile → company_id
3. Role `admin` ou `super_admin`
4. Instancia pertence ao company_id
5. Instancia deve estar `disconnected` (nao permite deletar instancia ativa)

**Payload repassado ao Hub:**
```
DELETE hub/functions/v1/evolution-instance-manage
Authorization: Bearer <HUB_SERVICE_ROLE_KEY>
Content-Type: application/json

{
  "instance_name": "acme-2",
  "company_id": "<company_id>"
}
```

**Response:**
```json
{ "success": true }
```
Status: 200

---

### 1.4 Erros padrao

| Status | Corpo | Quando |
|--------|-------|--------|
| 401 | `{ "error": "Nao autorizado" }` | JWT ausente/invalido |
| 403 | `{ "error": "Permissao negada" }` | Role nao e admin/super_admin |
| 403 | `{ "error": "Instancia nao pertence a empresa" }` | instance.company_id != user company_id |
| 400 | `{ "error": "Instancia deve estar desconectada para deletar" }` | DELETE em instancia connected |
| 400 | `{ "error": "..." }` | Validacao de campos |
| 502 | `{ "error": "Erro ao comunicar com Hub" }` | Hub retorna erro ou timeout |

### 1.5 Estrutura interna (pseudocodigo)

```typescript
// 1. Extrair e validar JWT
const token = req.headers.get('Authorization')?.replace('Bearer ', '')
const { data: { user } } = await supabaseAdmin.auth.getUser(token)

// 2. Buscar profile → company_id
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('company_id')
  .eq('user_id', user.id)
  .single()

// 3. Validar role
const { data: roles } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .eq('company_id', profile.company_id)

const allowed = roles.some(r => ['admin', 'super_admin'].includes(r.role))
if (!allowed) return 403

// 4. Para GET/PATCH/DELETE: validar ownership da instancia
const { data: instance } = await supabaseAdmin
  .from('evolution_instances')
  .select('company_id, status')
  .eq('instance_name', body.instance_name)
  .single()

if (instance.company_id !== profile.company_id) return 403

// 5. Repassar ao Hub com service_role
const hubRes = await fetch(`${HUB_URL}/functions/v1/evolution-instance-manage`, {
  method: req.method,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${HUB_SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({ ...payload, company_id: profile.company_id }),
})

// 6. Retornar resposta do Hub ao frontend
return new Response(await hubRes.text(), {
  status: hubRes.status,
  headers,
})
```

---

## 2. Componentes React

### 2.1 `WhatsAppInstances` (componente principal)

**Arquivo:** `src/components/admin/whatsapp-instances.tsx`

**Responsabilidade:** Lista instancias, exibe quota, botoes de acao.

**Props:** nenhuma (usa hooks internos)

**Estrutura:**
```
Card (glass-card)
├── CardHeader
│   ├── Icone + Titulo "WhatsApp (Evolution API)"
│   ├── Badge quota: "2 de 3 numeros"
│   └── Botao "+ Conectar numero" (se admin && quota disponivel)
├── CardContent
│   ├── Loading → Skeleton (3 linhas)
│   ├── Lista vazia → Empty state
│   └── Lista de instancias
│       └── Para cada instancia:
│           ├── Status dot (verde/vermelho/amarelo)
│           ├── instance_name
│           ├── phone_number ou "Aguardando conexao"
│           ├── Badge status
│           └── DropdownMenu (se admin)
│               ├── "Desconectar" (se connected)
│               ├── "Reconectar" (se disconnected)
│               └── "Deletar" (se disconnected, destrutivo)
└── (sem CardFooter — sem "Gerenciar no Hub")
```

**Logica condicional:**
- `useRoles()` → `isAdmin` decide se mostra botoes
- `useWhatsAppInstances()` → dados da lista
- `useSubscriptionQuota()` → quota (ou calcular inline via count vs plano)

---

### 2.2 `WhatsAppConnectDialog` (dialog QR)

**Arquivo:** `src/components/admin/whatsapp-connect-dialog.tsx`

**Props:**
```typescript
interface WhatsAppConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'reconnect'
  instanceName?: string  // obrigatorio se mode='reconnect'
}
```

**Estados internos:**
1. `idle` — formulario de criacao (campo display_name)
2. `loading` — chamando Edge Function
3. `qr_pending` — exibindo QR, polling status
4. `connected` — sucesso, auto-fecha em 2s
5. `error` — exibe mensagem, botao "Tentar novamente"
6. `expired` — QR expirou (2 min sem conexao), dois botoes:
   - "Gerar novo QR" — chama GET no Hub via intermediaria para regenerar
   - "Cancelar e remover" — chama DELETE para remover instancia semi-criada (evita orfas em qr_pending)

**Fluxo (mode='create'):**
1. Usuario preenche display_name (opcional), clica "Criar"
2. Chama `createInstance(displayName)` mutation
3. Recebe `qr_code_base64` do POST → renderiza `<img src={qr}>`
4. Ativa polling: `useQuery` com `refetchInterval: 3000` lendo `evolution_instances.status` direto da tabela (Supabase client, RLS). NAO chama GET no Hub durante polling normal.
5. Quando status = 'connected' → toast sucesso, fecha dialog
6. Timeout 2 min sem conexao → estado 'expired'

**Fluxo (mode='reconnect'):**
1. Chama `reconnectInstance(instanceName)` mutation direto
2. Recebe `qr_code_base64` do PATCH → mesmo fluxo de polling (status via tabela, nao GET no Hub)

**Regra sobre GET no Hub:**
O GET via Edge Function intermediaria e usado APENAS para regenerar QR apos expiracao (estado 'expired'). Durante o estado 'qr_pending' normal:
- O qr_code_base64 inicial vem do POST de criacao ou PATCH de reconexao
- O polling le apenas o STATUS direto da tabela evolution_instances
- Nao chamar GET no Hub durante polling normal

**Layout:**
```
Dialog
├── DialogHeader: "Conectar WhatsApp" | "Reconectar WhatsApp"
├── DialogContent
│   ├── [idle] Input display_name + botao "Criar"
│   ├── [qr_pending] QR image (256x256) + "Abra o WhatsApp > Aparelhos conectados > Conectar"
│   ├── [connected] Check icon verde + "Conectado com sucesso!"
│   ├── [expired] Warning + "QR expirou" + botao "Gerar novo QR" + botao "Cancelar e remover"
│   └── [error] Alert destrutivo + mensagem + "Tentar novamente"
└── DialogFooter: botao cancelar (fecha e invalida queries)
```

---

### 2.3 Dialogs de confirmacao

Reutilizar `AlertDialog` do shadcn existente:

- **Desconectar:** titulo "Desconectar instancia?", descricao "O numero {instance_name} sera desconectado. Voce podera reconectar depois.", botao "Desconectar" (variant default)
- **Deletar:** titulo "Deletar instancia?", descricao "Esta acao e irreversivel. O numero {instance_name} sera removido permanentemente.", botao "Deletar" (variant destructive)

---

## 3. Hooks React Query

**Arquivo:** `src/hooks/use-whatsapp-instances.ts`

### 3.1 `useWhatsAppInstances` — Listagem

```typescript
export function useWhatsAppInstances() {
  const companyId = useAuthStore((s) => s.company?.id)

  return useQuery({
    queryKey: ['whatsapp-instances', companyId],
    queryFn: () => listInstances(companyId!),
    enabled: !!companyId,
    staleTime: 30_000,
  })
}
```

**Source:** query direta no Supabase client
```typescript
// whatsapp-instances.service.ts
async function listInstances(companyId: string) {
  const { data } = await supabase
    .from('evolution_instances')
    .select('instance_name, display_name, phone_number, status, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })
  return data ?? []
}
```

### 3.2 `useInstanceStatus` — Polling durante QR

```typescript
export function useInstanceStatus(instanceName: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['instance-status', instanceName],
    queryFn: () => getInstanceStatus(instanceName!),
    enabled: !!instanceName && enabled,
    refetchInterval: 3_000,
  })
}
```

**Source:** query direta no Supabase client
```typescript
async function getInstanceStatus(instanceName: string) {
  const { data } = await supabase
    .from('evolution_instances')
    .select('status')
    .eq('instance_name', instanceName)
    .single()
  return data?.status ?? null
}
```

### 3.3 `useCreateInstance` — Mutation

```typescript
export function useCreateInstance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (displayName?: string) => createInstance(displayName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] })
    },
  })
}
```

### 3.4 `useDisconnectInstance` — Mutation

```typescript
export function useDisconnectInstance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (instanceName: string) => disconnectInstance(instanceName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] })
      toast.success('Instancia desconectada')
    },
  })
}
```

### 3.5 `useReconnectInstance` — Mutation

```typescript
export function useReconnectInstance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (instanceName: string) => reconnectInstance(instanceName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] })
    },
  })
}
```

### 3.6 `useDeleteInstance` — Mutation

```typescript
export function useDeleteInstance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (instanceName: string) => deleteInstance(instanceName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] })
      toast.success('Instancia deletada')
    },
  })
}
```

### 3.7 `useRefreshQr` — Buscar novo QR (apos expirar)

```typescript
export function useRefreshQr() {
  return useMutation({
    mutationFn: (instanceName: string) => fetchQrCode(instanceName),
  })
}
```

---

## 4. Service Layer

**Arquivo:** `src/services/whatsapp-instances.service.ts`

```typescript
const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-instance-manage`

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.session?.access_token}`,
  }
}

// Listagem — direto do banco (RLS)
export async function listInstances(companyId: string) {
  const { data } = await supabase
    .from('evolution_instances')
    .select('instance_name, display_name, phone_number, status, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })
  return data ?? []
}

// Status de uma instancia — direto do banco (RLS)
export async function getInstanceStatus(instanceName: string) {
  const { data } = await supabase
    .from('evolution_instances')
    .select('status')
    .eq('instance_name', instanceName)
    .single()
  return data?.status ?? null
}

// Criar instancia — via Edge Function intermediaria
export async function createInstance(displayName?: string) {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ display_name: displayName || undefined }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao criar instancia')
  }
  return res.json() as Promise<{
    instance_name: string
    qr_code_base64: string | null
    status: string
  }>
}

// Buscar QR code — via Edge Function intermediaria
export async function fetchQrCode(instanceName: string) {
  const res = await fetch(`${FUNCTION_URL}?instance_name=${instanceName}`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao buscar QR')
  }
  return res.json() as Promise<{
    qr_code_base64: string | null
    status: string
  }>
}

// Desconectar — via Edge Function intermediaria
export async function disconnectInstance(instanceName: string) {
  const res = await fetch(FUNCTION_URL, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ instance_name: instanceName, action: 'disconnect' }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao desconectar')
  }
  return res.json()
}

// Reconectar — via Edge Function intermediaria
export async function reconnectInstance(instanceName: string) {
  const res = await fetch(FUNCTION_URL, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ instance_name: instanceName, action: 'reconnect' }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao reconectar')
  }
  return res.json() as Promise<{
    success: boolean
    status: string
    qr_code_base64: string | null
  }>
}

// Deletar — via Edge Function intermediaria
export async function deleteInstance(instanceName: string) {
  const res = await fetch(FUNCTION_URL, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ instance_name: instanceName }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao deletar')
  }
  return res.json()
}
```

---

## 5. Modificacoes em arquivos existentes

### 5.1 `src/components/admin/integrations-tab.tsx`

- Remover `EvolutionInstancesCard` (componente inline)
- Importar `WhatsAppInstances` do novo arquivo
- No `WhatsAppCard`: se provider === 'evolution', renderizar `<WhatsAppInstances />`

### 5.2 `src/hooks/use-evolution-instances.ts`

- Deletar arquivo (substituido por `use-whatsapp-instances.ts`)

### 5.3 `src/services/evolution.service.ts`

- Remover `getCompanyInstances` (substituida)
- Manter `getFailedMessageCount` (usada em outro lugar)

### 5.4 `supabase/config.toml` (Veltzy)

- Adicionar:
```toml
[functions.whatsapp-instance-manage]
verify_jwt = false
```

---

## 6. Cache Keys (resumo)

| Key | Tipo | Invalidado por |
|-----|------|---------------|
| `['whatsapp-instances', companyId]` | Query | create, disconnect, reconnect, delete |
| `['instance-status', instanceName]` | Query (polling 3s) | desativado quando status='connected' |

---

## 7. RLS

A policy `own_company_or_super_admin` ja existe em `evolution_instances` com expressao `(company_id = get_current_company_id()) OR is_super_admin()`. Verificar que esta ativa antes da implementacao. NAO criar policy nova — pode entrar em conflito com a existente.

> Escrita (INSERT/UPDATE/DELETE) e feita via service_role no Hub, nao pelo client.

---

## 8. Checklist de implementacao

1. [ ] Criar Edge Function `whatsapp-instance-manage` no Veltzy
2. [ ] Criar `src/services/whatsapp-instances.service.ts`
3. [ ] Criar `src/hooks/use-whatsapp-instances.ts`
4. [ ] Criar `src/components/admin/whatsapp-instances.tsx`
5. [ ] Criar `src/components/admin/whatsapp-connect-dialog.tsx`
6. [ ] Modificar `integrations-tab.tsx` (trocar componente)
7. [ ] Remover `use-evolution-instances.ts`
8. [ ] Limpar `evolution.service.ts` (remover getCompanyInstances)
9. [ ] Verificar RLS em `evolution_instances`
10. [ ] Deploy Edge Function + teste curl
11. [ ] Teste visual: criar, QR, conectar, desconectar, deletar
