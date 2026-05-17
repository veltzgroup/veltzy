# PRD - Filtro de Pipeline no Dashboard e Negocios

## 1. Problema

Com multiplos pipelines por empresa (feature ja implementada), o Dashboard e a pagina de Negocios continuam mostrando metricas agregadas de todos os pipelines. O gestor nao consegue analisar performance por pipeline especifico (ex: "como esta meu pipeline B2B esta semana?").

## 2. Solucao

Adicionar filtro de pipeline no Dashboard e Negocios, reutilizando o `activePipelineId` do Zustand store como filtro global entre paginas. Quando o gestor seleciona um pipeline no Kanban, Dashboard e Negocios refletem automaticamente.

## 3. Decisoes ja tomadas

- **Dashboard:** filtro de pipeline no topo, ao lado do filtro de periodo existente. Aplica em todos os cards, KPIs e graficos.
- **Negocios:** coluna "Pipeline" na tabela + filtro de pipeline na barra de filtros.
- **Filtro independente por pagina:** cada pagina (Dashboard, Negocios, Kanban) mantem seu proprio estado de pipeline selecionado via `useState` local. Nao usa store global — trocar pipeline no Kanban NAO afeta Dashboard ou Negocios.
- **Opcao "Todos":** filtro inclui "Todos os pipelines" (valor `null`) — nao quebra quem tem 1 pipeline.
- **Coluna Pipeline:** aparece na tabela de Negocios apenas quando empresa tem >1 pipeline.

## 4. Requisitos Funcionais

### 4.1. Dashboard

- Filtro dropdown de pipeline ao lado dos botoes de periodo (Hoje/Semana/Mes/Total)
- Opcoes: "Todos os pipelines" + lista de pipelines ativos
- Filtro oculto quando empresa tem apenas 1 pipeline
- Quando pipeline selecionado:
  - KPIs filtram leads por `pipeline_id`
  - Pipeline Overview mostra apenas stages do pipeline selecionado
  - Leads by Source filtra por pipeline
  - Seller Performance filtra por pipeline
  - Monthly Comparison filtra por pipeline
  - Metrics Line Chart filtra por pipeline
  - Intelligence cards (NextActions, Bottleneck, Forecast) filtram por pipeline
- Quando "Todos": comportamento atual (agregado)

### 4.2. Negocios (Deals)

- Filtro dropdown de pipeline na barra de filtros existente
- Coluna "Pipeline" na tabela (nome + cor dot) — visivel so quando >1 pipeline
- Tabela filtra por pipeline selecionado
- KPI cards no topo filtram por pipeline
- Quando "Todos": mostra todos os deals de todos os pipelines

### 4.3. Filtro Local por Pagina

- Cada pagina usa `useState<string | null>(null)` para o pipeline selecionado
- Valor `null` = "Todos os pipelines" (sem filtro, comportamento padrao)
- Default ao abrir qualquer pagina: "Todos os pipelines"
- Kanban continua usando `activePipelineId` do Zustand store (comportamento existente, nao muda)
- Dashboard e Negocios NAO leem do store — filtro e independente

## 5. Requisitos Nao Funcionais

- Performance: queries nao devem degradar — `pipeline_id` ja tem indice
- Retrocompatibilidade: com 1 pipeline, UI identica a antes (filtro oculto)
- Cache: query keys devem incluir `activePipelineId` para invalidacao correta

## 6. Arquitetura Tecnica

### Services afetados

Todas as funcoes de `dashboard.service.ts` precisam aceitar `pipelineId?: string` como parametro opcional:
- `getDashboardKpis` — filtra leads por pipeline_id
- `getConversionMetrics` — filtra leads por pipeline_id
- `getPipelineOverview` — filtra stages por pipeline_id
- `getLeadsBySource` — filtra leads por pipeline_id
- `getMonthlyComparison` — filtra leads por pipeline_id
- `getMonthlyComparisonGrid` — filtra leads por pipeline_id
- `getHistoricalConversionRates` — filtra stages e leads por pipeline_id
- `getSellerPerformance` — filtra leads por pipeline_id

### Hooks afetados

Todos os hooks de `use-dashboard-metrics.ts` precisam ler `activePipelineId` do store:
- Query key inclui `activePipelineId`
- Passa para o service como parametro

### Componentes afetados

- `src/pages/dashboard.tsx` — renderiza filtro de pipeline
- `src/pages/deals.tsx` — renderiza filtro + coluna pipeline
- Componentes do dashboard recebem `pipelineId` via props (ja recebem `days`)

## 7. Riscos

- **Complexidade de queries:** adicionar filtro em 8+ funcoes do service — testar performance
- **Cache invalidation:** query keys precisam incluir `pipelineId` senao dados ficam stale
- **Intelligence cards:** NextActions e Bottleneck usam hooks separados — garantir que tambem filtram

## 8. Fora do Escopo

- Filtro de pipeline na pagina de Gestao
- Filtro de pipeline no Inbox
- Comparacao entre pipelines (ex: "Pipeline A vs Pipeline B")
- Metricas especificas por pipeline (ex: "tempo medio no pipeline B2B")
