# Spec - Múltiplos Pipelines por Empresa

> Baseado em: [PRD - Múltiplos Pipelines](./PRD.md)

---

## 1. Arquitetura

### 1.1. Nova Tabela: `pipelines`

```sql
create table public.pipelines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  slug text not null,
  color text not null default '#6B7280',
  position integer not null default 0,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, slug)
);

-- Índices
create index idx_pipelines_company on pipelines(company_id);
create index idx_pipelines_company_active on pipelines(company_id, is_active);

-- RLS
alter table pipelines enable row level security;

create policy "Members can view pipelines"
  on pipelines for select
  using (company_id = get_current_company_id() or is_super_admin());

create policy "Admins can manage pipelines"
  on pipelines for all
  using (company_id = get_current_company_id() and is_company_admin() or is_super_admin());

-- Trigger updated_at
create trigger set_pipelines_updated_at
  before update on pipelines
  for each row execute function handle_updated_at();

-- Constraint: apenas 1 default por empresa (via trigger)
create or replace function ensure_single_default_pipeline()
returns trigger as $$
begin
  if NEW.is_default = true then
    update pipelines
    set is_default = false
    where company_id = NEW.company_id
      and id != NEW.id
      and is_default = true;
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create trigger ensure_single_default_pipeline_trigger
  before insert or update of is_default on pipelines
  for each row execute function ensure_single_default_pipeline();
```

### 1.2. Alteração: `pipeline_stages`

```sql
-- Adicionar coluna
alter table pipeline_stages add column pipeline_id uuid references pipelines(id) on delete cascade;

-- Índice
create index idx_pipeline_stages_pipeline on pipeline_stages(pipeline_id);
```

### 1.3. Alteração: `leads`

```sql
-- Adicionar coluna
alter table leads add column pipeline_id uuid references pipelines(id) on delete set null;

-- Índice
create index idx_leads_pipeline on leads(pipeline_id);
```

### 1.4. Migração de Dados (idempotente)

```sql
-- Para cada company que tem stages, criar pipeline padrão
insert into pipelines (company_id, name, slug, color, position, is_default, is_active)
select distinct
  company_id,
  'Pipeline Principal',
  'principal',
  '#3B82F6',
  0,
  true,
  true
from pipeline_stages
where company_id not in (select company_id from pipelines)
on conflict (company_id, slug) do nothing;

-- Popular pipeline_id nos stages existentes
update pipeline_stages ps
set pipeline_id = p.id
from pipelines p
where ps.company_id = p.company_id
  and p.is_default = true
  and ps.pipeline_id is null;

-- Popular pipeline_id nos leads existentes
update leads l
set pipeline_id = p.id
from pipelines p
where l.company_id = p.company_id
  and p.is_default = true
  and l.pipeline_id is null;

-- Tornar NOT NULL após migração
alter table pipeline_stages alter column pipeline_id set not null;
alter table leads alter column pipeline_id set not null;
```

### 1.5. Atualizar Trigger de Criação de Empresa

O trigger `create_default_pipeline_for_company` atual cria 6 stages diretamente. Precisa ser substituído para:

1. Criar um pipeline padrão (`is_default = true`)
2. Criar os 6 stages vinculados ao pipeline

```sql
create or replace function create_default_pipeline_for_company()
returns trigger as $$
declare
  pipeline_id uuid;
begin
  -- Criar pipeline padrão
  insert into pipelines (company_id, name, slug, color, position, is_default, is_active)
  values (NEW.id, 'Pipeline Principal', 'principal', '#3B82F6', 0, true, true)
  returning id into pipeline_id;

  -- Criar estágios padrão vinculados ao pipeline
  insert into pipeline_stages (company_id, pipeline_id, name, slug, position, color, is_final, is_positive) values
    (NEW.id, pipeline_id, 'Novo Lead',        'novo-lead',        0, '#3B82F6', false, null),
    (NEW.id, pipeline_id, 'Qualificando',     'qualificando',     1, '#F59E0B', false, null),
    (NEW.id, pipeline_id, 'Em Negociacao',    'em-negociacao',    2, '#8B5CF6', false, null),
    (NEW.id, pipeline_id, 'Proposta Enviada', 'proposta-enviada', 3, '#06B6D4', false, null),
    (NEW.id, pipeline_id, 'Fechado (Ganho)',  'fechado-ganho',    4, '#22C55E', true,  true),
    (NEW.id, pipeline_id, 'Perdido',          'perdido',          5, '#EF4444', true,  false);

  return NEW;
end;
$$ language plpgsql security definer set search_path = public;
```

---

## 2. Lista de Arquivos

