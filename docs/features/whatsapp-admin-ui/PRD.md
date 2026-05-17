# PRD: WhatsApp Admin UI (Gerenciamento de Instancias no Veltzy)

## Resumo

Substituir o card "Gerenciar no Hub" em Admin → Integracoes → Canais → WhatsApp por uma UI funcional que permite ao admin da empresa criar, listar, desconectar, reconectar e deletar instancias WhatsApp diretamente no Veltzy, sem precisar acessar o Hub.

## Problema

Hoje o admin da empresa precisa pedir ao super_admin (via Hub) para criar/gerenciar instancias WhatsApp. Isso cria dependencia operacional e atrito. A infra ja esta pronta (evolution-instance-manage aceita service_role), falta apenas a UI no Veltzy.

## Objetivo

Admin da empresa gerencia instancias WhatsApp de forma autonoma, dentro do Veltzy, com validacao de quota e seguranca multi-tenant.

---

## Personas

| Persona | Acesso |
|---------|--------|
| **Admin** (role `admin` da propria empresa) | Criar, desconectar, reconectar, deletar instancias da empresa |
| **Super Admin** (role `super_admin`, global) | Mesmo que admin, em qualquer empresa |
| **Manager / Seller / Representative** | Somente visualizacao (lista com status). Sem botoes de acao |

> **Nota:** Admin da empresa pode operar qualquer instancia da propria empresa, independente de quem criou (Hub ou Veltzy). Ownership e por `company_id`, nao por `created_by`.

---

## Funcionalidades

### F1: Listagem de instancias

- Tabela/lista com: nome, telefone, status (conectado/desconectado/aguardando QR), data de criacao
- Status com badge colorido (verde/vermelho/amarelo)
- Fonte de dados: query direta na tabela `evolution_instances` via Supabase client (mesmo banco, RLS garante escopo)
- Refresh automatico via React Query (staleTime: 30s)

### F2: Criar instancia (+ Conectar numero)

- Botao "+ Conectar numero" (visivel apenas para admin/super_admin)
- Abre Dialog/Sheet com:
  1. Campo opcional: nome de exibicao (display_name)
  2. Ao confirmar, chama Edge Function intermediaria do Veltzy que repassa para Hub (POST)
  3. Retorna QR code base64 → renderiza como `<img>`
  4. Polling a cada 3s lendo `evolution_instances.status` direto do Supabase client (RLS por company_id). O webhook do Hub ja atualiza o status no banco em tempo real quando o celular escaneia o QR.
  5. Quando status muda para `connected`, fecha dialog com toast de sucesso
  6. Se QR expirar (2 min sem conexao), permitir "Gerar novo QR" (novo GET no Hub via intermediaria)
- Validacao de quota: antes de criar, verificar `count(instances) < max_whatsapp_instances` do plano
- GET no Hub (via intermediaria) usado APENAS para buscar QR base64 inicial na criacao/reconexao, nao para polling de status

### F3: Desconectar instancia

- Botao "Desconectar" em cada instancia conectada (dropdown de acoes)
- Confirm dialog: "Tem certeza que deseja desconectar {instance_name}?"
- Chama PATCH com action='disconnect' via Edge Function intermediaria
- Atualiza lista automaticamente

### F4: Reconectar instancia

- Botao "Reconectar" em cada instancia desconectada
- Abre o mesmo dialog de QR code da criacao
- Chama PATCH com action='reconnect' via Edge Function intermediaria (retorna QR base64)
- Polling de status via Supabase client (mesmo padrao de F2), nao via GET no Hub

### F5: Deletar instancia

- Botao "Deletar" no dropdown de acoes (apenas para instancias desconectadas)
- Confirm dialog destrutivo: "Esta acao e irreversivel. Todos os dados da instancia serao perdidos."
- Chama DELETE via Edge Function intermediaria

---

## Arquitetura

### Fluxo de dados

```
┌─────────────────────────────────────────────────────────┐
│ LEITURA (listagem + status)                             │
│ Frontend → Supabase Client → evolution_instances (RLS)  │
└─────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ ESCRITA (criar/desconectar/reconectar/deletar)                         │
│ Frontend → Veltzy Edge Function (whatsapp-instance-manage)             │
│          → Hub Edge Function (evolution-instance-manage) via service_role│
└────────────────────────────────────────────────────────────────────────┘
```

