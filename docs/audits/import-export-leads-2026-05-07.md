# Auditoria: Importacao/Exportacao de Leads
**Data:** 2026-05-07
**Area:** Fluxo completo de import/export (CSV, XLSX, PDF)
**Arquivos:** 18 arquivos, ~1.800 LOC

## Semaforo Geral: 🟠 ALTO

| Dimensao | Status | Gaps |
|----------|--------|------|
| 1. Funcional | 🟠 | 2 criticos, 1 alto |
| 2. Dados | 🟠 | 1 critico (pipeline_id NOT NULL) |
| 3. Integracao | 🟢 | OK |
| 4. UX/Visual | 🟡 | Acessibilidade basica |
| 5. Comercial | 🟢 | Demonstravel |

---

## Inventario

### Componentes (7 arquivos)
- `components/pipeline/import-leads-modal.tsx` (160 linhas)
- `components/pipeline/import-steps/upload-step.tsx` (142)
- `components/pipeline/import-steps/mapping-step.tsx` (141)
- `components/pipeline/import-steps/preview-step.tsx` (112)
- `components/pipeline/import-steps/confirm-assignees-step.tsx` (153)
- `components/pipeline/import-steps/progress-step.tsx` (28)
- `components/pipeline/import-steps/result-step.tsx` (97)

### Pontos de Export (4 locais)
- `components/pipeline/pipeline-header.tsx` (CSV, XLSX, PDF)
- `components/deals/bulk-action-bar.tsx` (CSV, XLSX, PDF)
- `components/admin/reports-tab.tsx` (CSV, XLSX, PDF)
- `pages/deals.tsx` (CSV, XLSX, PDF + botao Import)

### Services e Libs (4 arquivos)
- `services/import-leads.service.ts` (269)
- `services/resolve-assignees.service.ts` (210)
- `lib/csv-parser.ts` (167)
- `lib/export-leads.ts` (122)

### Hooks (2 arquivos)
- `hooks/use-import-leads.ts` (90)
- `hooks/use-bulk-leads.ts` (106)

### Testes (2 arquivos)
- `services/import-leads.test.ts` (111)
- `lib/csv-parser.test.ts` (62)

---

## Achados por Dimensao

### 1. FUNCIONAL

#### 🔴 F1 — pipeline_id NOT NULL mas import omite campo
**Severidade:** Critico
**Arquivo:** `services/import-leads.service.ts:221`
**Problema:** Schema do banco tem `pipeline_id NOT NULL` (migration 027), mas o insert omite o campo quando nao mapeado. Toda importacao sem coluna Pipeline vai falhar com FK violation.
**Acao:** Adicionar `pipeline_id` obrigatorio no insert usando pipeline default ou pipeline ativo. Adicionar select de "Pipeline padrao" no mapping-step (similar ao "Fase padrao").

#### 🔴 F2 — assigned_to FK aponta para profiles.id, nao auth.users
**Severidade:** Critico
**Arquivo:** `services/import-leads.service.ts:100-103`, `resolve-assignees.service.ts:103`
**Problema:** FK `assigned_to` referencia `profiles(id)`, mas o codigo resolve para `member.user_id` (UUID do auth.users). Precisa usar `member.id` (profiles.id).
**Acao:** Trocar `member.user_id` por `member.id` em resolve-assignees e import-leads.service.

#### 🟠 F3 — Testes desatualizados para campos novos
**Severidade:** Alto
**Arquivo:** `services/import-leads.test.ts`, `lib/csv-parser.test.ts`
**Problema:** Testes nao cobrem pipeline_id, assigned_to, nem parsing XLSX. resolve-assignees.service.ts nao tem teste nenhum.
**Acao:** Adicionar testes para: mapeamento pipeline_id, resolucao assigned_to, parsing XLSX, normalização de acentos (Levenshtein).

### 2. DADOS

#### 🔴 D1 — Insert sem pipeline_id viola NOT NULL
**Severidade:** Critico (mesmo que F1, perspectiva de dados)
**Tabela:** `veltzy.leads.pipeline_id`
**Constraint:** `ALTER TABLE veltzy.leads ALTER COLUMN pipeline_id SET NOT NULL` (migration 027)
**Acao:** Garantir que pipeline_id sempre tem valor no insert.

### 3. INTEGRACAO

Sem gaps. Supabase queries incluem `pipelines:pipeline_id(*)` no select. RLS filtra por company_id. Batch insert com fallback row-a-row funciona.

### 4. UX/VISUAL

#### 🟡 U1 — Typo "Proximo" sem acento
**Arquivo:** `upload-step.tsx:135`, `mapping-step.tsx:135`
**Acao:** Trocar por "Proximo" (ja e padrao do projeto sem acentos em copy curta)

#### 🟡 U2 — Loading state ausente no mapping-step
**Arquivo:** `mapping-step.tsx:22-23`
**Problema:** Se stages/sources demoram a carregar, o select "Fase padrao" aparece vazio sem indicador de loading.
**Acao:** Adicionar skeleton ou spinner enquanto stages carregam.

#### 🟡 U3 — Acessibilidade basica nos selects
**Arquivo:** `confirm-assignees-step.tsx`, `mapping-step.tsx`
**Problema:** Selects sem aria-label descritivo. Container scrollavel sem anuncio.
**Acao:** Adicionar aria-labels nos selects e role nos containers.

### 5. COMERCIAL

Feature e demonstravel: import de planilha com wizard guiado, export em 3 formatos, confirmacao interativa de responsaveis. Cobre o caso de uso "migrar do concorrente".

---

## Plano de Ataque (ordem priorizada)

### Agora (bloqueia uso)
1. **F1/D1** — Adicionar pipeline_id obrigatorio no insert + select "Pipeline padrao" no mapping-step
2. **F2** — Corrigir FK assigned_to: usar profiles.id em vez de user_id

### Essa semana
3. **F3** — Testes para campos novos e resolve-assignees
4. **U2** — Loading state no mapping-step

### Backlog
5. **U1** — Review copy/acentos
6. **U3** — Aria-labels