### Novos arquivos

| Arquivo | Descrição |
|---|---|
| `supabase/migrations/NNN_multiplos_pipelines.sql` | Migration: tabela pipelines + alterações em stages/leads + migração de dados + trigger atualizado |
| `src/services/pipelines.service.ts` | CRUD de pipelines (separado do pipeline.service.ts que gerencia stages) |
| `src/hooks/use-pipelines.ts` | Hook React Query para CRUD de pipelines |
| `src/components/pipeline/pipeline-selector.tsx` | Componente de seleção/tabs para alternar entre pipelines |
| `src/components/admin/pipeline-list-manager.tsx` | Gestão de pipelines no admin (criar, renomear, reordenar, definir padrão, desativar) |
| `src/components/pipeline/move-pipeline-modal.tsx` | Modal para mover lead entre pipelines |

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/types/database.ts` | + interface `Pipeline`, + `pipeline_id` em `Lead`, `CreateLeadInput`, `PipelineStage` |
| `src/stores/pipeline.store.ts` | + `activePipelineId`, `setActivePipelineId` |
| `src/services/pipeline.service.ts` | Stages filtram por `pipeline_id` em vez de só `company_id` |
| `src/services/leads.service.ts` | `getLeadsByCompany` filtra por `pipeline_id`; `createLead` inclui `pipeline_id` |
| `src/hooks/use-pipeline-stages.ts` | Recebe `pipelineId` como parâmetro, query key inclui pipelineId |
| `src/hooks/use-leads.ts` | Filtra por `pipeline_id` do store |
| `src/components/pipeline/pipeline-board.tsx` | Integra PipelineSelector no header; passa pipelineId para hooks |
| `src/components/pipeline/pipeline-header.tsx` | Remove gestão de estágios (vai para admin); adiciona slot para PipelineSelector |
| `src/components/pipeline/create-lead-modal.tsx` | Recebe `pipelineId`, envia na criação do lead |
| `src/components/admin/pipeline-tab.tsx` | Adiciona PipelineListManager acima do StageManagerInline; StageManagerInline filtra por pipeline selecionado |
| `src/components/admin/stage-manager-inline.tsx` | Recebe `pipelineId` como prop, filtra stages por pipeline |
| `src/components/pipeline/lead-card.tsx` | + opção "Mover para pipeline..." no dropdown menu |
| `src/components/inbox/chat-header.tsx` | Exibe nome do pipeline do lead como info secundária |
| `supabase/functions/zapi-webhook/index.ts` | Busca pipeline padrão para setar `pipeline_id` no lead |
| `supabase/functions/instagram-webhook/index.ts` | Busca pipeline padrão para setar `pipeline_id` no lead |
| `supabase/functions/source-webhook/index.ts` | Busca pipeline padrão para setar `pipeline_id` no lead |
| `supabase/functions/run-automations/index.ts` | Sem mudança direta (opera em stage_id, que continua funcionando) |

---

## 3. Detalhamento por Arquivo

### 3.1. `src/types/database.ts`

```typescript
// Nova interface
export interface Pipeline {
  id: string
  company_id: string
  name: string
  slug: string
  color: string
  position: number
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

// Adicionar a PipelineStage
export interface PipelineStage {
  // ... campos existentes
  pipeline_id: string  // NOVO
}

// Adicionar a Lead
export interface Lead {
  // ... campos existentes
  pipeline_id: string  // NOVO
}

// Adicionar a CreateLeadInput
export interface CreateLeadInput {
  // ... campos existentes
  pipeline_id: string  // NOVO (obrigatório)
}

// Adicionar a LeadWithDetails
export interface LeadWithDetails extends Lead {
  // ... campos existentes
  pipelines?: Pipeline | null  // NOVO (join)
}
```

### 3.2. `src/services/pipelines.service.ts` (NOVO)

```typescript
// CRUD de pipelines
getPipelines(companyId: string): Promise<Pipeline[]>
  // select * from pipelines where company_id = X and is_active = true order by position

getPipelineById(companyId: string, pipelineId: string): Promise<Pipeline>

createPipeline(companyId: string, input: { name: string; slug: string; color: string }): Promise<Pipeline>
  // insert + criar 6 estágios padrão (mesma lógica do trigger)
  // position = max(position) + 1

updatePipeline(companyId: string, pipelineId: string, input: Partial<Pick<Pipeline, 'name' | 'slug' | 'color' | 'is_default' | 'is_active'>>): Promise<Pipeline>

deletePipeline(companyId: string, pipelineId: string): Promise<void>
  // soft delete: is_active = false
  // NÃO permitir deletar se for o único pipeline ativo
  // NÃO permitir deletar se tiver leads vinculados (orientar mover antes)

reorderPipelines(companyId: string, items: { id: string; position: number }[]): Promise<void>

setDefaultPipeline(companyId: string, pipelineId: string): Promise<void>
  // update is_default = true (trigger cuida de desmarcar outros)

getDefaultPipeline(companyId: string): Promise<Pipeline>
  // is_default = true OR fallback menor position
```

### 3.3. `src/hooks/use-pipelines.ts` (NOVO)

```typescript
usePipelines()
  // query key: ['pipelines', companyId]
  // retorna pipelines ativos ordenados por position

useCreatePipeline()
  // mutation, invalidates ['pipelines']
  // toast.success("Pipeline criado com sucesso")

useUpdatePipeline()
  // mutation, invalidates ['pipelines']

useDeletePipeline()
  // mutation, invalidates ['pipelines']
  // toast.success("Pipeline desativado")

useReorderPipelines()
  // mutation, invalidates ['pipelines']

useSetDefaultPipeline()
  // mutation, invalidates ['pipelines']
  // toast.success("Pipeline padrão atualizado")
```

### 3.4. `src/stores/pipeline.store.ts` (MODIFICAR)

```typescript
interface PipelineState {
  // ... existente
  activePipelineId: string | null  // NOVO
  setActivePipelineId: (id: string | null) => void  // NOVO
}
```

Lógica: se `activePipelineId` for null, usar o pipeline `is_default = true`. Essa lógica fica no componente, não no store.

### 3.5. `src/services/pipeline.service.ts` (MODIFICAR)

```typescript
// ANTES: getPipelineStages(companyId)
// DEPOIS: getPipelineStages(companyId, pipelineId)
getPipelineStages(companyId: string, pipelineId: string): Promise<PipelineStage[]>
  // select * from pipeline_stages
  // where company_id = X and pipeline_id = Y
  // order by position

// createStage: adicionar pipeline_id ao insert
createStage(companyId: string, pipelineId: string, input: {...}): Promise<PipelineStage>

// deleteStage, updateStage, reorderStages: sem mudança na assinatura
// (operam por stageId que já é único)
```

### 3.6. `src/hooks/use-pipeline-stages.ts` (MODIFICAR)

```typescript
// ANTES: usePipelineStages()
// DEPOIS: usePipelineStages(pipelineId)
usePipelineStages(pipelineId: string | null)
  // query key: ['pipeline-stages', companyId, pipelineId]
  // enabled: !!companyId && !!pipelineId
  // chama getPipelineStages(companyId, pipelineId)

// useCreateStage: recebe pipelineId no mutationFn
useCreateStage(pipelineId: string)
```

### 3.7. `src/services/leads.service.ts` (MODIFICAR)

```typescript
// getLeadsByCompany: adicionar filtro pipeline_id
getLeadsByCompany(companyId: string, filters: LeadFilters & { pipelineId: string })
  // .eq('pipeline_id', filters.pipelineId) adicionado à query

// createLead: pipeline_id agora é obrigatório no input
createLead(companyId: string, input: CreateLeadInput)
  // input.pipeline_id incluído no insert

// NOVO: moveLeadToPipeline
moveLeadToPipeline(companyId: string, leadId: string, targetPipelineId: string): Promise<void>
  // 1. Buscar primeiro estágio do pipeline destino (order by position, limit 1)
  // 2. Update lead: pipeline_id = targetPipelineId, stage_id = primeiroEstágio.id
```

### 3.8. `src/hooks/use-leads.ts` (MODIFICAR)

```typescript
// useLeads: ler activePipelineId do store e passar como filtro
useLeads()
  // pega activePipelineId do store
  // query key: ['leads', companyId, pipelineId, ...outrosFiltros]
  // enabled: !!companyId && !!pipelineId

// NOVO: useMoveLeadToPipeline
useMoveLeadToPipeline()
  // mutation que chama moveLeadToPipeline
  // invalidates ['leads']
  // toast.success("Lead movido para {pipelineName}")
```

### 3.9. `src/components/pipeline/pipeline-selector.tsx` (NOVO)

Componente de tabs/seletor horizontal no topo do Kanban.

```
Props:
  pipelines: Pipeline[]
  activePipelineId: string
  onSelect: (pipelineId: string) => void

Comportamento:
  - Renderiza tabs horizontais com nome e cor de cada pipeline
  - Tab ativa tem indicador visual (borda inferior colorida ou bg)
  - Se houver apenas 1 pipeline, não renderiza (oculta seletor)
  - Scroll horizontal se muitos pipelines (overflow-x-auto)

Design:
  - Usa tokens do design system
  - Cor do pipeline como accent na tab ativa
  - Badge com contagem de leads por pipeline (opcional, pode ser v2)
```

### 3.10. `src/components/pipeline/pipeline-board.tsx` (MODIFICAR)

```
Mudanças:
  1. Importar usePipelines + PipelineSelector
  2. Ler activePipelineId do store (ou fallback para pipeline default)
  3. Renderizar PipelineSelector acima do PipelineHeader
  4. Passar pipelineId para usePipelineStages(pipelineId)
  5. Passar pipelineId para useLeads (via store)
  6. Passar pipelineId para CreateLeadModal
  7. Adicionar MovePipelineModal (aberto via lead-card menu)

Fluxo de inicialização:
  1. usePipelines() carrega pipelines da empresa
  2. Se activePipelineId do store for null → setar para pipeline.is_default
  3. usePipelineStages(activePipelineId) carrega stages
  4. useLeads() filtra por activePipelineId
```

### 3.11. `src/components/pipeline/pipeline-header.tsx` (MODIFICAR)

```
Mudanças menores:
  - O header continua com search, filtros de temperatura, source, etc.
  - PipelineSelector fica ACIMA do header (no board), não dentro dele
  - Sem mudanças estruturais significativas
```

### 3.12. `src/components/pipeline/create-lead-modal.tsx` (MODIFICAR)

```
Mudanças:
  - Receber prop pipelineId: string
  - Remover seletor de stage inicial (stage virá do pipeline ativo)
  - Stage select continua, mas filtra stages do pipeline ativo
  - Enviar pipeline_id no createLead
  - Se aberto via lead-card dropdown "Novo Lead" em um stage, pre-selecionar esse stage
```

### 3.13. `src/components/pipeline/move-pipeline-modal.tsx` (NOVO)

```
Props:
  leadId: string
  leadName: string
  currentPipelineId: string
  open: boolean
  onClose: () => void

Comportamento:
  - Lista pipelines disponíveis (exceto o atual)
  - Ao selecionar, confirma: "Mover {leadName} para {pipelineName}? O lead irá para o primeiro estágio."
  - Chama useMoveLeadToPipeline
  - Fecha modal e mostra toast de sucesso

Design:
  - Dialog shadcn/ui com lista de pipelines
  - Cada item mostra cor + nome do pipeline
  - Botão confirmar com variant destructive (ação irreversível de contexto)
```

### 3.14. `src/components/pipeline/lead-card.tsx` (MODIFICAR)

```
Mudanças:
  - Adicionar item no DropdownMenu: "Mover para pipeline..."
  - Ao clicar, abrir MovePipelineModal
  - Visível apenas para admin/manager
  - Ícone: ArrowRightLeft (Lucide)
```

### 3.15. `src/components/admin/pipeline-tab.tsx` (MODIFICAR)

```
Mudanças:
  - Adicionar PipelineListManager no topo
  - StageManagerInline recebe pipelineId do pipeline selecionado na lista
  - Layout: PipelineListManager (lista de pipelines) → ao selecionar um → StageManagerInline (estágios desse pipeline)
```

### 3.16. `src/components/admin/pipeline-list-manager.tsx` (NOVO)

```
Comportamento:
  - Lista pipelines com drag-reorder (dnd-kit)
  - Cada item: drag handle, cor (color picker), nome (editável), badge "Padrão" se is_default, toggle ativo/inativo
  - Botão "Novo Pipeline" abre form inline (nome + cor)
  - Ao criar, gera slug automaticamente do nome (slugify)
  - Clicar no pipeline seleciona para editar estágios (abaixo)
  - Definir como padrão via menu ou toggle
  - Não permite desativar o único pipeline ativo
  - Não permite desativar pipeline com leads (mostra aviso)

Design:
  - Similar ao StageManagerInline (consistência visual)
  - Cards com borda esquerda colorida (pipeline.color)
```

### 3.17. `src/components/admin/stage-manager-inline.tsx` (MODIFICAR)

```
Mudanças:
  - Receber prop pipelineId: string
  - useCreateStage passa pipelineId
  - Header mostra nome do pipeline selecionado
  - Se nenhum pipeline selecionado, mostra empty state
```

### 3.18. `src/components/inbox/chat-header.tsx` (MODIFICAR)

```
Mudanças:
  - Buscar pipeline do lead (join já existe via LeadWithDetails)
  - Exibir nome do pipeline como texto secundário pequeno abaixo do stage
  - Ex: "Em Negociação · Pipeline B2B"
  - Só exibe se empresa tiver mais de 1 pipeline
```

### 3.19. Edge Functions (MODIFICAR)

**`zapi-webhook/index.ts`**, **`instagram-webhook/index.ts`**, **`source-webhook/index.ts`**:

```typescript
// ANTES: busca primeiro stage da empresa
const { data: stage } = await supabase
  .from('pipeline_stages')
  .select('id')
  .eq('company_id', companyId)
  .order('position')
  .limit(1)
  .single()

// DEPOIS: busca pipeline padrão, depois primeiro stage desse pipeline
const { data: pipeline } = await supabase
  .from('pipelines')
  .select('id')
  .eq('company_id', companyId)
  .eq('is_default', true)
  .single()

// Fallback: se não tem default, pega menor position
const pipelineId = pipeline?.id ?? (await supabase
  .from('pipelines')
  .select('id')
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('position')
  .limit(1)
  .single()
).data?.id

const { data: stage } = await supabase
  .from('pipeline_stages')
  .select('id')
  .eq('pipeline_id', pipelineId)
  .order('position')
  .limit(1)
  .single()

// No insert do lead, adicionar pipeline_id
{ ..., pipeline_id: pipelineId, stage_id: stage?.id }
```

---

## 4. Critérios de Aceite

### Gestão de Pipelines (Admin)
- [ ] Admin consegue criar novo pipeline com nome e cor
- [ ] Admin consegue renomear pipeline
- [ ] Admin consegue alterar cor do pipeline
- [ ] Admin consegue reordenar pipelines via drag & drop
- [ ] Admin consegue definir pipeline padrão
- [ ] Admin consegue desativar pipeline (sem leads)
- [ ] Não é possível desativar o único pipeline ativo
- [ ] Não é possível desativar pipeline com leads vinculados
- [ ] Ao criar pipeline, 6 estágios padrão são criados automaticamente
- [ ] Slug é gerado automaticamente do nome

### Kanban (Pipeline Board)
- [ ] Seletor de pipeline visível no topo do Kanban
- [ ] Seletor oculto se empresa tem apenas 1 pipeline
- [ ] Ao trocar pipeline, Kanban mostra estágios e leads do pipeline selecionado
- [ ] Drag & drop funciona normalmente dentro do pipeline ativo
- [ ] Filtros (search, temperatura, fonte, vendedor) funcionam por pipeline
- [ ] Celebration ao fechar negócio continua funcionando

### Leads
- [ ] Lead é criado com pipeline_id do pipeline ativo
- [ ] Lead pode ser movido para outro pipeline via menu do card
- [ ] Ao mover de pipeline, lead vai para primeiro estágio do destino
- [ ] Toast de confirmação ao mover lead de pipeline

### Gestão de Estágios (Admin)
- [ ] Estágios são filtrados por pipeline selecionado no admin
- [ ] Criar estágio vincula ao pipeline selecionado
- [ ] Reordenar estágios funciona dentro do pipeline

### Retrocompatibilidade
- [ ] Empresas existentes continuam funcionando sem ação manual
- [ ] Pipeline "Principal" criado automaticamente com is_default = true
- [ ] Todos os stages e leads existentes vinculados ao pipeline padrão
- [ ] Novas empresas criam pipeline + estágios automaticamente via trigger

### Webhooks / Distribuição
- [ ] Lead via WhatsApp (Z-API) entra no pipeline padrão
- [ ] Lead via Instagram entra no pipeline padrão
- [ ] Lead via webhook genérico entra no pipeline padrão
- [ ] Fallback para pipeline com menor position se não houver padrão

### Inbox
- [ ] Chat header exibe nome do pipeline como info secundária
- [ ] Info do pipeline só aparece se empresa tem mais de 1 pipeline

### RLS e Segurança
- [ ] RLS isolamento por company_id na tabela pipelines
- [ ] Apenas admins podem criar/editar/desativar pipelines
- [ ] Sellers veem todos os pipelines (read-only)
- [ ] Super admin bypass funciona

### Performance
- [ ] Índices em pipelines(company_id), pipeline_stages(pipeline_id), leads(pipeline_id)
- [ ] Queries não degradam com múltiplos pipelines

### Loading e Error States
- [ ] Skeleton loading ao trocar de pipeline
- [ ] Error state com retry se falhar ao carregar pipelines
- [ ] Toast de erro em mutations que falham

---

## 5. Fora do Escopo

- Filtro de pipeline no dashboard
- Permissões por pipeline (vendedor só vê pipeline X)
- Templates de pipeline (criar a partir de modelo)
- Copiar estágios entre pipelines
- Badge com contagem de leads por pipeline no seletor
