# Spec - Filtro de Pipeline no Dashboard e Negocios

## 1. Arquitetura da Feature

### 1.1. Banco de Dados

Nenhuma migration necessaria. A tabela `leads` ja possui `stage_id` com FK para `pipeline_stages`, que por sua vez tem `pipeline_id`. O filtro sera aplicado via JOIN existente.

### 1.2. Services

**Arquivo:** `src/services/dashboard.service.ts`

Todas as funcoes recebem novo parametro opcional `pipelineId?: string`:

| Funcao | Filtro aplicado |
|--------|----------------|
| `getDashboardKpis(companyId, days?, pipelineId?)` | `.eq('pipeline_stages.pipeline_id', pipelineId)` via join com stages |
| `getPipelineOverview(companyId, days?, pipelineId?)` | `.eq('pipeline_id', pipelineId)` direto na query de stages |
| `getLeadsBySource(companyId, days?, pipelineId?)` | JOIN leads->stages filtrado por pipeline_id |
| `getMonthlyComparison(companyId, days?, pipelineId?)` | JOIN leads->stages filtrado por pipeline_id |
| `getMonthlyComparisonGrid(companyId, months?, pipelineId?)` | JOIN leads->stages filtrado por pipeline_id |
| `getHistoricalConversionRates(companyId, days?, pipelineId?)` | Filtra stages e leads por pipeline_id |
| `getSellerPerformance(companyId, days?, pipelineId?)` | JOIN leads->stages filtrado por pipeline_id |

**Estrategia de filtro:** Como `leads` tem `stage_id` (FK para `pipeline_stages`), e `pipeline_stages` tem `pipeline_id`, o filtro se aplica fazendo inner join: `leads.stage_id` -> `pipeline_stages` onde `pipeline_stages.pipeline_id = pipelineId`.

Na pratica com Supabase:
```typescript
let query = supabase
  .from('leads')
  .select('*, pipeline_stages!inner(pipeline_id)')
  .eq('company_id', companyId)

if (pipelineId) {
  query = query.eq('pipeline_stages.pipeline_id', pipelineId)
}
```

### 1.3. Hooks

**Arquivo:** `src/hooks/use-dashboard-metrics.ts`

Todos os hooks recebem `pipelineId?: string | null` como segundo parametro:

```typescript
export const useDashboardKpis = (days?: number, pipelineId?: string | null) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['dashboard-kpis', companyId, days, pipelineId],
    queryFn: () => getDashboardKpis(companyId!, days, pipelineId ?? undefined),
    enabled: !!companyId,
  })
}
```

Hooks afetados:
- `useDashboardKpis(days?, pipelineId?)`
- `useLeadsBySource(days?, pipelineId?)`
- `usePipelineOverview(days?, pipelineId?)`
- `useMonthlyComparison(days?, pipelineId?)`
- `useMonthlyComparisonGrid(months?, pipelineId?)`
- `useHistoricalConversionRates(days?, pipelineId?)`
- `useSellerPerformance(days?, pipelineId?)`

### 1.4. Componentes

**Novo componente:** `src/components/shared/pipeline-filter.tsx`

Dropdown reutilizavel entre Dashboard e Negocios:

```typescript
interface PipelineFilterProps {
  value: string | null           // null = "Todos"
  onChange: (id: string | null) => void
  pipelines: Pipeline[]          // lista de pipelines da empresa
}
```

- Recebe `pipelines` via props (quem consome chama `usePipelines()` e passa o array)
- Opcao "Todos os pipelines" com valor `null`
- Retorna `null` se `pipelines.length <= 1` (nao renderiza)
- Usa shadcn `Select` com dot colorido por pipeline

### 1.5. Paginas

**`src/pages/dashboard.tsx`** - Alteracoes:
- Novo state: `const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)`
- Renderiza `<PipelineFilter>` ao lado dos botoes de periodo
- Passa `selectedPipelineId` para todos os hooks de metricas
- Passa `selectedPipelineId` para componentes de intelligence (NextActions, Bottleneck, Forecast)

