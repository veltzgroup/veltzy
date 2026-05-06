# Spec -- Acoes em Massa na Pagina de Negocios

> **PRD:** [docs/features/bulk-actions/PRD.md](PRD.md)
> **Status:** Implementado
> **Migration:** `033_bulk_actions_archived_status.sql`

---

## 1. ARQUITETURA

### 1.1 Migration SQL (`033_bulk_actions_archived_status.sql`)

```sql
-- Adicionar valor 'archived' ao enum lead_status
ALTER TYPE veltzy.lead_status ADD VALUE IF NOT EXISTS 'archived';

-- Atualizar trigger log_lead_activity para logar mudancas de status
CREATE OR REPLACE FUNCTION veltzy.log_lead_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO veltzy.activity_logs (company_id, user_id, action, resource_type, resource_id, metadata)
        VALUES (NEW.company_id, auth.uid(), 'created', 'lead', NEW.id,
            jsonb_build_object('name', NEW.name, 'phone', NEW.phone));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.stage_id != NEW.stage_id THEN
            INSERT INTO veltzy.activity_logs (company_id, user_id, action, resource_type, resource_id, metadata)
            VALUES (NEW.company_id, auth.uid(), 'stage_changed', 'lead', NEW.id,
                jsonb_build_object('from_stage', OLD.stage_id, 'to_stage', NEW.stage_id));
        END IF;
        IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
            INSERT INTO veltzy.activity_logs (company_id, user_id, action, resource_type, resource_id, metadata)
            VALUES (NEW.company_id, auth.uid(), 'assigned', 'lead', NEW.id,
                jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to));
        END IF;
        -- NOVO: log de mudanca de status (inclui archived)
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO veltzy.activity_logs (company_id, user_id, action, resource_type, resource_id, metadata)
            VALUES (NEW.company_id, auth.uid(), 'status_changed', 'lead', NEW.id,
                jsonb_build_object('from_status', OLD.status::text, 'to_status', NEW.status::text));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = veltzy, public;
```

**Notas:**
- `ADD VALUE IF NOT EXISTS` e seguro e nao reversivel (aceito conforme PRD)
- O trigger atualizado adiciona log de `status_changed` sem quebrar os logs existentes
- RLS existentes ja cobrem os cenarios de bulk: `vz_leads_update` (admin/manager/seller proprio), `vz_leads_delete` (admin only)

### 1.2 Tipo TypeScript

Atualizar `LeadStatus` em `src/types/database.ts`:

```ts
export type LeadStatus = 'new' | 'qualifying' | 'open' | 'deal' | 'lost' | 'archived'
```

### 1.3 Service (`src/services/leads.service.ts`)

Adicionar 3 metodos ao service existente:

```ts
// Bulk update assigned_to (batch de 50)
bulkUpdateAssignedTo(companyId, leadIds[], targetUserId) -> Promise<void>

// Bulk archive (batch de 50)
bulkArchive(companyId, leadIds[]) -> Promise<void>

// Bulk delete + log manual em activity_logs (batch de 50)
bulkDelete(companyId, leadIds[]) -> Promise<void>
```

Padrao de batch: processar `leadIds` em chunks de 50, executando updates/deletes sequenciais. O `bulkDelete` insere manualmente um registro em `activity_logs` com `action='bulk_delete'`, `resource_type='lead'`, `metadata={ lead_ids: [...], count: N }` pois o trigger so cobre INSERT/UPDATE, nao DELETE.

### 1.4 Hook (`src/hooks/use-bulk-leads.ts`)

Hook unico exportando 4 mutations + helper de selecao:

```ts
// Mutations (React Query useMutation)
useBulkTransfer()   -> mutateAsync({ leadIds, targetUserId })
useBulkArchive()    -> mutateAsync({ leadIds })
useBulkDelete()     -> mutateAsync({ leadIds })
useBulkExport()     -> ({ leads, format }) // sincrono, reutiliza exportToCsv/exportToPdf
```

Todas as mutations invalidam `['dashboard-leads']` no onSuccess via `queryClient.invalidateQueries`.

### 1.5 Componentes

```
src/components/deals/
  bulk-action-bar.tsx        -> Barra contextual com contagem e botoes
  bulk-transfer-modal.tsx    -> Modal de selecao de vendedor destino
  bulk-archive-dialog.tsx    -> Dialog de confirmacao simples
  bulk-delete-dialog.tsx     -> AlertDialog com input "EXCLUIR"
```

---

## 2. LISTA DE ARQUIVOS

### Criar

