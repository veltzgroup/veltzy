# Auditoria: Dashboard
**Data:** 2026-04-26
**Area:** Dashboard (KPIs, graficos, inteligencia, performance)
**Escopo:** Pagina /dashboard, todos os componentes, hooks, services e integracao

---

## Semaforo Geral: 🟡 AMARELO

| Dimensao | Status | Gaps |
|----------|--------|------|
| 1. Funcional | 🟡 Amarelo | 4 gaps (1 critico, 1 alto, 2 medios) |
| 2. Dados | 🟡 Amarelo | 3 gaps (1 alto, 2 medios) |
| 3. Integracoes | 🟢 Verde | 1 gap (medio) |
| 4. UX/Visual | 🟢 Verde | 2 gaps (1 medio, 1 baixo) |
| 5. Comercial | 🟡 Amarelo | 2 gaps (1 alto, 1 medio) |

**Total: 12 gaps** (1 critico, 3 altos, 6 medios, 2 baixos)

### Comparacao com auditoria anterior (2026-04-25)

| Gap anterior | Status |
|-------------|--------|
| Nenhum error handling no service | ✅ CORRIGIDO — todos os services agora fazem `if (error) throw error` |
| Filtro periodo so afeta KPIs | ❌ PERSISTE — graficos e tabela ignoram periodo |
| 3 componentes nao usados | ���️ PARCIAL — PipelineOverviewCard integrada, LeadsBySourceChart e SellerPerformanceTable ainda fora |
| Nenhum loading state | ✅ CORRIGIDO — KPIs tem skeleton, componentes de inteligencia tem loading |
| Nenhum empty state | ⚠️ PARCIAL — NextActionsCard e BottleneckDetector tratam, pagina nao |
| Dashboard nao responsivo | ✅ CORRIGIDO — grid usa md: e lg: breakpoints |
| Hooks mortos | ❌ PERSISTE — useDashboardMetrics nunca usado |
| RPC schema errado | ✅ CORRIGIDO — usa supabase.rpc (public schema) |
| getSellerPerformance lista todos profiles | ❌ PERSISTE |
| getDashboardKpis client-side | ❌ PERSISTE — performance aceitavel ate ~5k leads |
| Timezone local vs tenant | ❌ PERSISTE |
| Greeting usa empresa | ❌ PERSISTE (design choice, nao bug) |

---

## Inventario

### Pagina
- `/dashboard` -> `src/pages/dashboard.tsx` (300 linhas)

### Componentes (src/components/dashboard/)
| Arquivo | Linhas | Status | Descricao |
|---------|--------|--------|-----------|
| pipeline-overview-card.tsx | 88 | ✅ Integrado | Visao pipeline com barras de progresso |
| follow-up-tips.tsx | 129 | ✅ Integrado | 3 cards de sugestoes inteligentes |
| monthly-comparison-grid.tsx | 189 | ✅ Integrado | 4 mini-charts comparativo mensal |
| next-actions-card.tsx | 182 | ✅ Integrado | 5 acoes recomendadas clicaveis |
| bottleneck-detector.tsx | 160 | ✅ Integrado | Detecta gargalos no pipeline |
| forecast-card.tsx | 115 | ✅ Integrado | Previsao de receita + meta |
| leads-by-source-chart.tsx | 70 | ❌ NAO integrado | PieChart de leads por origem |
| seller-performance-table.tsx | 94 | ❌ NAO integrado | Tabela de performance vendedores |
| kpi-card.tsx | 50 | ❌ NAO usado | KPIs sao inline na pagina |
| monthly-comparison-chart.tsx | 62 | ❌ NAO usado | Substituido por MonthlyComparisonGrid |
| pipeline-overview.tsx | 47 | ❌ NAO usado | Versao menor, substituido pelo Card |

