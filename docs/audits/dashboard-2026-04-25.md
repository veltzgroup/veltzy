# Auditoria - Dashboard - 2026-04-25

## Sumario executivo
- Status geral: 🟠
- Gaps criticos: 2
- Gaps altos: 5
- Gaps medios: 5
- Gaps baixos: 4
- Pode mostrar pra cliente? Com ressalvas (KPIs funcionam, mas faltam graficos e o filtro de periodo nao afeta todos os componentes)
- Pode entrar em producao? Com ressalvas (sem tratamento de erros, sem loading states, dados podem parecer quebrados em telas menores)

## Inventario

### Arquivos auditados (9 core + 5 suporte)
| Arquivo | Linhas | Tipo |
|---------|--------|------|
| `src/pages/dashboard.tsx` | 241 | Pagina |
| `src/services/dashboard.service.ts` | 167 | Service |
| `src/hooks/use-dashboard-metrics.ts` | 63 | Hooks |
| `src/components/dashboard/kpi-card.tsx` | 49 | Componente (nao usado) |
| `src/components/dashboard/leads-by-source-chart.tsx` | 69 | Componente (nao usado na pagina) |
| `src/components/dashboard/monthly-comparison-chart.tsx` | 52 | Componente |
| `src/components/dashboard/pipeline-overview.tsx` | 42 | Componente (nao usado na pagina) |
| `src/components/dashboard/seller-performance-table.tsx` | 70 | Componente |
| `src/types/database.ts` | 442 | Types (secoes relevantes) |
| `supabase/migrations/006_team_reports.sql` | ~170 | Migration |
| `docs/phases/phase-05-dashboard-team.md` | 449 | Spec |

### Rotas
- `/` -> `DashboardPage` (lazy loaded, protegida por auth)

### Tabelas consultadas
- `leads` (status, deal_value, ai_score, assigned_to, source_id, stage_id, created_at)
- `pipeline_stages` (id, name, color, position)
- `lead_sources` (id, name, color)
- `profiles` (id, name, is_available, company_id)
- RPC: `get_seller_avg_response_times`

---

## Achados por dimensao

### Dimensao 1 - Funcional

#### 🔴 [Critico] Nenhum tratamento de erro no dashboard.service.ts
- **Arquivo:** `src/services/dashboard.service.ts` (todas as 6 funcoes)
- **Evidencia:** Grep por `error` retorna 0 matches. Nenhuma funcao faz `if (error) throw error` apos queries do Supabase. Todos os `{ data }` sao desestruturados sem checar `{ data, error }`.
- **Impacto:** Se qualquer query do Supabase falhar (timeout, RLS, rede), o service retorna `null`/`undefined` silenciosamente. Os hooks nao disparam `onError`. O usuario ve dados zerados sem saber que houve falha.
- **Reproducao:** Qualquer falha de rede ou timeout no Supabase faz o dashboard exibir todos os KPIs como 0 sem indicacao de erro.
- **Acao recomendada:** Adicionar `const { data, error } = await ...` + `if (error) throw error` em todas as 6 funcoes, seguindo o padrao ja usado em `leads.service.ts` e `pipeline.service.ts`.

#### 🔴 [Critico] Filtro de periodo so afeta KPIs - graficos e tabela ignoram o periodo selecionado
- **Arquivo:** `src/pages/dashboard.tsx:78`, `src/hooks/use-dashboard-metrics.ts`
- **Evidencia:** `selectedDays` e passado apenas para `useDashboardKpis(selectedDays)`. Os componentes `MonthlyComparisonChart` e `SellerPerformanceTable` nao recebem `days` como prop. Seus hooks (`useMonthlyComparison`, `useSellerPerformance`) nao aceitam parametro de periodo.
- **Impacto:** Usuario seleciona "Hoje" mas o grafico mensal e tabela de sellers mostram dados de sempre. Quebra a expectativa de que o filtro controla toda a pagina. O spec (fase 05 linha 439) define: "Filtro de periodo atualiza todos os graficos".
- **Reproducao:** Clicar em "Hoje" no dashboard - os KPIs mudam mas os graficos abaixo permanecem identicos.
- **Acao recomendada:** Propagar `selectedDays` para `MonthlyComparisonChart` e `SellerPerformanceTable` como prop. Atualizar os hooks correspondentes para aceitar `days?` e filtrar por periodo.

