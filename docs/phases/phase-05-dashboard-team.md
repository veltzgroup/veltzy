# Phase 05 - Dashboard Analytics + Relatórios + Gestão de Equipe

## OBJETIVO
Implementar o dashboard analítico completo com métricas de conversão e receita, relatórios exportáveis, gestão de equipe (convites, roles, disponibilidade) e a página de Sellers. Ao final desta fase, admins e managers têm visibilidade total do funil e da equipe.

## PRÉ-REQUISITOS
- Fases 1 a 4 concluídas
- Leads com dados suficientes para visualizar métricas

## NOVAS DEPENDÊNCIAS
```bash
npm i recharts
npm i jspdf jspdf-autotable
npm i -D @types/jspdf
```

## MIGRATION SQL

Criar `supabase/migrations/005_team_reports.sql`:

```sql
-- ===========================================
-- TABELAS DA FASE 5
-- ===========================================

-- Convites de equipe
CREATE TABLE public.company_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role app_role NOT NULL DEFAULT 'seller',
    invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- FUNÇÕES
-- ===========================================

-- Aceitar convite e vincular usuário à empresa
CREATE OR REPLACE FUNCTION public.accept_invite(p_invite_code TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    _invite RECORD;
    _profile RECORD;
BEGIN
    -- Busca convite válido
    SELECT * INTO _invite FROM public.company_invites
    WHERE invite_code = p_invite_code
    AND accepted_at IS NULL
    AND expires_at > now();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
    END IF;

    -- Busca profile do usuário
    SELECT * INTO _profile FROM public.profiles WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Perfil não encontrado');
    END IF;

    IF _profile.company_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Usuário já pertence a uma empresa');
    END IF;

    -- Vincula usuário à empresa
    UPDATE public.profiles SET company_id = _invite.company_id WHERE user_id = p_user_id;

    -- Atribui role do convite
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, _invite.role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Marca convite como aceito
    UPDATE public.company_invites SET accepted_at = now() WHERE id = _invite.id;

    RETURN jsonb_build_object('success', true, 'company_id', _invite.company_id);
END;
$$;

-- Remover usuário da empresa
CREATE OR REPLACE FUNCTION public.remove_user_from_company(p_target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    _company_id UUID;
BEGIN
    _company_id := get_current_company_id();

    IF NOT is_company_admin() THEN
        RAISE EXCEPTION 'Permissão negada';
    END IF;

    -- Desvincula da empresa
    UPDATE public.profiles
    SET company_id = NULL
    WHERE user_id = p_target_user_id AND company_id = _company_id;

    -- Remove roles da empresa
    DELETE FROM public.user_roles
    WHERE user_id = p_target_user_id AND role NOT IN ('super_admin');
END;
$$;

-- Tempo médio de resposta por vendedor
CREATE OR REPLACE FUNCTION public.get_seller_avg_response_times(
    _company_id UUID,
    _start_date TIMESTAMPTZ DEFAULT now() - INTERVAL '30 days'
)
RETURNS TABLE (
    profile_id UUID,
    seller_name TEXT,
    avg_response_minutes NUMERIC,
    total_conversations INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    WITH first_responses AS (
        SELECT
            l.assigned_to,
            l.id as lead_id,
            MIN(m.created_at) FILTER (WHERE m.sender_type = 'human') as first_human_response,
            MIN(m.created_at) FILTER (WHERE m.sender_type = 'lead') as first_lead_message
        FROM public.leads l
        JOIN public.messages m ON m.lead_id = l.id
        WHERE l.company_id = _company_id
        AND l.created_at >= _start_date
        AND l.assigned_to IS NOT NULL
        GROUP BY l.assigned_to, l.id
    )
    SELECT
        p.id as profile_id,
        p.name as seller_name,
        ROUND(AVG(
            EXTRACT(EPOCH FROM (fr.first_human_response - fr.first_lead_message)) / 60
        )::NUMERIC, 1) as avg_response_minutes,
        COUNT(DISTINCT fr.lead_id)::INTEGER as total_conversations
    FROM first_responses fr
    JOIN public.profiles p ON p.id = fr.assigned_to
    WHERE fr.first_human_response IS NOT NULL
    AND fr.first_lead_message IS NOT NULL
    AND fr.first_human_response > fr.first_lead_message
    GROUP BY p.id, p.name
    ORDER BY avg_response_minutes ASC;
$$;

-- ===========================================
-- RLS
-- ===========================================

ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invites"
ON public.company_invites FOR ALL TO authenticated
USING (company_id = get_current_company_id() AND is_company_admin() OR is_super_admin());

CREATE POLICY "Anyone can view invite by code"
ON public.company_invites FOR SELECT TO authenticated
USING (true);

CREATE TRIGGER on_company_invites_no_update
    BEFORE UPDATE ON public.company_invites
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

## EDGE FUNCTION

### `supabase/functions/send-invite-email/index.ts`
Envia email de convite para novo membro.

Recebe:
```typescript
interface InvitePayload {
    inviteCode: string
    email: string
    companyName: string
    inviterName: string
    role: string
}
```

Usa Resend (ou SMTP via Supabase) para enviar email com:
- Assunto: `Convite para ${companyName} no Veltzy`
- Link: `https://app.veltzy.com.br/auth?invite=${inviteCode}`
- Template HTML simples com branding Veltzy

