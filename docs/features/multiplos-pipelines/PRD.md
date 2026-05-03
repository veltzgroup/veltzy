# PRD - Múltiplos Pipelines por Empresa

## 1. Problema

Atualmente o Veltzy opera com um único pipeline implícito por empresa. Todas as `pipeline_stages` pertencem diretamente à `company_id`, sem uma entidade `Pipeline` intermediária. Isso limita empresas que precisam de pipelines distintos para diferentes processos comerciais (ex: "Vendas B2B", "Vendas B2C", "Pós-venda", "Parcerias").

## 2. Solução

Criar uma entidade `pipelines` que agrupa estágios (`pipeline_stages`) e permite que cada empresa tenha múltiplos pipelines independentes. Leads passam a pertencer a um pipeline específico, e a UI permite alternar entre pipelines.

## 3. Requisitos Funcionais

### 3.1. Gestão de Pipelines
- Admin pode criar, editar, renomear e desativar pipelines
- Cada pipeline tem: nome, slug, cor, posição (ordenação) e flag `is_default`
- Sempre existe pelo menos 1 pipeline ativo por empresa
- O pipeline padrão (`is_default = true`) é onde novos leads caem por padrão
- Ao criar um pipeline, ele vem com 6 estágios padrão (mesmo comportamento atual)

### 3.2. Pipeline no Kanban
- Header do pipeline exibe seletor/tabs para alternar entre pipelines
- Cada pipeline mostra apenas seus próprios estágios e leads
- Drag & drop funciona normalmente dentro do pipeline ativo
- Não é possível arrastar lead entre pipelines (mover via ação explícita)

### 3.3. Leads e Pipeline
- Cada lead pertence a exatamente 1 pipeline (campo `pipeline_id`)
- Ao criar lead, ele entra no pipeline padrão (ou no pipeline selecionado)
- Lead pode ser movido de pipeline via ação de menu ("Mover para pipeline...")
- Ao mover, o lead vai para o primeiro estágio do pipeline destino

### 3.4. Configuração no Admin
- Aba "Pipeline" no admin passa a ter 2 níveis: lista de pipelines e gestão de estágios por pipeline
- Admin pode reordenar pipelines (posição)
- Admin pode definir qual é o pipeline padrão

### 3.5. Distribuição de Leads
- A distribuição de leads (round robin) continua funcionando por empresa
- Leads criados automaticamente via webhook Z-API (WhatsApp) são atribuídos ao pipeline marcado como `is_default = true` da empresa
- Se não houver pipeline padrão, usa o pipeline com menor `position`
- Leads manuais podem ser criados em qualquer pipeline

### 3.6. Comportamento do Inbox
- O chat do lead não muda com múltiplos pipelines
- O cabeçalho do chat exibe o pipeline atual do lead como informação secundária

### 3.7. Dashboard e Relatórios
- Dashboard continua mostrando métricas agregadas da empresa (todos os pipelines)
- Filtro de pipeline no dashboard (futuro - fora do escopo desta fase)

## 4. Requisitos Não Funcionais

- Migração retrocompatível: empresas existentes devem continuar funcionando sem ação manual
- Pipeline existente vira o pipeline padrão automaticamente
- Performance: queries não devem degradar com múltiplos pipelines (indexes adequados)
- RLS: isolamento por `company_id` continua sendo a regra principal

## 5. Schema Proposto

### Tabela `pipelines`
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
```

### Alterações em tabelas existentes
- `pipeline_stages`: adicionar `pipeline_id uuid references pipelines(id)`
- `leads`: adicionar `pipeline_id uuid references pipelines(id)`

### Migração de dados
- Para cada `company_id` distinto em `pipeline_stages`, criar um pipeline padrão
- Popular `pipeline_id` nos stages e leads existentes
- Tornar `pipeline_id` NOT NULL após migração

## 6. Componentes Afetados

| Componente | Mudança |
|---|---|
| `pipeline_stages` (tabela) | +pipeline_id FK |
| `leads` (tabela) | +pipeline_id FK |
| `pipeline.service.ts` | CRUD de pipelines + filtro por pipeline_id |
| `leads.service.ts` | Filtro por pipeline_id em queries |
| `use-pipeline-stages.ts` | Recebe pipelineId como parâmetro |
| `use-leads.ts` | Filtra por pipeline ativo |
| `pipeline.store.ts` | +activePipelineId |
| `pipeline-board.tsx` | Filtra por pipeline ativo |
| `pipeline-header.tsx` | Seletor de pipeline |
| `stage-manager-inline.tsx` | Gestão por pipeline |
| `pipeline-tab.tsx` (admin) | Lista de pipelines + gestão |
| `create-lead-modal.tsx` | Seleção de pipeline |
| `database.ts` (types) | Interface Pipeline |
| Trigger `on_company_created` | Cria pipeline padrão + estágios |

## 7. Riscos e Dependências

- **Migração de dados**: precisa ser idempotente e segura para empresas em produção
- **Trigger de criação de empresa**: precisa ser atualizado para criar pipeline + estágios
- **pipeline_sources**: tabela existente usa `pipeline_id` referenciando `pipeline_stages` (nome confuso) - precisará ser ajustada
- **Automações**: regras que referenciam `stage_id` continuam funcionando pois `stage_id` não muda
- **Inbox/Chat**: não afetado diretamente (opera no nível do lead, não do pipeline)

## 8. Fora do Escopo

- Filtro de pipeline no dashboard
- Permissões por pipeline (ex: vendedor só vê pipeline X)
- Templates de pipeline (criar pipeline a partir de modelo)
- Copiar estágios entre pipelines