#### 🟠 [Alto] 3 componentes construidos mas nao usados na pagina
- **Arquivo:** `src/components/dashboard/kpi-card.tsx`, `leads-by-source-chart.tsx`, `pipeline-overview.tsx`
- **Evidencia:** Grep por `KpiCard`, `LeadsBySourceChart` e `PipelineOverview` em `src/pages/` retorna 0 matches. O `dashboard.tsx` nao importa nenhum deles.
- **Impacto:** O spec define layout com `Pipeline Overview (40%)`, `Leads by Source` e `Leads by Temperature` como secoes do dashboard. Nenhum esta presente. O dashboard mostra apenas KPIs inline + grafico mensal + tabela de sellers. Faltam 2 visualizacoes prontas (source chart, pipeline overview) e 1 nao implementada (temperature chart).
- **Acao recomendada:** Integrar `LeadsBySourceChart` e `PipelineOverview` na pagina conforme o layout do spec. `KpiCard` pode ser removido se o design inline atual for preferido.

#### 🟠 [Alto] Nenhum loading state em toda a pagina
- **Arquivo:** `src/pages/dashboard.tsx`, todos os componentes em `src/components/dashboard/`
- **Evidencia:** Grep por `isLoading`, `loading`, `skeleton`, `Loader` em `dashboard.tsx` e `src/components/dashboard/` retorna 0 matches. A pagina nao verifica `isLoading` de nenhum hook.
- **Impacto:** Ao abrir o dashboard ou trocar de periodo, o usuario ve cards com valor "0" ou "R$ 0,00" por 1-3 segundos ate os dados chegarem. Parece bug, nao carregamento. Com rede lenta, o efeito e mais evidente.
- **Acao recomendada:** Adicionar skeleton loaders nos KPI cards e nos componentes de grafico enquanto `isLoading` for true. O pipeline ja usa `<Loader2>` como referencia.

#### 🟠 [Alto] Nenhum estado vazio (empty state) quando nao ha dados
- **Arquivo:** Todos os componentes dashboard
- **Evidencia:** Quando `leads` retorna array vazio, os KPIs mostram 0, os graficos renderizam eixos sem barras, e a tabela de sellers retorna `null`. Nenhum componente exibe mensagem como "Nenhum dado para o periodo selecionado".
- **Impacto:** Empresa nova sem leads ve dashboard com tudo zerado e graficos vazios. Nao fica claro se esta funcionando ou quebrado. UX ruim para onboarding.
- **Acao recomendada:** Adicionar empty states com mensagem orientadora (ex: "Adicione leads no Pipeline para ver suas metricas aqui").

#### 🟡 [Medio] RPC chamada no schema errado - `veltzy().rpc()` vs `supabase.rpc()`
- **Arquivo:** `src/services/dashboard.service.ts:147`
- **Evidencia:** A funcao `get_seller_avg_response_times` esta definida em `public` (migration 006 linha 89: `CREATE OR REPLACE FUNCTION public.get_seller_avg_response_times`), mas e chamada via `veltzy().rpc(...)` que opera no schema `veltzy`.
- **Impacto:** Se o cliente Supabase `veltzy()` aponta para schema diferente de `public`, a RPC pode falhar ou retornar dados inesperados. Se ambos apontam para o mesmo endpoint, funciona por acidente.
- **Acao recomendada:** Verificar se `veltzy().rpc()` resolve funcoes no schema `public`. Se nao, trocar para `supabase.rpc('get_seller_avg_response_times', ...)` que e o cliente `public`.

#### 🟡 [Medio] `getSellerPerformance` lista todos os profiles, nao apenas sellers
- **Arquivo:** `src/services/dashboard.service.ts:145`
- **Evidencia:** Query busca `profiles` com `eq('company_id', companyId)` sem filtrar por role. Admins e super_admins aparecem na tabela de performance como "vendedores" com 0 leads.
- **Impacto:** Tabela de performance mostra usuarios irrelevantes (admin puro com 0 leads, 0 deals). Polui a visualizacao.
- **Acao recomendada:** Filtrar apenas profiles que tenham role `seller` ou `manager` na tabela `user_roles`, similar ao que foi feito no `transfer-lead-modal.tsx`.