## SERVICES

**`src/services/dashboard.service.ts`**
```typescript
// getConversionMetrics(companyId, period) → ConversionMetrics
//   → total leads, deals fechados, taxa conversão, receita
// getLeadsBySource(companyId, period) → SourceMetrics[]
// getLeadsByTemperature(companyId) → TemperatureMetrics[]
// getMonthlyComparison(companyId) → MonthlyData[]
// getPipelineOverview(companyId) → StageMetrics[]
// getSellerPerformance(companyId, period) → SellerMetrics[]
```

**`src/services/team.service.ts`**
```typescript
// getMembers(companyId) → ProfileWithRole[]
// inviteMember(companyId, email, role) → CompanyInvite
// getInvites(companyId) → CompanyInvite[]
// cancelInvite(inviteId) → void
// updateMemberRole(userId, role) → void
// removeMember(userId) → void
// acceptInvite(inviteCode, userId) → { success, company_id }
```

**`src/services/reports.service.ts`**
```typescript
// generateLeadsReport(companyId, filters) → ReportData
// exportLeadsToCsv(companyId, filters) → Blob
// exportLeadsToPdf(companyId, filters) → Blob
// generateSalesReport(companyId, period) → SalesReportData
```

## HOOKS

**`src/hooks/use-dashboard-metrics.ts`**
- `useDashboardMetrics(period)` - métricas gerais com React Query (staleTime: 5min)
- `useMonthlyComparison()` - dados dos últimos 6 meses
- `usePipelineOverview()` - contagem e valor por estágio
- `useSellerResponseTimes()` - tempo médio de resposta (chama RPC)

**`src/hooks/use-team.ts`**
- `useTeamMembers()` - membros da empresa com roles
- `useInvites()` - convites pendentes
- `useInviteMember()` - mutation criar convite + chamar Edge Function
- `useCancelInvite()` - mutation cancelar
- `useUpdateMemberRole()` - mutation alterar role
- `useRemoveMember()` - mutation remover membro
- `useAcceptInvite(code)` - mutation aceitar convite (para fluxo de cadastro)

**`src/hooks/use-sellers.ts`**
- `useSellers()` - vendedores da empresa
- `useOnlineSellers()` - vendedores com `is_available = true`
- `useToggleAvailability()` - seller altera própria disponibilidade

## COMPONENTES

### Dashboard Page
**`src/pages/dashboard.tsx`** (substituir placeholder da Fase 1)

Layout:
```
[Header com filtro de período]
[Row: 4 KPI cards]
[Row: Monthly Chart (60%) | Pipeline Overview (40%)]
[Row: Leads by Source | Leads by Temperature]
[Row: Seller Performance Table]
[AI Follow-up Tips (se SDR habilitado)]
```

### Dashboard Period Filter
**`src/components/dashboard/dashboard-period-filter.tsx`**
- Tabs ou dropdown: Hoje / 7 dias / 30 dias / 90 dias / Este mês / Este ano
- Persiste seleção no store

### KPI Cards
**`src/components/dashboard/kpi-card.tsx`**
Props: `title`, `value`, `change` (% vs período anterior), `icon`, `trend` (up/down/neutral)
- Glass card com ícone colorido
- Valor grande em destaque
- Badge de variação (verde se positivo, vermelho se negativo)

4 cards principais:
- Total de Leads (período)
- Negócios Fechados
- Taxa de Conversão (%)
- Receita Total (R$)

### Monthly Comparison Chart
**`src/components/dashboard/monthly-comparison-chart.tsx`**
- BarChart do Recharts com 2 séries: Leads Gerados vs Deals Fechados
- Últimos 6 meses no eixo X
- Tooltip customizado com formatação pt-BR
- Cores: `primary` para leads, `hsl(var(--status-deal))` para deals
- Responsivo com `ResponsiveContainer`

### Pipeline Overview
**`src/components/dashboard/pipeline-overview.tsx`**
- Lista compacta de estágios com:
  - Barra de progresso proporcional
  - Nome do estágio
  - Contagem de leads
  - Valor total (R$)
- Ordenado por position

### Leads by Source Chart
**`src/components/dashboard/leads-by-source-chart.tsx`**
- PieChart ou DonutChart do Recharts
- Cada fatia com cor da origem
- Legenda lateral com nome + contagem + %

### Leads by Temperature Chart
**`src/components/dashboard/leads-by-temperature-chart.tsx`**
- BarChart horizontal com 4 barras (cold/warm/hot/fire)
- Cores do `leadTemperatureConfig`
- Valor absoluto + %

### Seller Performance Table
**`src/components/dashboard/seller-performance-table.tsx`**
Colunas:
- Vendedor (avatar + nome)
- Leads Atribuídos
- Deals Fechados
- Taxa de Conversão
- Tempo Médio de Resposta
- Status (online/offline com dot)