| Arquivo | Descricao |
|---|---|
| `supabase/migrations/033_bulk_actions_archived_status.sql` | ALTER TYPE + trigger atualizado |
| `src/hooks/use-bulk-leads.ts` | Mutations de bulk transfer, archive, delete, export |
| `src/components/deals/bulk-action-bar.tsx` | Barra contextual: "X selecionados" + botoes de acao + botao limpar |
| `src/components/deals/bulk-transfer-modal.tsx` | Modal com select de membro da equipe (seller/manager) |
| `src/components/deals/bulk-archive-dialog.tsx` | Dialog de confirmacao simples para arquivar |
| `src/components/deals/bulk-delete-dialog.tsx` | AlertDialog destrutivo com input de confirmacao "EXCLUIR" |

### Modificar

| Arquivo | Descricao |
|---|---|
| `src/types/database.ts` | Adicionar `'archived'` ao type `LeadStatus` |
| `src/services/leads.service.ts` | Adicionar `bulkUpdateAssignedTo`, `bulkArchive`, `bulkDelete`, log manual de bulk_delete |
| `src/pages/deals.tsx` | State de selecao (Set de IDs), checkbox por linha, checkbox "selecionar todos", renderizacao da `BulkActionBar`, toggle "Mostrar arquivados", filtro `status != 'archived'` por padrao |
| `src/hooks/use-dashboard-leads.ts` | Aceitar parametro `showArchived` para controlar filtro de status |

---

## 3. DETALHAMENTO DOS COMPONENTES

### 3.1 `deals.tsx` (modificacoes)

**State novo:**
- `selectedIds: Set<string>` -- IDs dos leads selecionados
- `showArchived: boolean` -- toggle para exibir leads arquivados (default: false)

**Checkbox por linha:**
- Coluna nova no inicio da tabela (antes de Contato)
- `<Checkbox>` do shadcn/ui, controlado pelo `selectedIds`
- `onClick` com `e.stopPropagation()` para nao abrir o modal de edicao

**Checkbox "selecionar todos" no header:**
- Seleciona/deseleciona todos os leads **filtrados e visiveis**
- Estado indeterminate quando ha selecao parcial

**Barra contextual:**
- Renderiza `<BulkActionBar>` entre o header e os KPI cards quando `selectedIds.size > 0`
- Props: `selectedIds`, `leads` (para export), `onClear`, role do usuario

**Filtro de arquivados:**
- Por padrao, filtra `leads.filter(l => l.status !== 'archived')`
- Toggle "Mostrar arquivados" visivel para manager/admin, posicionado proximo aos filtros de periodo
- Quando ativo, exibe todos os leads (incluindo archived)

**Nota sobre leads visiveis:**
- Quando ha mais leads do que os exibidos (limit 500), exibir nota: "Mostrando X de Y leads -- apenas os X visiveis serao afetados"

### 3.2 `bulk-action-bar.tsx`

**Layout:** Barra horizontal no topo da tabela com `bg-primary/10 border border-primary/20 rounded-xl p-3`

**Conteudo:**
- Texto: "{N} selecionados"
- Botoes (condicionais por role):
  - **Transferir** (manager, admin) -- abre `BulkTransferModal`
  - **Exportar** (todos) -- dropdown CSV/PDF
  - **Arquivar** (todos) -- abre `BulkArchiveDialog`
  - **Excluir** (admin) -- abre `BulkDeleteDialog`, variant destructive
- Botao X para limpar selecao

**Props:**
```ts
interface BulkActionBarProps {
  selectedIds: Set<string>
  leads: LeadWithDetails[]
  onClear: () => void
  userRole: AppRole
}
```

### 3.3 `bulk-transfer-modal.tsx`

- Dialog com `DialogHeader` "Transferir {N} leads"
- `<Select>` com membros da equipe (seller, manager) via `useTeamMembers()`
- Botao "Transferir" chama `useBulkTransfer().mutateAsync({ leadIds, targetUserId })`
- Loading state com `Loader2` spinner
- Toast de sucesso no onSuccess, limpa selecao via callback

### 3.4 `bulk-archive-dialog.tsx`

- `AlertDialog` simples: "Tem certeza que deseja arquivar {N} leads?"
- Texto explicativo: "Os leads serao ocultados da view padrao. Voce pode recupera-los usando o filtro 'Mostrar arquivados'."
- Botao "Arquivar" chama `useBulkArchive().mutateAsync({ leadIds })`
- Toast de sucesso

### 3.5 `bulk-delete-dialog.tsx`

- `AlertDialog` destrutivo com variant destructive
- Titulo: "Excluir {N} leads permanentemente"
- Input de texto onde o usuario deve digitar "EXCLUIR" para habilitar o botao
- Botao "Excluir permanentemente" (variant destructive), desabilitado ate o input estar correto
- Chama `useBulkDelete().mutateAsync({ leadIds })`
- Toast de sucesso