### Hooks (src/hooks/)
| Hook | Status | Descricao |
|------|--------|-----------|
| useDashboardKpis | ✅ Usado | KPIs com filtro de periodo |
| useDashboardRealtime | ✅ Usado | Realtime subscription |
| usePipelineOverview | ✅ Usado | Stages com count/valor |
| useMonthlyComparisonGrid | ✅ Usado | 4 metricas mensais |
| useHistoricalConversionRates | ✅ Usado | Taxas historicas 90d |
| useLeadsBySource | ✅ Usado (componente) | Leads por origem |
| useSellerPerformance | ✅ Usado (componente) | Performance vendedores |
| useDashboardMetrics | ❌ Nunca usado | Codigo morto |
| useMonthlyComparison | ❌ Nunca usado | Substituido pelo Grid |

### Services (src/services/dashboard.service.ts — 299 linhas)
- getDashboardKpis ✅ — KPIs com filtro periodo, error handling
- getPipelineOverview ✅ — Stages + leads count/value
- getMonthlyComparisonGrid ✅ — Dados para 4 mini-charts
- getHistoricalConversionRates ✅ — Taxas por stage (90d)
- getLeadsBySource ✅ — Agrupamento por source
- getSellerPerformance ✅ — Performance por profile
- getConversionMetrics ❌ — Nunca usado (morto)

---

## Achados por Dimensao

### Dimensao 1: FUNCIONAL

#### 🔴 DF-01: Filtro de periodo so afeta KPIs — graficos e componentes ignoram
- **Severidade:** Critico
- **Arquivo:** `src/pages/dashboard.tsx`
- **Detalhe:** `selectedDays` e passado apenas para `useDashboardKpis(selectedDays)`. Os componentes NextActionsCard, BottleneckDetector, ForecastCard, PipelineOverviewCard, FollowUpTips e MonthlyComparisonGrid NAO recebem `days` como prop. Usuario seleciona "Hoje" mas graficos mostram dados de sempre. Isso confunde e quebra confianca.
- **Acao:** Propagar `selectedDays` como prop para todos os componentes. Components que usam `useLeads()` precisam passar filtro de periodo.

#### 🟠 DF-02: LeadsBySourceChart e SellerPerformanceTable construidos mas nao integrados
- **Severidade:** Alto
- **Arquivo:** `src/pages/dashboard.tsx`
- **Detalhe:** LeadsBySourceChart (PieChart por origem) e SellerPerformanceTable (tabela de vendedores) existem e funcionam, mas nao sao importados nem renderizados na pagina. O spec define layout com esses componentes. Dashboard fica incompleto sem distribuicao por origem e sem visibilidade de equipe.
- **Acao:** Integrar ambos na pagina: LeadsBySourceChart ao lado de PipelineOverviewCard, SellerPerformanceTable como secao propria com prop `days={selectedDays}`.

#### 🟡 DF-03: Nenhum error handling visual na pagina
- **Severidade:** Medio
- **Arquivo:** `src/pages/dashboard.tsx`
- **Detalhe:** A pagina usa `isLoading` para skeleton dos KPIs, mas nao trata `isError`. Se a query falhar, KPIs mostram `0` ou `R$ 0,00` sem indicacao de erro. Os services agora fazem `throw error`, mas o frontend nao captura.
- **Acao:** Adicionar verificacao `isError` com mensagem e botao retry, similar ao que foi feito no pipeline-board.

#### 🟡 DF-04: Codigo morto — hooks e services nunca usados
- **Severidade:** Medio
- **Arquivo:** `src/hooks/use-dashboard-metrics.ts`, `src/services/dashboard.service.ts`
- **Detalhe:** `useDashboardMetrics` e `getConversionMetrics` nunca sao importados. `useMonthlyComparison` e `getMonthlyComparison` substituidos pelo Grid. Polui bundle e confunde.
- **Acao:** Remover hooks e functions mortos ou integrar se ainda uteis.

---

### Dimensao 2: DADOS