Ordenável por qualquer coluna. Só visível para admin/manager.

### AI Follow-up Tips
**`src/components/dashboard/ai-follow-up-tips.tsx`**
Card colapsável com sugestões geradas via IA:
- "3 leads quentes sem resposta há mais de 24h"
- "Taxa de conversão caiu 15% esta semana"
- Botão "Ver leads" navega para pipeline com filtro aplicado
- Só exibe se `ai_sdr_enabled = true`

---

### Sellers Page
**`src/pages/sellers.tsx`**
Layout:
```
[Header: "Equipe" + botão "+ Convidar"]
[Cards de membros ativos]
[Tabela de convites pendentes]
```

### Seller Card
**`src/components/sellers/seller-card.tsx`**
Props: `profile: ProfileWithRole`
- Avatar (inicial ou foto)
- Nome + email
- Badge de role (admin/manager/seller)
- Indicador online/offline
- Métricas compactas: leads atribuídos, deals fechados
- Menu de ações (só para admin): alterar role, remover da empresa

### Invite Member Modal
**`src/components/sellers/invite-member-modal.tsx`**
Campos:
- Email
- Role (dropdown: Vendedor / Manager / Admin)
Ao submeter: cria convite no banco + chama `send-invite-email`
Exibe link do convite para copiar (fallback se email falhar)

### Team Management Panel
**`src/components/sellers/team-management-panel.tsx`**
Tabela de convites pendentes:
- Email, Role, Data de envio, Expira em
- Botão "Cancelar convite"
- Badge "Expirado" se `expires_at < now()`

### Availability Toggle
**`src/components/sellers/availability-toggle.tsx`**
Switch na sidebar inferior:
- "Disponível para receber leads"
- Atualiza `profiles.is_available` + `last_seen_at`
- Verde quando ativo, cinza quando inativo

---

### Reports Tab
**`src/components/admin/reports-tab.tsx`**
Aba em `/admin`:
- Filtros: período, origem, vendedor, estágio
- Botão "Exportar CSV" → chama `exportLeadsToCsv`
- Botão "Exportar PDF" → chama `exportLeadsToPdf`
- Preview da tabela com dados filtrados (paginada, 20 por página)

**`src/lib/export-leads.ts`**
```typescript
// exportToCsv(leads: Lead[], filename) → download automático
// Colunas: nome, telefone, origem, estágio, temperatura, score, vendedor, valor, criado em
```

**`src/lib/generate-sales-report.ts`**
```typescript
// generatePdf(data: SalesReportData) → Blob
// Usa jsPDF + jspdf-autotable
// Inclui: resumo KPIs, tabela de leads, gráfico de conversão (simplificado)
```

## ROTA

Adicionar em `App.tsx`:
```tsx
<Route path="/sellers" element={<ProtectedRoute requireAdminPanel><Sellers /></ProtectedRoute>} />
```

Habilitar links na sidebar: Dashboard (já funcional), Sellers.

## FLUXO DE CONVITE (ONBOARDING)

Ao acessar `/auth?invite=CODE`:
1. Se usuário não autenticado → mostra tela de cadastro com email pré-preenchido
2. Após cadastro/login → chama `accept_invite(code, userId)`
3. Redireciona para `/` (dashboard da empresa)

Atualizar `src/pages/auth.tsx` e `src/pages/onboarding.tsx` para lidar com o parâmetro `invite`.

## DESIGN

### KPI Cards
- Ícone em círculo com cor da categoria (`bg-primary/10 text-primary`)
- Variação positiva: `text-primary` com seta para cima
- Variação negativa: `text-destructive` com seta para baixo

### Charts (Recharts)
- Fundo transparente (`background: 'transparent'`)
- Cores usando `hsl(var(--primary))` e variantes
- Tooltip com `bg-card border-border rounded-lg`
- Grid com `stroke="hsl(var(--border))"` (linha sutil)
- Fontes: `fill="hsl(var(--muted-foreground))"` nos eixos

### Seller Cards
- Grid responsivo: 1 col mobile, 2 col tablet, 3 col desktop
- Glass card com dot de status no canto superior direito

## CRITÉRIOS DE CONCLUSÃO
- [ ] Dashboard exibe 4 KPI cards com dados reais
- [ ] Monthly Comparison Chart renderiza corretamente
- [ ] Pipeline Overview mostra contagem e valor por estágio
- [ ] Leads by Source e Temperature Charts funcionam
- [ ] Seller Performance Table exibe métricas de tempo de resposta
- [ ] Filtro de período atualiza todos os gráficos
- [ ] Página Sellers lista membros com roles e status
- [ ] Convite por email cria invite no banco e envia email
- [ ] Link do convite funciona no fluxo de cadastro
- [ ] Alterar role de membro funciona
- [ ] Remover membro desvincula da empresa
- [ ] Availability toggle atualiza is_available do profile
- [ ] Exportar CSV faz download com dados corretos
- [ ] Exportar PDF gera relatório com jsPDF
- [ ] Build sem erros de TypeScript