---

## 4. FLUXO DE DADOS

```
deals.tsx (state: selectedIds, showArchived)
  |
  |-- useDashboardLeads(pipelineId, { showArchived })
  |     |-- leadsService.getLeadsByCompany(companyId, { status filter })
  |
  |-- BulkActionBar (selectedIds, role)
  |     |-- BulkTransferModal -> useBulkTransfer -> leadsService.bulkUpdateAssignedTo
  |     |-- BulkArchiveDialog -> useBulkArchive -> leadsService.bulkArchive
  |     |-- BulkDeleteDialog  -> useBulkDelete  -> leadsService.bulkDelete + log manual
  |     |-- Export dropdown   -> exportToCsv / exportToPdf (direto, sem service)
  |
  |-- invalidateQueries(['dashboard-leads']) apos cada mutation
  |-- limpa selectedIds apos cada mutation bem-sucedida
```

---

## 5. PERMISSOES POR ROLE (FRONTEND)

O role do usuario vem de `useRoles()` (hook existente que retorna `{ role }` do auth store).

| Acao | Condicao frontend | Protecao backend (RLS) |
|---|---|---|
| Selecionar | Sempre visivel | `vz_leads_select` filtra por role |
| Transferir | `role === 'manager' \|\| role === 'admin'` | `vz_leads_update` exige admin/manager ou assigned_to |
| Exportar | Sempre visivel | Dados ja filtrados pelo SELECT |
| Arquivar | Sempre visivel | `vz_leads_update` exige admin/manager ou assigned_to |
| Excluir | `role === 'admin'` | `vz_leads_delete` exige `is_company_admin()` |

**Seller ve apenas seus proprios leads** -- o SELECT ja filtra por `assigned_to = get_current_profile_id()`, entao o seller so consegue selecionar/arquivar/exportar seus proprios leads.

---

## 6. CRITERIOS DE ACEITE

### Migration e Tipos
- [x] Enum `veltzy.lead_status` possui valor `'archived'`
- [x] Trigger `log_lead_activity` loga mudancas de `status` (incluindo archived)
- [x] Type `LeadStatus` em `database.ts` inclui `'archived'`

### Selecao
- [x] Checkbox visivel em cada linha da tabela
- [x] Checkbox "selecionar todos" no header seleciona todos os leads filtrados visiveis
- [x] Checkbox "selecionar todos" mostra estado indeterminate em selecao parcial
- [x] Clicar no checkbox nao abre o modal de edicao do lead

### Barra Contextual
- [x] Barra aparece quando ha pelo menos 1 lead selecionado
- [x] Exibe contagem correta: "{N} selecionados"
- [x] Botao X limpa toda a selecao
- [x] Botoes condicionais por role (transferir: manager/admin, excluir: admin)

### Transferir (Bulk)
- [x] Modal abre com select de membros da equipe
- [x] Transfere `assigned_to` de todos os leads selecionados para o vendedor escolhido
- [x] Trigger `log_lead_activity` gera log individual de `assigned` por lead
- [x] Toast de sucesso, selecao limpa, tabela atualizada
- [x] Botao nao visivel para seller

### Exportar (Bulk)
- [x] Dropdown com opcoes CSV e PDF
- [x] Exporta apenas os leads selecionados (nao todos)
- [x] Reutiliza `exportToCsv` e `exportToPdf` existentes

### Arquivar (Bulk)
- [x] Dialog de confirmacao simples
- [x] Seta `status = 'archived'` nos leads selecionados
- [x] Leads arquivados desaparecem da view padrao
- [x] Toast de sucesso, selecao limpa, tabela atualizada

### Toggle "Mostrar Arquivados"
- [x] Toggle visivel para manager/admin
- [x] Quando ativo, leads arquivados aparecem na tabela
- [x] Quando inativo (padrao), leads arquivados sao ocultos

### Excluir (Bulk)
- [x] AlertDialog destrutivo exige digitar "EXCLUIR" para habilitar botao
- [x] DELETE permanente dos leads selecionados
- [x] Log manual em `activity_logs` com `action='bulk_delete'`, `metadata` com array de IDs
- [x] Toast de sucesso, selecao limpa, tabela atualizada
- [x] Botao visivel apenas para admin
- [x] RLS bloqueia delete para nao-admin no banco

### Performance
- [x] Operacoes em batch de 50 leads
- [x] Cache React Query invalidado apos cada mutacao
- [x] Nenhum travamento de UI durante operacoes em massa

### Seguranca
- [x] Seller nao ve botao de transferir nem excluir
- [x] Seller so consegue selecionar/arquivar/exportar seus proprios leads (RLS)
- [x] Admin e o unico que consegue excluir (RLS `vz_leads_delete`)