#### 🟠 DD-01: getSellerPerformance lista todos os profiles, nao apenas sellers
- **Severidade:** Alto
- **Arquivo:** `src/services/dashboard.service.ts:258-298`
- **Detalhe:** Query busca profiles com `eq('company_id')` sem filtrar por role. Admins e super_admins aparecem na tabela com 0 leads atribuidos, poluindo a visualizacao.
- **Acao:** Filtrar profiles que tem role `seller` ou `manager` via join com `user_roles`, ou filtrar no frontend profiles com `leads_count > 0`.

#### 🟡 DD-02: getDashboardKpis carrega todos os leads no client-side
- **Severidade:** Medio
- **Arquivo:** `src/services/dashboard.service.ts:57-97`
- **Detalhe:** Busca TODOS os leads da empresa e calcula metricas no browser. Com 10k leads: ~500KB trafegados. Funciona ate ~5k, mas nao escala.
- **Acao:** Para producao, migrar para RPC que retorna objeto calculado via SQL. Prioridade baixa ate ter volume.

#### 🟡 DD-03: Timezone usa browser local em vez de America/Sao_Paulo
- **Severidade:** Medio
- **Arquivo:** `src/services/dashboard.service.ts` (multiplas funcoes)
- **Detalhe:** `new Date()` usa timezone do browser. CLAUDE.md define `America/Sao_Paulo`. Leads criados no final do dia podem ser contados no mes errado. Afeta getDashboardKpis, getMonthlyComparison, getMonthlyComparisonGrid.
- **Acao:** Usar `Intl.DateTimeFormat` com `timeZone: 'America/Sao_Paulo'` ou UTC+offset consistente.

**Pontos positivos:**
- ✅ Todos os services filtram por company_id
- ✅ Error handling (`if (error) throw error`) em todos os services
- ✅ Tipos TS alinhados com schema DB
- ✅ Realtime invalida 9 query keys quando leads mudam
- ✅ Indices estrategicos no banco (company_id + stage_id, temperature, etc)
- ✅ Historical conversion rates calcula janela de 90 dias

---

### Dimensao 3: INTEGRACOES

#### 🟡 DI-01: Dashboard nao tem export de dados
- **Severidade:** Medio
- **Detalhe:** Pipeline tem export CSV/PDF (adicionado no Sprint 1), mas dashboard nao oferece export de metricas ou relatorios. Gestores esperam poder baixar KPIs.
- **Acao:** Fase futura. Considerar botao "Exportar Relatorio" que gera PDF com snapshot dos KPIs e graficos.

**Pontos positivos:**
- ✅ Realtime funcional via Supabase (canal `dashboard:{companyId}`)
- ✅ NextActionsCard navega para /pipeline com filtros corretos
- ✅ ForecastCard integra com goals (metas) quando disponiveis
- ✅ BottleneckDetector usa historical rates (integracao cross-feature)

---

### Dimensao 4: UX/VISUAL

#### 🟡 DU-01: Greeting usa nome da empresa, nao do usuario
- **Severidade:** Medio
- **Arquivo:** `src/pages/dashboard.tsx:132`
- **Detalhe:** `Ola, {company?.name}!` — mostra nome da empresa. Seria mais pessoal com nome do usuario (profile.name). Nao e bug, mas e menos acolhedor.
- **Acao:** Buscar profile.name do auth store e usar: "Ola, [nome]!" com empresa como subtitulo.

#### 🟢 DU-02: SVG filter ID "glow" pode colidir
- **Severidade:** Baixo
- **Arquivo:** `src/pages/dashboard.tsx:40`
- **Detalhe:** `DecorativeLine` renderiza 3x com mesmo `id="glow"` e `id="kpiGradient"`. Em SVG, IDs devem ser unicos no DOM. Na pratica funciona porque browsers sao tolerantes, mas tecnicamente invalido.
- **Acao:** Usar ID unico por instancia ou extrair defs para um SVG global.

