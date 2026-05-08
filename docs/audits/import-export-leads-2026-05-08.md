# Auditoria: Import & Export de Leads
**Data:** 2026-05-08
**Area:** Import CSV/XLSX + Export CSV/XLSX/PDF
**Foco especial:** Leads sumindo, duplicados, dados incompletos

---

## Sumario Executivo

| Dimensão | Status | Gaps |
|----------|--------|------|
| 1. Funcional | 🟠 | 4 |
| 2. Dados | 🔴 | 3 |
| 3. Integração | 🟡 | 1 |
| 4. UX/Visual | 🟡 | 2 |
| 5. Comercial | 🟠 | 2 |

**Semaforo geral: 🟠 ALTO**

Há 2 bugs criticos que causam leads sumindo/invisíveis e 1 que pode causar export incompleto silenciosamente. O fluxo de import é robusto (validação, fallback row-by-row, checagem de duplicatas), mas o export tem lacunas sérias de truncamento por limite de paginação.

---

## Inventario de Arquivos Auditados

### Import
| Arquivo | Linhas | Papel |
|---------|--------|-------|
| `src/services/import-leads.service.ts` | 284 | Lógica de import: mapear CSV, validar, checar duplicatas, inserir em batch |
| `src/hooks/use-import-leads.ts` | 92 | Hook orquestrando fluxo de import |
| `src/lib/csv-parser.ts` | 168 | Parse de CSV/XLSX + auto-mapeamento de colunas |
| `src/services/resolve-assignees.service.ts` | 211 | Resolução fuzzy de responsável |
| `src/components/pipeline/import-leads-modal.tsx` | 161 | Modal wizard de 6 passos |
| `src/components/pipeline/import-steps/*.tsx` | ~700 | Steps: upload, mapping, preview, confirm, progress, result |

### Export
| Arquivo | Linhas | Papel |
|---------|--------|-------|
| `src/lib/export-leads.ts` | 123 | Funções de export: CSV, XLSX, PDF |
| `src/hooks/use-bulk-leads.ts` | 107 | Hook de bulk export + bulk actions |
| `src/components/pipeline/pipeline-header.tsx` | ~175 | Trigger de export na pipeline |
| `src/pages/deals.tsx` | ~182 | Trigger de export no dashboard |
| `src/components/admin/reports-tab.tsx` | 54 | Export no painel admin |

### Leads (CRUD / Visibilidade)
| Arquivo | Linhas | Papel |
|---------|--------|-------|
| `src/services/leads.service.ts` | 215 | CRUD + bulk ops + paginação |
| `src/hooks/use-leads.ts` | 146 | Queries com filtros + mutations |
| `src/hooks/use-dashboard-leads.ts` | 39 | Query do dashboard (limit 500) |
| `src/components/pipeline/pipeline-board.tsx` | 271 | Kanban board + agrupamento por stage |
| `src/services/pipeline.service.ts` | 76 | CRUD de stages (sem proteção de leads) |

---

## Achados por Dimensão

### Dimensão 1: FUNCIONAL

#### 🔴 F1 - Export trunca leads silenciosamente (limit padrão)
**Severidade:** Critica
**Arquivo:** `src/services/leads.service.ts:26-27`

```typescript
const limit = filters?.limit ?? 100   // <-- padrão 100
const offset = filters?.offset ?? 0
```

**Problema:** O `getLeadsByCompany` retorna no máximo 100 leads por padrão. O hook `useLeads()` não passa `limit`, então o Kanban e o **export do pipeline header** so exportam os primeiros 100 leads. O dashboard usa `limit: 500`. O **admin reports** usa `useLeads()` (limit 100).

**Impacto:** Se a empresa tem 150 leads, o export diz "150 leads serão exportados" (baseado no count local) mas na realidade **só exporta 100**. O usuário recebe um arquivo incompleto sem nenhum aviso.

**Onde aparece:**
- `reports-tab.tsx:9` - usa `useLeads()` com limit 100
- `pipeline-header.tsx` - exporta `filteredLeads` (max 100 da query)
- `deals.tsx` - exporta leads do dashboard (max 500)

