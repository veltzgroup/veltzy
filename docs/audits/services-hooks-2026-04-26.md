# Auditoria: Services & Hooks
**Data:** 2026-04-26
**Area:** `src/services/` (23 arquivos) + `src/hooks/` (32 arquivos)
**Auditor:** Claude Code

---

## Semaforo Geral: 🟡 AMARELO

| Dimensao | Status | Gaps |
|----------|--------|------|
| 1. Funcional | 🟢 Verde | 2 gaps baixos |
| 2. Dados | 🟠 Alto | 11 services sem company_id em mutations |
| 3. Integracao | 🟡 Medio | 5 componentes com Supabase direto, 9 imports de service sem hook |
| 4. UX/Visual | 🟢 Verde | 3 toasts de erro faltando |
| 5. Comercial | 🟢 Verde | Sem impacto direto |

**Resumo:** A camada de services/hooks esta funcional e bem estruturada no geral. O problema principal e de **seguranca multi-tenant**: 11 dos 23 services nao filtram `company_id` em operacoes de update/delete, confiando apenas no RLS. Tambem ha quebra de arquitetura com componentes acessando Supabase diretamente.

---

## Inventario

### Services (23 arquivos)
| Service | Funcoes | company_id OK? |
|---------|---------|----------------|
| activity-logs | 1 | ✅ Total |
| auth | 7 | N/A |
| automations | 6 | ⚠️ Parcial |
| company | 4 | ✅ Total |
| dashboard | 8 | ✅ Total |
| goals | 7 | ⚠️ Parcial |
| lead-sources | 2 | ✅ Total |
| leads | 6 | ⚠️ Parcial |
| messages | 4 | ⚠️ Parcial |
| notifications | 4 | N/A (user_id) |
| payments | 4 | ⚠️ Parcial |
| personal-reports | 1 | ❌ Nao |
| pipeline | 5 | ⚠️ Parcial |
| profile | 4 | ⚠️ Parcial |
| reply-templates | 4 | ⚠️ Parcial |
| roles | 4 | N/A |
| sdr-metrics | 2 | ✅ Total |
| sdr | 3 | ⚠️ Parcial |
| source-integrations | 3 | ⚠️ Parcial |
| super-admin | 2 | N/A |
| support | 4 | ⚠️ Parcial |
| team | 10 | ⚠️ Parcial |
| whatsapp | 5 | ✅ Total |

### Hooks (32 arquivos)
| Hook | Tipo | Service chamado? | Query invalidation OK? |
|------|------|-------------------|----------------------|
| use-activity-logs | Query | ✅ | N/A |
| use-auth-init | Zustand | ✅ | N/A |
| use-auth | Zustand | ✅ | N/A |
| use-automation-logs | Query | ✅ | N/A |
| use-automation-rules | Query + 4 Mutations | ✅ | ✅ |
| use-company | Query | ✅ | N/A |
| use-conversation-list | Query + Zustand | ✅ | N/A |
| use-dashboard-metrics | 8 Queries | ✅ | ✅ |
| use-dashboard-realtime | Realtime | N/A | ✅ (9 keys) |
| use-fallback-owner | Query + Mutation | ✅ | ✅ |
| use-goals | Query + 3 Mutations | ✅ | ✅ |
| use-lead-sources | Query | ✅ | N/A |
| use-leads | Query + 4 Mutations | ✅ | ✅ (optimistic!) |
| use-messages | Query + Realtime + Mutation | ✅ | ✅ |
| use-notification-preferences | Query + Mutation | ⚠️ Supabase direto | ✅ |
| use-notifications | Query + 2 Mutations | ✅ | ✅ |
| use-payment-configs | Query + 2 Mutations | ✅ | ✅ |
| use-personal-report | Query | ✅ | N/A |
| use-pipeline-stages | Query + 4 Mutations | ✅ | ✅ |
| use-profile | Query | ✅ | N/A |
| use-reply-templates | Query + 2 Mutations | ✅ | ✅ |
| use-roles | Zustand | N/A | N/A |
| use-sdr-config | Query + 2 Mutations | ✅ | ✅ |
| use-sdr-metrics | 2 Queries | ✅ | N/A |
| use-sellers | Mutation | ⚠️ Supabase direto | ✅ |
| use-source-integrations | Query + Mutation | ✅ | ✅ |
| use-super-admin | Query + Zustand | ✅ | N/A |
| use-support-tickets | 2 Queries + 2 Mutations | ✅ | ✅ |
| use-team-members | Query | ✅ | N/A |
| use-team | 2 Queries + 4 Mutations | ✅ | ✅ |
| use-theme-config | Zustand + localStorage | N/A | N/A |
| use-typing-indicator | Realtime broadcast | N/A | N/A |