#### 🟡 [Medio] `getDashboardKpis` carrega TODOS os leads no client-side para calcular metricas
- **Arquivo:** `src/services/dashboard.service.ts:55-93`
- **Evidencia:** A funcao faz `select('status, deal_value, ai_score')` sem limit e calcula tudo em JS (filter, reduce, length). Com 10k leads, sao ~500KB+ de dados trafegados e processados no browser.
- **Impacto:** Performance degrada com escala. Calculo de metricas deveria ser feito no banco (RPC ou view materializada).
- **Acao recomendada:** Criar RPC `get_dashboard_kpis(company_id, days?)` que retorna os 12 campos ja calculados via SQL (COUNT, SUM, AVG). Reduz payload de N registros para 1 objeto.

### Dimensao 2 - Dados

#### 🟡 [Medio] `getMonthlyComparison` usa timezone local do browser, nao do tenant
- **Arquivo:** `src/services/dashboard.service.ts:123-142`
- **Evidencia:** `new Date()` e `d.getMonth()` usam timezone local. Se um usuario no fuso UTC-3 acessa de outro fuso, o agrupamento mensal muda. O CLAUDE.md define fuso `America/Sao_Paulo` mas o codigo nao o aplica.
- **Impacto:** Leads criados no final do dia podem ser contados no mes errado dependendo do timezone do browser do usuario.
- **Acao recomendada:** Usar `toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })` ao agrupar, ou calcular no SQL com `AT TIME ZONE 'America/Sao_Paulo'`.

#### 🟡 [Medio] `conversionRate` arredondado para inteiro nos KPIs, mas para 1 decimal no ConversionMetrics
- **Arquivo:** `src/services/dashboard.service.ts:77` vs `src/services/dashboard.service.ts:35`
- **Evidencia:** `getDashboardKpis` usa `Math.round((closed.length / total) * 100)` (inteiro). `getConversionMetrics` usa `Math.round(c.rate * 10) / 10` (1 decimal). Inconsistencia de precisao.
- **Impacto:** Menor - afeta apenas consistencia visual se ambos forem exibidos. Atualmente so `getDashboardKpis` e usado.
- **Acao recomendada:** Padronizar para 1 decimal em ambos.

### Dimensao 3 - Integracoes

#### 🟠 [Alto] Hooks e services mortos: `useDashboardMetrics` e `getConversionMetrics` exportados mas nunca importados
- **Arquivo:** `src/hooks/use-dashboard-metrics.ts:5`, `src/services/dashboard.service.ts:18`
- **Evidencia:** Grep por `useDashboardMetrics` fora do proprio arquivo retorna 0 matches. `getConversionMetrics` so e importado pelo hook que nunca e usado.
- **Impacto:** Codigo morto no bundle. A funcao `getConversionMetrics` faz 2 queries ao Supabase e calcula period-over-period, mas nenhum componente consome esses dados. O `KpiCard` que deveria mostrar variacao (`change` prop) tambem nao e usado.
- **Acao recomendada:** Ou integrar na pagina (KpiCard com comparacao period-over-period usando `useDashboardMetrics`) ou remover para limpar o bundle.

### Dimensao 4 - UX/Visual

#### 🟠 [Alto] Dashboard nao e responsivo - grid fixo 3 colunas
- **Arquivo:** `src/pages/dashboard.tsx:129`
- **Evidencia:** `grid grid-cols-3 gap-6` sem breakpoints responsivos (`sm:`, `md:`, `lg:`). Grep confirma: nenhum breakpoint responsivo na pagina.
- **Impacto:** Em telas < 1024px, os 6 cards ficam espremidos ou overflow. Em mobile, ilegivel. O CLAUDE.md nao exige mobile-first, mas e SaaS web - tablets e telas menores sao esperados.
- **Acao recomendada:** Adicionar breakpoints: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.

#### 🟢 [Baixo] SVG filter `id="glow"` pode colidir se multiplas instancias
- **Arquivo:** `src/pages/dashboard.tsx:30`
- **Evidencia:** `DecorativeLine` define `<filter id="glow">` e e renderizado 3 vezes na pagina. IDs de SVG devem ser unicos no DOM.
- **Impacto:** Browsers modernos geralmente lidam bem com isso, mas tecnicamente o segundo e terceiro uso referenciam o primeiro filtro. Se o primeiro for removido do DOM (conditional render), os outros perdem o efeito.
- **Acao recomendada:** Usar `useId()` do React 18 para gerar IDs unicos, ou definir o filtro uma vez em um `<svg>` global.