**Fix:** Criar `exportAllLeads()` que busca sem limit (ou com limit alto tipo 10000) e usar no export. Ou adicionar paginação no export que itere até acabar.

---

#### 🔴 F2 - Stage deletado torna leads invisíveis no Kanban
**Severidade:** Critica
**Arquivo:** `src/services/pipeline.service.ts:55-62`

```typescript
export const deleteStage = async (companyId: string, stageId: string): Promise<void> => {
  const { error } = await veltzy()
    .from('pipeline_stages')
    .delete()
    .eq('id', stageId)
    .eq('company_id', companyId)
  if (error) throw error
}
```

**Problema:** Deletar um stage faz `ON DELETE SET NULL` no `stage_id` dos leads. O Kanban agrupa leads por stage (`pipeline-board.tsx:86-95`):

```typescript
filteredLeads.forEach((l) => {
  if (map[l.stage_id]) {   // stage_id=null nunca dá match
    map[l.stage_id].push(l)
  }
})
```

Leads com `stage_id = NULL` **desaparecem** do board. Não há tela para recupera-los.

**Fix:** Antes de deletar, verificar se existem leads no stage e mover para outro stage ou impedir deleção.

---

#### 🟠 F3 - Bulk ops invalidam cache errado (leads "somem" temporariamente)
**Severidade:** Alto
**Arquivo:** `src/hooks/use-bulk-leads.ts:17-18,59-60`

```typescript
// useBulkTransfer, useBulkArchive, useBulkDelete:
queryClient.invalidateQueries({ queryKey: ['dashboard-leads'] })
// Falta invalidar ['leads'] no transfer/archive/delete!
```

Apenas `useBulkMovePipeline` invalida **ambos** `['dashboard-leads']` e `['leads']`. Os outros três hooks so invalidam `['dashboard-leads']`, então:
- Bulk transfer/archive/delete no dashboard atualiza o dashboard
- Mas o **Kanban** (`['leads']`) fica desatualizado até staleTime expirar (30s)
- Usuário vai para o Kanban e vê leads antigos, ou leads que deveriam ter sido deletados/transferidos

**Fix:** Adicionar `queryClient.invalidateQueries({ queryKey: ['leads'] })` nos hooks `useBulkTransfer`, `useBulkArchive` e `useBulkDelete`.

---

#### 🟡 F4 - Import não valida `stage_id` pertence ao `pipeline_id` selecionado
**Severidade:** Medio
**Arquivo:** `src/services/import-leads.service.ts:90-94`

```typescript
case 'stage_id': {
  const normalized = normalizeText(value)
  const stage = lookups.stages.find((s) => normalizeText(s.name) === normalized)
  if (stage) lead.stage_id = stage.id   // <-- pode ser stage de OUTRO pipeline
  break
}
```

O lookup busca em `lookups.stages` que contém stages de TODOS os pipelines. Se o CSV tem um stage "Novo Lead" que existe em dois pipelines, pode pegar o errado.

**Impacto:** Lead fica com `stage_id` de pipeline A mas `pipeline_id` de pipeline B. No Kanban do pipeline B, o lead aparece na query mas não encaixa em nenhum stage, ficando **invisível**.

**Fix:** Filtrar `lookups.stages` pelo `pipeline_id` selecionado antes do lookup.

---

### Dimensão 2: DADOS

#### 🔴 D1 - Race condition no import permite duplicata em cenário concorrente
**Severidade:** Critica (mas mitigado pelo fallback row-by-row)
**Arquivo:** `src/services/import-leads.service.ts:215-252`

```typescript
// Passo 1: checa duplicatas (SELECT)
const existing = await checkDuplicates(companyId, phones)
// ... tempo passa ...
// Passo 2: insere (INSERT)
const { error } = await veltzy().from('leads').insert(insertData)
```

Entre o `checkDuplicates` e o `insert`, outro usuário pode criar um lead com mesmo telefone. O batch insert falha e cai no fallback row-by-row que pega o erro, mas:
- O erro mostra mensagem genérica de constraint violation
- Não identifica claramente como "duplicata" (mostra "Erro no banco: ...")