---

## Achados por Dimensao

### Dimensao 1 - Funcional

#### 🟢 Baixo: Hook `useTeamMembers` duplicado
- **Arquivos:** `src/hooks/use-team-members.ts` e `src/hooks/use-team.ts`
- **Problema:** Ambos exportam `useTeamMembers()` com configs diferentes (staleTime diverge)
- **Acao:** Manter apenas o de `use-team.ts`, deletar `use-team-members.ts` e atualizar imports

#### 🟢 Baixo: Arquivo `use-sellers.ts` mal nomeado
- **Arquivo:** `src/hooks/use-sellers.ts`
- **Problema:** Exporta `useToggleAvailability()`, nao tem nada sobre "sellers"
- **Acao:** Renomear para `use-availability.ts`

---

### Dimensao 2 - Dados (PRINCIPAL)

#### 🟠 Alto: 11 services sem company_id em mutations
- **Problema:** Funcoes de update/delete confiam exclusivamente no RLS, sem filtro por `company_id` no codigo da aplicacao
- **Risco:** Se RLS tiver bug, um tenant pode alterar dados de outro
- **Services afetados e funcoes:**

| Service | Funcoes sem company_id |
|---------|----------------------|
| automations | `updateRule`, `deleteRule`, `toggleRule` |
| goals | `updateGoal`, `deleteGoal`, `createGoalMetric`, `updateGoalMetric`, `deleteGoalMetric` |
| leads | `getLeadById`, `updateLead`, `deleteLead`, `moveLeadToStage` |
| messages | `getMessages`, `markAsRead` |
| payments | `togglePaymentConfig`, `deletePaymentConfig` |
| pipeline | `updateStage`, `deleteStage`, `reorderStages` |
| reply-templates | `updateTemplate`, `deleteTemplate` |
| sdr | `toggleSdrForLead` |
| source-integrations | `deleteIntegration` |
| support | `updateTicketStatus`, `getAllTickets` |
| team | `updateMemberRole`, `removeMember` |

- **Acao:** Adicionar `company_id` como parametro obrigatorio nessas funcoes e filtrar nas queries. O CLAUDE.md do projeto diz: "RLS e a ultima linha de defesa, NAO a unica"

#### 🟡 Medio: Error handling ausente em 2 services
- **`personal-reports.service.ts`** - Nao faz `if (error) throw error` apos query
- **`sdr-metrics.service.ts`** - Mesmo problema
- **Acao:** Adicionar verificacao de erro padrao

#### 🟡 Medio: `pipeline.service.ts` reorderStages sem transacao
- **Arquivo:** `src/services/pipeline.service.ts`
- **Problema:** `reorderStages` executa N updates separados sem transaction. Se falhar no meio, fica inconsistente
- **Acao:** Criar RPC function no Supabase que reordena em transacao

#### 🟢 Baixo: `support.service.ts` usa non-null assertion insegura
- **Arquivo:** `src/services/support.service.ts`
- **Problema:** `user!.id` sem null check
- **Acao:** Adicionar verificacao antes de acessar

---

### Dimensao 3 - Integracao (Arquitetura)

#### 🟠 Alto: 5 componentes com Supabase direto (bypass total)
Quebra a arquitetura Services > Hooks > Components:

| Componente | O que faz direto |
|-----------|-----------------|
| `settings/auto-reply-settings.tsx` | SELECT + UPSERT em `system_settings` |
| `admin/sellers-tab.tsx` | UPDATE em `profiles` |
| `inbox/chat-input.tsx` | Upload + getPublicUrl no Storage |
| `company/theme-customizer.tsx` | UPDATE em `companies` |
| `admin/business-rules-tab.tsx` | Import de `veltzy` do Supabase |

- **Acao:** Criar services + hooks dedicados para cada caso

#### 🟡 Medio: 9 componentes importam services direto (sem hook)
| Arquivo | Service importado |
|---------|------------------|
| `settings/profile-settings.tsx` | `updateProfile`, `resetPassword` |
| `settings/scripts-manager.tsx` | `updateTemplate` |
| `admin/lead-sources-manager.tsx` | `getAllLeadSources` |
| `admin/sellers-tab.tsx` | `resetMemberPassword` |
| `super-admin/companies-dashboard.tsx` | `toggleCompanyActive` |
| `pages/auth.tsx` | `resetPassword` |
| `pages/update-password.tsx` | `updatePassword` |
| `pages/company.tsx` | `updateCompany` |
| `pages/admin.tsx` | `updateCompany` |

- **Acao:** Migrar para usar hooks existentes ou criar novos

#### 🟡 Medio: 3 hooks nunca importados (dead code)
| Hook | Motivo provavel |
|------|----------------|
| `use-company.ts` | Substituido por `useAuthStore` |
| `use-profile.ts` | Substituido por `useAuthStore` |
| `use-source-integrations.ts` | Nunca conectado a UI |

- **Acao:** Remover ou reconectar

---

### Dimensao 4 - UX/Visual

#### 🟡 Medio: Toasts de erro faltando em mutations
| Hook | Mutation |
|------|---------|
| `use-reply-templates.ts` | `useDeleteTemplate()` - sem onError |
| `use-support-tickets.ts` | `useCreateTicket()` - sem onError |
| `use-automation-rules.ts` | `useToggleRule()` - sem onError |

- **Acao:** Adicionar `onError: () => toast.error('...')` nessas mutations

#### 🟢 Baixo: `window.location.reload()` no stopImpersonation
- **Arquivo:** `src/hooks/use-super-admin.ts`
- **Problema:** Reload abrupto perde estado
- **Acao:** Limpar Zustand sem reload

---

### Dimensao 5 - Comercial

Sem impacto direto. Services e hooks sao camada interna. Os gaps encontrados nao afetam a demonstrabilidade do produto, mas o gap de seguranca multi-tenant (Dimensao 2) e um risco real para producao com multiplos clientes.

---

## Plano de Ataque (Priorizado)

### Prioridade 1 - Seguranca Multi-tenant
1. Adicionar `company_id` como parametro obrigatorio em todas as funcoes de mutation dos 11 services listados
2. Filtrar por `company_id` em todas as queries de update/delete
3. Adicionar error handling nos 2 services sem verificacao

### Prioridade 2 - Arquitetura
4. Remover Supabase direto dos 5 componentes (criar services + hooks)
5. Migrar 9 imports de service para usar hooks

### Prioridade 3 - Limpeza
6. Remover hook duplicado `use-team-members.ts`
7. Remover 3 hooks nao utilizados (ou reconectar)
8. Renomear `use-sellers.ts` para `use-availability.ts`
9. Adicionar toasts de erro faltando
10. Corrigir `reorderStages` para usar transacao

---

## Metricas Positivas

- **Query invalidation:** 100% dos hooks de mutation invalidam as queries corretas
- **Enabled guards:** 27/27 hooks com query tem guard `enabled: !!id`
- **Optimistic updates:** Pipeline drag & drop usa optimistic update com rollback
- **Realtime:** Dashboard e messages com Supabase Realtime bem implementados
- **Cache strategy:** staleTime e refetchInterval configurados onde faz sentido
- **Separacao Zustand/React Query:** Bem definida (client vs server state)
- **Tipagem:** Tipos centralizados em `types/database.ts`, bem reutilizados