#### 🟢 [Baixo] Greeting usa nome da empresa, nao do usuario
- **Arquivo:** `src/pages/dashboard.tsx:94`
- **Evidencia:** `Ola, {company?.name}!` mostra o nome da empresa. O spec nao especifica, mas e mais natural cumprimentar pelo nome do usuario.
- **Impacto:** Menor - funcional mas impessoal.
- **Acao recomendada:** Trocar para `profiles.name` ou `Ola, {user?.name}! - {company?.name}`.

#### 🟢 [Baixo] Tabela de sellers nao e ordenavel
- **Arquivo:** `src/components/dashboard/seller-performance-table.tsx`
- **Evidencia:** O spec (linha 321) define "Ordenavel por qualquer coluna". A implementacao e uma tabela estatica sem sorting.
- **Impacto:** Com muitos sellers, o usuario nao consegue rankear por conversao ou tempo de resposta.
- **Acao recomendada:** Adicionar state de sorting e onClick nos headers `<th>`.

### Dimensao 5 - Comercial

#### 🟢 [Baixo] Features definidas no spec mas nao implementadas
- **Evidencia comparativa spec vs codigo:**

| Feature do Spec | Status |
|-----------------|--------|
| 4 KPI cards com variacao vs periodo anterior | Parcial - 6 KPI cards inline sem variacao |
| Monthly Comparison Chart | Implementado |
| Pipeline Overview (40% da row) | Componente existe, nao integrado na pagina |
| Leads by Source chart | Componente existe, nao integrado na pagina |
| Leads by Temperature chart | Nao implementado |
| Seller Performance Table | Implementado (sem ordenacao) |
| AI Follow-up Tips | Nao implementado |
| Dashboard Period Filter como componente separado | Inline na pagina |
| Filtro de periodo afeta todos os graficos | Afeta apenas KPIs |
| Exportar CSV/PDF do dashboard | Nao integrado |

- **Impacto:** O dashboard entrega ~60% do spec. Para demo ou venda, as lacunas sao visiveis: faltam 2 graficos, variacao period-over-period, e o filtro nao funciona globalmente.
- **Acao recomendada:** Priorizar: (1) integrar componentes prontos (source chart, pipeline overview), (2) fazer filtro funcionar globalmente, (3) implementar temperature chart.

---

## Plano de ataque sugerido

### Bloco 1 - Correcoes criticas (devem ser feitas antes de qualquer demo)
1. **Tratamento de erros no dashboard.service.ts** - Adicionar `if (error) throw error` em todas as 6 funcoes. ~15 min.
2. **Filtro de periodo global** - Propagar `selectedDays` para `MonthlyComparisonChart` e `SellerPerformanceTable`. Atualizar hooks e services para aceitar `days?`. ~1h.

### Bloco 2 - Gaps altos (antes de producao real)
3. **Integrar componentes prontos** - Adicionar `LeadsBySourceChart` e `PipelineOverview` na pagina, no layout do spec. ~30 min.
4. **Loading states** - Skeleton loaders nos KPI cards e graficos. ~45 min.
5. **Empty states** - Mensagem quando nao ha dados. ~30 min.
6. **Responsividade** - Breakpoints no grid de KPIs e layout geral. ~30 min.
7. **Limpar codigo morto** - Decidir: integrar `KpiCard` com variacao ou remover. ~15 min.

### Bloco 3 - Gaps medios (antes de escalar)
8. **RPC para KPIs** - Mover calculo de metricas para SQL para performance. ~1-2h.
9. **Filtrar sellers na tabela** - Excluir admins sem leads da performance table. ~15 min.
10. **Corrigir schema da RPC** - `veltzy().rpc()` vs `supabase.rpc()`. ~5 min.
11. **Timezone** - Usar `America/Sao_Paulo` no agrupamento mensal. ~30 min.

### Bloco 4 - Polish (backlog)
12. SVG filter IDs unicos
13. Greeting com nome do usuario
14. Tabela de sellers ordenavel
15. Temperature chart (novo componente)
16. AI Follow-up Tips (novo componente)

---

## Resposta a pergunta final
"Em uma frase, qual e o motivo pelo qual o cliente vai pagar por isso?"

O dashboard entrega visibilidade instantanea do funil de vendas com KPIs de conversao, receita e performance da equipe - mas precisa do filtro de periodo funcionando globalmente e dos graficos faltantes integrados para sustentar a proposta de valor na demonstracao.
