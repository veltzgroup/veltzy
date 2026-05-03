# Auditoria: Multiplos Pipelines
**Data:** 2026-05-03 | **Fase:** Pos-implementacao, pre-deploy

---

## Sumario Executivo

| Dimensao | Status | Gaps |
|----------|--------|------|
| 1. Funcional | 🟢 | 1 medio |
| 2. Dados | 🟡 | 2 altos |
| 3. Integracao | 🔴 | 1 critico, 2 altos |
| 4. UX/Visual | 🟠 | 2 criticos, 2 altos |
| 5. Comercial | 🟡 | 1 critico |

**Semaforo geral: 🟠 ALTO** — Feature 85% pronta. 6 gaps a corrigir antes de deploy.

---

## Achados por Dimensao

### 🔴 CRITICOS (5)

| # | Dimensao | Achado | Arquivo | Acao |
|---|----------|--------|---------|------|
| C1 | Integracao | `source-webhook` tem bug pre-existente: `url.searchParams` na linha 14 usa variavel `url` que so e declarada na linha 20 — funcao crasha em runtime | `supabase/functions/source-webhook/index.ts:14` | Trocar `url` por `reqUrl` |
| C2 | Integracao | `edit-lead-modal.tsx` chama `usePipelineStages()` sem passar `lead.pipeline_id` — dropdown de stages mostra stages do pipeline ativo, nao do pipeline do lead | `src/components/pipeline/edit-lead-modal.tsx` | Passar `lead.pipeline_id` como override |
| C3 | UX | Ao desativar o pipeline que esta sendo visualizado no Kanban, `activePipelineId` continua apontando pro pipeline inativo — UI quebra | `pipeline-list-manager.tsx` + `pipeline-board.tsx` | Resetar para pipeline padrao ao desativar o ativo |
| C4 | UX | Flash de dados ao trocar pipeline — dados antigos renderizam antes dos novos carregarem | `pipeline-board.tsx` | Adicionar `opacity-50 + pointer-events-none` durante loading |
| C5 | Integracao | `dashboard.service.ts` — `getPipelineOverview()` e `getHistoricalConversionRates()` filtram `pipeline_stages` por `company_id` sem `pipeline_id`, misturando dados de todos os pipelines | `src/services/dashboard.service.ts` | Fora do escopo desta feature (dashboard nao filtra por pipeline — PRD item 3.7 diz "fora do escopo") |

### 🟠 ALTOS (3)

| # | Dimensao | Achado | Arquivo | Acao |
|---|----------|--------|---------|------|
| A1 | UX | Titulo "Pipeline" no header e estatico — confuso com multiplos pipelines | `pipeline-header.tsx` | Mostrar nome do pipeline ativo |
| A2 | UX | Pipeline novo sem leads mostra 6 colunas vazias sem empty state de pipeline | `pipeline-board.tsx` | Adicionar empty state quando 0 leads no pipeline |
| A3 | Dados | RPC `get_conversation_list` nao retorna `pipeline_id` — inbox nao sabe em qual pipeline o lead esta | Migration/RPC | Adicionar campo na RPC (pode ser v2) |

### 🟡 MEDIOS (3)

| # | Dimensao | Achado | Arquivo | Acao |
|---|----------|--------|---------|------|
| M1 | Funcional | `useUpdatePipeline` e `useReorderPipelines` nao tem toast de sucesso | `use-pipelines.ts` | Intencional — reorder silencioso e consistente com stages |
| M2 | Comercial | Sem onboarding/hint de que a feature existe — admin nao descobre | `pipeline-tab.tsx` | Adicionar description no CardDescription |
| M3 | UX | Admin nao ve contagem de leads por pipeline na lista | `pipeline-list-manager.tsx` | Adicionar badge com count |

---

## Decisoes de Escopo

| Achado | Decisao | Justificativa |
|--------|---------|---------------|
| C5 (dashboard sem filtro pipeline) | **Fora do escopo** | PRD secao 3.7: "Filtro de pipeline no dashboard (futuro — fora do escopo desta fase)" |
| A3 (RPC conversation_list) | **v2** | Inbox funciona sem pipeline_id — chat header usa `usePipelines()` para resolver o nome |
| M1 (toasts silenciosos) | **Manter** | Reorder e rename de pipeline sao operacoes rapidas e frequentes — toast visual e disruptivo |
| M2 (onboarding) | **Corrigir agora** | Baixo esforço, alto impacto na descoberta da feature |
| M3 (lead count) | **Corrigir agora** | Baixo esforço, melhora muito a UX do admin |

---

## Plano de Ataque (ordem priorizada)

1. **C1** — Fix bug `source-webhook` (5 min)
2. **C2** — Fix `edit-lead-modal` pipeline stages (10 min)
3. **C3** — Safeguard desativacao do pipeline ativo (15 min)
4. **C4** — Loading state na troca de pipeline (10 min)
5. **A1** — Titulo dinamico no header (5 min)
6. **M2** — Help text no admin (5 min)
7. **M3** — Lead count por pipeline no admin (20 min)
8. **A2** — Empty state pipeline sem leads (10 min)

**Tempo estimado total:** ~1h20

---

## Criterios de Aceite Validados

✅ 30/34 criterios passam
🟡 2 com gaps menores (loading state, empty state)
🔴 2 com gaps criticos (edit-lead-modal stages, desativacao pipeline ativo)
