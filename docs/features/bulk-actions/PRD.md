# PRD — Acoes em Massa na Pagina de Negocios

## Problema

Atualmente, todas as operacoes na pagina de negocios sao individuais — transferir dono, arquivar, exportar ou excluir exigem acoes lead a lead. Para empresas com dezenas/centenas de leads, isso e impraticavel. Gestores e admins precisam de operacoes em massa para manter o pipeline organizado.

## Requisitos Funcionais

### RF-01: Selecao de leads na tabela
- Checkbox em cada linha da tabela (sempre visivel)
- Checkbox "selecionar todos" no header da tabela (seleciona todos os leads **filtrados** na view atual)
- Barra contextual no topo da tabela quando ha selecao: "X selecionados" + botoes de acao + botao X para limpar

### RF-02: Transferir dono (bulk transfer)
- Abre modal com select de vendedor destino (membros da equipe)
- Atualiza `assigned_to` em todos os leads selecionados
- Disponivel para: **manager, admin**
- Vendedor NAO tem acesso a esta acao

### RF-03: Exportar (bulk export)
- Dropdown com opcoes CSV ou PDF
- Exporta apenas os leads selecionados
- Reutiliza `exportToCsv` / `exportToPdf` de `src/lib/export-leads.ts`
- Disponivel para: **seller** (proprios), **manager, admin** (todos)

### RF-04: Arquivar (bulk archive)
- Confirmacao simples (dialog)
- Seta `status = 'archived'` nos leads selecionados
- Leads arquivados sao ocultos da view padrao
- Toggle "Mostrar arquivados" no filtro para manager/admin recuperar leads
- Disponivel para: **seller** (proprios), **manager, admin** (todos)

### RF-05: Excluir em massa (bulk delete)
- AlertDialog destrutivo onde o usuario digita "EXCLUIR" para confirmar
- DELETE permanente dos leads selecionados
- Registra em `activity_logs`: `action='bulk_delete'`, `resource_type='lead'`, `metadata` com array de IDs deletados
- Disponivel para: **admin** apenas

### RF-06: Status 'archived'
- Adicionar valor `'archived'` ao enum `veltzy.lead_status`
- View padrao da pagina de Negocios filtra `status != 'archived'`
- Toggle "Mostrar arquivados" visivel para manager/admin

## Requisitos Nao Funcionais

### RNF-01: Permissoes por role
| Acao | seller | manager | admin |
|------|--------|---------|-------|
| Selecionar | Proprios leads | Todos | Todos |
| Transferir | NAO | SIM | SIM |
| Exportar | Proprios leads | Todos | Todos |
| Arquivar | Proprios leads | Todos | Todos |
| Excluir | NAO | NAO | SIM |

### RNF-02: Performance
- Operacoes em batch de 50 leads (padrao existente no import)
- Feedback de progresso para operacoes > 50 leads
- Invalidacao de cache React Query apos mutacao

### RNF-03: Seguranca
- RLS ja aplicado (company_id + role) — operacoes em massa passam pelo Supabase client normalmente
- Verificacao de role no frontend antes de exibir botoes
- RLS no backend como segunda barreira

### RNF-04: Auditoria
- Trigger existente `log_lead_activity()` cobre: assigned_to changes (transferencia) e stage changes
- Bulk delete precisa de log manual (trigger DELETE nao existe no trigger atual)
- Bulk archive sera capturado pelo trigger se adicionarmos log para status changes (ou log manual)

## Analise Tecnica do Codebase

### O que ja existe e sera reutilizado
| Recurso | Arquivo | Uso |
|---------|---------|-----|
| Export CSV/PDF | `src/lib/export-leads.ts` | Reutilizar direto passando leads selecionados |
| Transfer modal | `src/components/pipeline/transfer-lead-modal.tsx` | Referencia para UI do modal de transferencia em massa |
| Leads service | `src/services/leads.service.ts` | Estender com metodos bulk |
| Import batch pattern | `src/services/import-leads.service.ts` | Padrao de 50/batch com progress |
| Activity logs | `veltzy.activity_logs` | Tabela ja existe com schema correto |
| RLS policies | Migration 010 | SELECT/UPDATE filtram por role, DELETE so admin |
| Auth store | `src/stores/auth.store.ts` | `company_id`, `user`, role |

### O que precisa ser criado/modificado
| Item | Tipo | Descricao |
|------|------|-----------|
| Migration | SQL | `ALTER TYPE veltzy.lead_status ADD VALUE 'archived'` |
| `leads.service.ts` | Modificar | Adicionar `bulkUpdateAssignedTo`, `bulkArchive`, `bulkDelete` |
| `use-bulk-leads.ts` | Novo hook | `useBulkTransfer`, `useBulkArchive`, `useBulkDelete`, `useBulkExport` |
| `deals.tsx` | Modificar | Adicionar state de selecao, barra contextual, toggle arquivados |
| `bulk-action-bar.tsx` | Novo componente | Barra contextual com contagem e botoes |
| `bulk-transfer-modal.tsx` | Novo componente | Modal de selecao de vendedor destino |
| `bulk-delete-dialog.tsx` | Novo componente | AlertDialog com input de confirmacao "EXCLUIR" |
| `bulk-archive-dialog.tsx` | Novo componente | Dialog de confirmacao simples |

### Schema da tabela `leads` (relevante)
```sql
status veltzy.lead_status NOT NULL DEFAULT 'new'
-- Enum atual: 'new' | 'qualifying' | 'open' | 'deal' | 'lost'
-- Precisa adicionar: 'archived'

assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL
```

### Schema da tabela `activity_logs`
```sql
CREATE TABLE veltzy.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,        -- 'bulk_delete', 'bulk_archive', 'bulk_transfer'
    resource_type TEXT NOT NULL,  -- 'lead'
    resource_id UUID,            -- NULL para bulk (multiplos IDs)
    metadata JSONB DEFAULT '{}'  -- { lead_ids: [...], count: N, target_user?: ... }
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Trigger `log_lead_activity` dispara por lead em bulk update (N logs de assigned_to) | Aceitavel — cada lead tera seu log individual + 1 log manual de bulk_transfer com metadata |
| Enum ALTER TYPE nao e reversivel facilmente | 'archived' e um valor permanente e desejado |
| Performance com 500+ leads selecionados | Batch de 50, progress feedback, otimistic updates |
| Seller tenta burlar frontend e chamar API de delete | RLS `vz_leads_delete` exige `is_company_admin()` — bloqueado no banco |

## Decisoes de Design

1. **Barra contextual (nao floating bar):** aparece no topo da tabela, empurrando o conteudo. Mais previsivel que floating.
2. **"Selecionar todos" seleciona apenas os visiveis:** Por ora, "selecionar todos" seleciona apenas os leads visiveis na tela atual. Uma nota informativa aparece quando ha mais leads do que os exibidos: "Mostrando X de Y leads — apenas os X visiveis serao afetados". Quando paginacao for implementada, esse comportamento sera revisitado.
3. **Excluir exige digitar "EXCLUIR":** padrao destrutivo forte para evitar acidentes.
4. **Arquivar e soft-delete via status:** nao e DELETE, apenas muda status. Recuperavel.
5. **Log manual para bulk operations:** alem dos triggers individuais, um log consolidado com todos os IDs.