**Pontos positivos:**
- ✅ Design system consistente (shadcn/ui, CSS variables, tokens semanticos)
- ✅ Dark mode completo via CSS variables (3 temas: light, dark, sand)
- ✅ Loading skeletons em todos os componentes (KPIs, NextActions, Bottleneck, Forecast, PipelineOverview, FollowUpTips, MonthlyGrid)
- ✅ Responsivo: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` nos KPIs
- ✅ Graficos com tooltips customizados (glass-card style)
- ✅ Animacoes suaves (animate-fade-in, transition-smooth)
- ✅ Cores semanticas — nunca hardcoded

---

### Dimensao 5: COMERCIAL

#### 🟠 DC-01: Dashboard incompleto para demo — falta distribuicao por origem e performance vendedores
- **Severidade:** Alto
- **Detalhe:** O spec define LeadsBySourceChart e SellerPerformanceTable como parte do layout. Em demo, gestor pergunta "de onde vem meus leads?" e "como esta minha equipe?" — sem esses componentes, dashboard parece raso. Os componentes EXISTEM e FUNCIONAM, so nao estao na pagina.
- **Acao:** Integrar ambos (esforco minimo — sao imports + JSX).

#### 🟡 DC-02: Filtro de periodo inconsistente reduz confianca
- **Severidade:** Medio
- **Detalhe:** Gestor seleciona "Hoje" esperando ver tudo filtrado. KPIs mudam, mas graficos e cards de inteligencia continuam com dados globais. Em demo, isso gera confusao ("os numeros nao batem"). Quebra narrativa de CRM inteligente.
- **Acao:** Mesmo que DF-01 — propagar periodo para todos os componentes.

**Pontos positivos:**
- ✅ Cards de inteligencia (NextActions, Bottleneck, Forecast) impressionam em demo
- ✅ Forecast com progresso vs meta e diferencial competitivo forte
- ✅ BottleneckDetector mostra "pipeline saudavel" ou detecta gargalos automaticamente
- ✅ NextActionsCard com 5 acoes clicaveis (navega direto pro pipeline filtrado)
- ✅ FollowUpTips com 3 categorias (urgente, oportunidade, dica) — coaching automatico
- ✅ MonthlyComparisonGrid com 4 mini-charts e variacao % month-over-month
- ✅ Demonstravel em ~90 segundos com narrativa forte

**Pergunta-chave: "Se eu mostrar isso pro cliente amanha, ele assina hoje?"**
> Quase. Os cards de inteligencia (NextActions, Bottleneck, Forecast) sao o ponto forte e diferenciam o Veltzy. Mas sem Leads por Origem e Performance de Vendedores na pagina, o dashboard parece incompleto para um gestor. E o filtro de periodo inconsistente gera duvida. Corrigindo DF-01, DF-02 e DC-01, a resposta vira sim.

---

## Plano de Ataque (ordem priorizada)

### Sprint 1 — Antes de qualquer demo
| # | Gap | Severidade | Esforco |
|---|-----|-----------|---------|
| 1 | DF-01: Filtro periodo global | 🔴 Critico | Medio (propagar days para componentes + hooks) |
| 2 | DF-02/DC-01: Integrar LeadsBySource + SellerPerformance | 🟠 Alto | Baixo (imports + JSX na pagina) |
| 3 | DF-03: Error handling visual | 🟡 Medio | Baixo (isError + retry) |
| 4 | DU-01: Greeting com nome do usuario | 🟡 Medio | Minimo |

### Sprint 2 — Antes de producao
| # | Gap | Severidade | Esforco |
|---|-----|-----------|---------|
| 5 | DD-01: Filtrar sellers por role | 🟠 Alto | Baixo (filtrar no frontend ou join) |
| 6 | DF-04: Remover codigo morto | 🟡 Medio | Baixo |
| 7 | DD-03: Timezone consistente | 🟡 Medio | Medio |

### Backlog
| # | Gap | Severidade | Esforco |
|---|-----|-----------|---------|
| 8 | DD-02: Migrar KPIs para RPC | 🟡 Medio | Alto |
| 9 | DI-01: Export de relatorio | 🟡 Medio | Medio |
| 10 | DU-02: SVG filter ID unico | 🟢 Baixo | Minimo |