**Mitigação existente:** O constraint `UNIQUE(company_id, phone)` impede duplicata real no banco. O fallback row-by-row captura o erro. Não gera duplicata, mas a UX é confusa.

**Fix:** No `translateDbError`, adicionar detecção de unique violation: `if (message.includes('duplicate') || message.includes('unique')) return 'Telefone já cadastrado (duplicata)'`

---

#### 🟠 D2 - Export não inclui todos os campos do lead
**Severidade:** Alto
**Arquivo:** `src/lib/export-leads.ts:4-19`

O export NÃO inclui:
- `instagram_id`
- `linkedin_id`
- `avatar_url`
- `ai_score`
- `status` (new/qualifying/open/deal/lost/archived)
- `conversation_status`
- `assigned_to` (como UUID, para reimport)

O template de import aceita: nome, telefone, email, pipeline, etapa, temperatura, responsável, tags, observações, origem, valor.

**Problema de round-trip:** Se o usuário exporta leads e depois reimporta, perde instagram, linkedin, score, status. Não há fidelidade de ida-e-volta.

**Fix:** Adicionar campos faltantes ao export, ou criar export "completo" separado do export "resumido".

---

#### 🟡 D3 - Import não seta `status` baseado no stage
**Severidade:** Medio
**Arquivo:** `src/services/import-leads.service.ts:232-248`

Ao importar, o `status` fica implicitamente como `'new'` (default do banco), independente do stage. Se o CSV coloca o lead no stage "Fechado (Ganho)", o status deveria ser `'deal'`, mas fica como `'new'`.

Isso pode causar inconsistência: um lead no stage final com status "new".

**Fix:** Após resolver o `stage_id`, verificar se o stage é `is_final` e setar o status apropriado (`deal`/`lost`).

---

### Dimensão 3: INTEGRAÇÃO

#### 🟡 I1 - Realtime não diferencia pipelines
**Severidade:** Medio
**Arquivo:** `src/hooks/use-dashboard-realtime.ts`

O subscription Realtime faz `filter: company_id=eq.${companyId}` sem filtrar por pipeline. Qualquer mudança em qualquer lead invalida TODOS os queries `['leads']`.

**Impacto:** Performance degradada com muitos pipelines. Não causa leads sumindo, mas pode causar flicker/refetch desnecessário que confunde o usuário.

---

### Dimensão 4: UX/VISUAL

#### 🟠 U1 - Erro de duplicata no criar lead é críptico
**Severidade:** Alto
**Arquivo:** `src/hooks/use-leads.ts:60-62`

```typescript
onError: (err: Error) => {
  toast.error(err.message || 'Erro ao criar lead')
}
```

Quando o usuário tenta criar um lead com telefone que já existe, recebe um toast com erro bruto do Postgres (algo como `duplicate key value violates unique constraint`). Deveria mostrar: "Já existe um lead com este telefone."

**Fix:** Interceptar o erro de constraint no `createLead` service e retornar mensagem amigável.

---

#### 🟡 U2 - Nenhum indicador de leads com stage_id NULL
**Severidade:** Medio

Se por qualquer motivo um lead fica com `stage_id = NULL` (stage deletado, bug, import com stage inválido), ele simplesmente desaparece do Kanban sem nenhum aviso.

**Fix:** No `pipeline-board.tsx`, contar leads com `stage_id` NULL e mostrar um badge: "X leads sem etapa" com ação para mover.

---

### Dimensão 5: COMERCIAL

#### 🟠 C1 - Export do Admin Reports é enganoso
**Severidade:** Alto
**Arquivo:** `src/components/admin/reports-tab.tsx:9,45-46`

```typescript
const { data: leads } = useLeads()  // limit 100, filtrado por pipeline ativo!
// ...
<p>{leads?.length ?? 0} leads serão exportados</p>
```

O painel Admin usa `useLeads()` que filtra por `activePipelineId` do store Zustand e tem limit 100. O admin espera exportar TODOS os leads da empresa, mas recebe apenas os do pipeline ativo, limitado a 100.

**Impacto em demo:** Cliente com 200 leads exporta e recebe 100. Perde confiança na ferramenta.