### Porque uma Edge Function intermediaria?

- O frontend NAO pode ter acesso ao service_role key
- O admin NAO e super_admin, entao nao pode chamar a Edge Function do Hub com JWT proprio
- A intermediaria valida que o usuario e admin da empresa e repassa com service_role

### Edge Function: whatsapp-instance-manage (Veltzy)

Nova Edge Function no Veltzy que:
1. Autentica o usuario via JWT
2. Valida que e admin ou super_admin da empresa
3. Extrai company_id do perfil do usuario (nunca confia no body pra company_id)
4. Repassa a chamada para Hub evolution-instance-manage com service_role + company_id

Metodos suportados:
- POST: criar instancia (body: { display_name? })
- GET: buscar QR/status (query: instance_name)
- PATCH: disconnect/reconnect (body: { instance_name, action })
- DELETE: deletar (body: { instance_name })

---

## Componentes Frontend

### Novos arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/components/admin/whatsapp-instances.tsx` | Componente principal (lista + acoes) |
| `src/components/admin/whatsapp-connect-dialog.tsx` | Dialog de criacao/reconexao com QR |
| `src/hooks/use-whatsapp-instances.ts` | React Query hooks (list, create, patch, delete) |
| `src/services/whatsapp-instances.service.ts` | Service layer (chama a Edge Function intermediaria) |
| `supabase/functions/whatsapp-instance-manage/index.ts` | Edge Function intermediaria |

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/admin/integrations-tab.tsx` | Substituir `EvolutionInstancesCard` por `WhatsAppInstances` |
| `src/hooks/use-evolution-instances.ts` | Deprecar ou remover (substituido por novo hook) |
| `src/services/evolution.service.ts` | Remover `getCompanyInstances` (substituido) |

---

## Permissoes e seguranca

1. **Frontend**: botoes de acao (criar/desconectar/reconectar/deletar) renderizados apenas se role e `admin` ou `super_admin` (via `useRoles()`)
2. **Edge Function (Veltzy)**: valida JWT + confirma role `admin` ou `super_admin` na tabela `user_roles` para o company_id do perfil do usuario. Rejeita qualquer outro role.
3. **Hub**: valida service_role + company_id (ownership da instancia)
4. **RLS**: `evolution_instances` filtrada por company_id (leitura segura para todos os roles)
5. **Ownership**: qualquer instancia com `company_id` da empresa pode ser operada pelo admin, independente de `created_by`

---

## Quota

- Fonte: `subscriptions.metadata.max_whatsapp_instances` ou default do plano
- Exibir no header: "2 de 3 numeros conectados"
- Botao "+ Conectar numero" desabilitado quando quota atingida, com tooltip explicativo
- Quota ja e validada no Hub (dupla checagem)

---

## UX/Design

- Seguir padrao glass-card existente
- Status badges: verde (connected), vermelho (disconnected), amarelo (qr_pending)
- Actions via DropdownMenu (tres pontinhos) em cada instancia
- Dialog de QR: centered, com contador de timeout (2 min), instrucoes "Abra o WhatsApp no celular..."
- Toast de sucesso/erro em todas as acoes
- Loading states com Skeleton/Spinner durante mutations

---

## Fora de escopo

- Migrar Z-API para Evolution (fluxo separado)
- Editar nome/configuracoes da instancia apos criacao
- Atribuir instancia a usuario/pipeline (ja existe em outros fluxos)
- Notificacoes push quando instancia desconecta

---

## Criterios de aceite

1. Admin cria instancia, escaneia QR e ve status "Conectado" em ate 30s
2. Admin desconecta instancia e status muda para "Desconectado"
3. Admin reconecta instancia desconectada via novo QR
4. Admin deleta instancia desconectada e ela some da lista
5. Vendedor ve a lista mas NAO ve botoes de acao
6. Quota respeitada: botao desabilitado quando limite atingido
7. Nenhuma instancia de outra empresa e visivel (RLS)
8. Erro no Hub (502, timeout) mostra toast amigavel, nao quebra a UI