**`src/pages/deals.tsx`** - Alteracoes:
- Novo state: `const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)`
- Renderiza `<PipelineFilter>` na barra de filtros
- Filtra leads por pipeline no client-side (leads ja vem com stage -> pipeline_id)
- Nova coluna "Pipeline" na tabela (visivel apenas quando >1 pipeline)
- KPIs no topo respeitam o filtro

---

## 2. Lista de Arquivos

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/shared/pipeline-filter.tsx` | CRIAR | Dropdown reutilizavel de selecao de pipeline |
| `src/services/dashboard.service.ts` | MODIFICAR | Adicionar parametro `pipelineId` em todas as 7 funcoes |
| `src/hooks/use-dashboard-metrics.ts` | MODIFICAR | Adicionar `pipelineId` nos query keys e passar para services |
| `src/pages/dashboard.tsx` | MODIFICAR | State local + renderizar filtro + passar para hooks |
| `src/pages/deals.tsx` | MODIFICAR | State local + renderizar filtro + coluna pipeline + filtro client-side |

---

## 3. Criterios de Aceite

### Dashboard
- [x] Filtro de pipeline aparece ao lado dos botoes de periodo
- [x] Filtro oculto quando empresa tem apenas 1 pipeline
- [x] Selecionar pipeline filtra KPIs corretamente
- [x] Pipeline Overview mostra apenas stages do pipeline selecionado
- [x] Leads by Source filtra por pipeline
- [x] Seller Performance filtra por pipeline
- [x] Monthly Comparison filtra por pipeline
- [x] Metrics Line Chart filtra por pipeline
- [x] Intelligence cards (NextActions, Bottleneck, Forecast) filtram por pipeline
- [x] "Todos os pipelines" mostra dados agregados (comportamento padrao)
- [x] Trocar filtro de pipeline nao reseta o filtro de periodo
- [x] Query keys incluem pipelineId (cache correto)

### Negocios
- [x] Filtro de pipeline aparece na barra de filtros
- [x] Filtro oculto quando empresa tem apenas 1 pipeline
- [x] Tabela filtra deals por pipeline selecionado
- [x] Coluna "Pipeline" aparece na tabela quando >1 pipeline
- [x] Coluna mostra nome + dot com cor do pipeline
- [x] KPI cards no topo filtram por pipeline
- [x] "Todos os pipelines" mostra todos os deals

### Geral
- [x] Filtro e independente por pagina (trocar no Dashboard nao afeta Negocios)
- [x] Default ao abrir pagina: "Todos os pipelines" (null)
- [x] Performance: sem degradacao perceptivel nas queries
- [x] Loading state correto ao trocar pipeline (skeleton nos cards)
- [x] Retrocompativel: empresa com 1 pipeline ve UI identica a antes

---

## 4. Regras de Negocio

1. `pipelineId = null` significa "todos" — nenhum filtro aplicado, queries rodam como antes
2. Filtro por pagina via `useState` local — NAO usa Zustand store
3. O Kanban continua usando `activePipelineId` do store (nao muda)
4. A coluna "Pipeline" na tabela de Negocios so renderiza se `pipelines.length > 1`
5. O dropdown so renderiza se `pipelines.length > 1`

---

## 5. Implementacao Sugerida (ordem)

1. Criar `pipeline-filter.tsx` (componente reutilizavel)
2. Modificar `dashboard.service.ts` (adicionar pipelineId em todas as funcoes)
3. Modificar `use-dashboard-metrics.ts` (query keys + parametro)
4. Modificar `dashboard.tsx` (state + filtro + props)
5. Modificar `deals.tsx` (state + filtro + coluna + client-side filter)
6. Testes unitarios dos services e hooks
7. Teste manual no navegador