**Fix:** `ReportsTab` deveria usar `useDashboardLeads(null)` (sem filtro de pipeline) com limit alto, ou criar um hook dedicado `useAllLeads()`.

---

#### 🟡 C2 - Import não suporta atualização (upsert)
**Severidade:** Medio

O import só insere leads novos. Se o cliente tem leads existentes e quer atualizar dados em massa (ex: importar deal_value atualizado), precisa editar um por um. Duplicatas são **skippadas**, não atualizadas.

Para demo/vendas isso é aceitável, mas para operação real é uma limitação.

**Fix futuro:** Adicionar opção "Atualizar leads existentes" que faz upsert por telefone.

---

## Resumo de Gaps por Severidade

| Sev | ID | Titulo | Risco |
|-----|-----|--------|-------|
| 🔴 | F1 | Export trunca a 100 leads sem aviso | Leads "somem" no export |
| 🔴 | F2 | Stage deletado orphana leads | Leads invisíveis no Kanban |
| 🔴 | D1 | Race condition no import (mitigado) | UX confusa, não causa duplicata real |
| 🟠 | F3 | Bulk ops não invalidam cache do Kanban | Leads desatualizados 30s |
| 🟠 | D2 | Export sem campos instagram/linkedin/status | Perda de dados no round-trip |
| 🟠 | U1 | Erro de duplicata críptico | UX ruim ao criar lead duplicado |
| 🟠 | C1 | Admin Reports exporta subset enganoso | Cliente perde confiança |
| 🟡 | F4 | Import pode cruzar stage/pipeline | Lead invisível no Kanban |
| 🟡 | D3 | Import não seta status baseado no stage | Inconsistência de dados |
| 🟡 | I1 | Realtime invalida tudo sem filtro | Performance |
| 🟡 | U2 | Sem indicador de leads orphanados | Leads invisíveis sem aviso |
| 🟡 | C2 | Import não faz upsert | Limitação operacional |

---

## Plano de Ataque (Priorizado)

### Sprint 1 - Correções criticas (leads sumindo)

1. **F2 - Proteção de deleção de stage**
   - Arquivo: `src/services/pipeline.service.ts:55-62`
   - Ação: Antes de deletar, contar leads no stage. Se > 0, throw error com mensagem pedindo mover leads primeiro.
   - Effort: P

2. **F1 - Export sem limite de paginação**
   - Arquivo: `src/services/leads.service.ts` + `src/lib/export-leads.ts`
   - Ação: Criar `getAllLeadsByCompany()` sem limit ou com limit 10000. Usar nas funções de export.
   - Effort: P

3. **C1 - Admin Reports usar query correta**
   - Arquivo: `src/components/admin/reports-tab.tsx:9`
   - Ação: Trocar `useLeads()` por `useDashboardLeads(null)` ou hook dedicado sem filtro de pipeline e sem limit baixo.
   - Effort: P

### Sprint 2 - Correções altas (UX e cache)

4. **F3 - Invalidar cache ['leads'] em todas bulk ops**
   - Arquivo: `src/hooks/use-bulk-leads.ts`
   - Ação: Adicionar `queryClient.invalidateQueries({ queryKey: ['leads'] })` nos 3 hooks faltantes.
   - Effort: XP

5. **U1 - Mensagem amigável para duplicata**
   - Arquivo: `src/services/leads.service.ts:72-80`
   - Ação: No catch do `createLead`, detectar unique violation e retornar "Já existe um lead com este telefone".
   - Effort: P

6. **D1 - Melhorar translateDbError para unique violations**
   - Arquivo: `src/services/import-leads.service.ts:163-169`
   - Ação: Adicionar `if (message.includes('duplicate') || message.includes('unique'))` return msg amigável.
   - Effort: XP

### Sprint 3 - Melhorias médias

7. **F4 - Filtrar stages por pipeline no import**
8. **D3 - Setar status baseado no stage durante import**
9. **U2 - Badge de leads orphanados no Kanban**
10. **D2 - Campos adicionais no export**

### Backlog

11. **I1 - Realtime filtrado por pipeline**
12. **C2 - Opção de upsert no import**
