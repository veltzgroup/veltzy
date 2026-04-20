# Phase 02 - Pipeline Kanban + Leads

## OBJETIVO
Implementar o core do CRM: pipeline kanban drag & drop com fases customizáveis, gestão completa de leads (criar, editar, visualizar, mover entre fases), filtros por origem e busca. Ao final desta fase, o usuário consegue gerenciar leads no pipeline visualmente.

## PRÉ-REQUISITOS
- Fase 1 concluída (auth, multi-tenant, onboarding, layout)
- Projeto rodando sem erros de build

## NOVAS DEPENDÊNCIAS
```bash
npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm i canvas-confetti
npm i -D @types/canvas-confetti
```

## MIGRATION SQL

Criar `supabase/migrations/002_leads_pipeline.sql`:

```sql
-- ===========================================
-- TABELAS DA FASE 2
-- ===========================================

-- Leads
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    instagram_id TEXT,
    linkedin_id TEXT,
    source_id UUID REFERENCES public.lead_sources(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
    status lead_status NOT NULL DEFAULT 'new',
    temperature lead_temperature NOT NULL DEFAULT 'cold',
    ai_score INTEGER NOT NULL DEFAULT 0 CHECK (ai_score >= 0 AND ai_score <= 100),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_ai_active BOOLEAN NOT NULL DEFAULT false,
    is_queued BOOLEAN NOT NULL DEFAULT false,
    conversation_status conversation_status NOT NULL DEFAULT 'unread',
    tags TEXT[] NOT NULL DEFAULT '{}',
    deal_value NUMERIC(12,2),
    observations TEXT,
    avatar_url TEXT,
    ad_context JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, phone)
);

-- Mapeamento N:N pipeline_stage <-> lead_source
CREATE TABLE public.pipeline_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.pipeline_stages(id) ON DELETE CASCADE NOT NULL,
    source_id UUID REFERENCES public.lead_sources(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (pipeline_id, source_id)
);

-- Activity logs (auditoria de leads)
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- FUNÇÕES
-- ===========================================

-- Sincroniza lead.status quando stage muda (stage final → deal ou lost)
CREATE OR REPLACE FUNCTION public.sync_lead_status_from_stage()
RETURNS TRIGGER AS $$
DECLARE
    _stage RECORD;
BEGIN
    IF NEW.stage_id IS NOT NULL AND NEW.stage_id != OLD.stage_id THEN
        SELECT is_final, is_positive INTO _stage
        FROM public.pipeline_stages WHERE id = NEW.stage_id;

        IF _stage.is_final THEN
            NEW.status = CASE WHEN _stage.is_positive THEN 'deal'::lead_status ELSE 'lost'::lead_status END;
        ELSE
            IF OLD.status IN ('deal', 'lost') THEN
                NEW.status = 'open'::lead_status;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_lead_stage_changed
    BEFORE UPDATE OF stage_id ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.sync_lead_status_from_stage();

-- Log automático de mudança de stage
CREATE OR REPLACE FUNCTION public.log_lead_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.activity_logs (company_id, user_id, action, resource_type, resource_id, metadata)
        VALUES (NEW.company_id, auth.uid(), 'created', 'lead', NEW.id, jsonb_build_object('name', NEW.name, 'phone', NEW.phone));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.stage_id != NEW.stage_id THEN
            INSERT INTO public.activity_logs (company_id, user_id, action, resource_type, resource_id, metadata)
            VALUES (NEW.company_id, auth.uid(), 'stage_changed', 'lead', NEW.id,
                jsonb_build_object('from_stage', OLD.stage_id, 'to_stage', NEW.stage_id));
        END IF;
        IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
            INSERT INTO public.activity_logs (company_id, user_id, action, resource_type, resource_id, metadata)
            VALUES (NEW.company_id, auth.uid(), 'assigned', 'lead', NEW.id,
                jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_lead_activity
    AFTER INSERT OR UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.log_lead_activity();

-- ===========================================
-- RLS
-- ===========================================

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Leads: admins/managers veem todos, sellers veem apenas atribuídos
CREATE POLICY "Admins and managers see all leads"
ON public.leads FOR SELECT TO authenticated
USING (
    company_id = get_current_company_id()
    AND (is_admin_or_manager() OR assigned_to = get_current_profile_id())
    OR is_super_admin()
);

CREATE POLICY "Members can insert leads"
ON public.leads FOR INSERT TO authenticated
WITH CHECK (company_id = get_current_company_id() OR is_super_admin());

CREATE POLICY "Admins and managers can update any lead"
ON public.leads FOR UPDATE TO authenticated
USING (
    company_id = get_current_company_id()
    AND (is_admin_or_manager() OR assigned_to = get_current_profile_id())
    OR is_super_admin()
);

CREATE POLICY "Admins can delete leads"
ON public.leads FOR DELETE TO authenticated
USING (company_id = get_current_company_id() AND is_company_admin() OR is_super_admin());

-- Pipeline Sources
CREATE POLICY "Members can view pipeline sources"
ON public.pipeline_sources FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pipeline_stages ps
        WHERE ps.id = pipeline_sources.pipeline_id
        AND ps.company_id = get_current_company_id()
    ) OR is_super_admin()
);

CREATE POLICY "Admins can manage pipeline sources"
ON public.pipeline_sources FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pipeline_stages ps
        WHERE ps.id = pipeline_sources.pipeline_id
        AND ps.company_id = get_current_company_id()
        AND is_company_admin()
    ) OR is_super_admin()
);

-- Activity Logs
CREATE POLICY "Members can view company activity"
ON public.activity_logs FOR SELECT TO authenticated
USING (company_id = get_current_company_id() OR is_super_admin());

CREATE POLICY "System can insert activity logs"
ON public.activity_logs FOR INSERT TO authenticated
WITH CHECK (company_id = get_current_company_id() OR is_super_admin());

-- ===========================================
-- UPDATED_AT + REALTIME
-- ===========================================
CREATE TRIGGER on_leads_updated
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
```

## NOVOS TYPES

Adicionar em `src/types/database.ts`:

```typescript
export interface Lead {
    id: string
    company_id: string
    name: string | null
    phone: string
    email: string | null
    instagram_id: string | null
    linkedin_id: string | null
    source_id: string | null
    stage_id: string
    status: LeadStatus
    temperature: LeadTemperature
    ai_score: number
    assigned_to: string | null
    is_ai_active: boolean
    is_queued: boolean
    conversation_status: ConversationStatus
    tags: string[]
    deal_value: number | null
    observations: string | null
    avatar_url: string | null
    ad_context: AdContext | null
    created_at: string
    updated_at: string
}

export interface AdContext {
    ad_id?: string
    ad_title?: string
    ad_body?: string
    photo_url?: string
    media_url?: string
    media_type?: 'image' | 'video'
    source?: string
    source_url?: string
    ctwa_clid?: string
}

export interface LeadWithDetails extends Lead {
    profiles?: Partial<Profile> | null
    lead_sources?: LeadSourceRecord | null
    pipeline_stages?: PipelineStage | null
}

export interface CreateLeadInput {
    name?: string
    phone: string
    email?: string
    source_id?: string
    stage_id: string
    temperature?: LeadTemperature
    deal_value?: number
    observations?: string
    assigned_to?: string
    tags?: string[]
}

export interface UpdateLeadInput {
    name?: string | null
    phone?: string
    email?: string | null
    source_id?: string | null
    stage_id?: string
    status?: LeadStatus
    temperature?: LeadTemperature
    ai_score?: number
    assigned_to?: string | null
    is_ai_active?: boolean
    tags?: string[]
    deal_value?: number | null
    observations?: string | null
    conversation_status?: ConversationStatus
}

// Helpers visuais
export const leadTemperatureConfig: Record<LeadTemperature, {
    label: string; emoji: string; color: string; bgColor: string; borderColor: string
}> = {
    cold:  { label: 'Frio',          emoji: '🥶', color: 'text-blue-400',   bgColor: 'bg-blue-500/10',   borderColor: 'border-blue-500/30' },
    warm:  { label: 'Morno',         emoji: '😊', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
    hot:   { label: 'Quente',        emoji: '🔥', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
    fire:  { label: 'Pegando Fogo',  emoji: '💥', color: 'text-red-400',    bgColor: 'bg-red-500/10',    borderColor: 'border-red-500/30' },
}
```

## SERVICES

**`src/services/leads.service.ts`**
```typescript
// getLeadsByCompany(companyId, filters?) → LeadWithDetails[]
// getLeadById(leadId) → LeadWithDetails
// createLead(companyId, data: CreateLeadInput) → Lead
// updateLead(leadId, data: UpdateLeadInput) → Lead
// deleteLead(leadId) → void
// moveLeadToStage(leadId, stageId) → Lead  ← usado pelo kanban drag & drop
// getLeadsByStage(companyId, stageId) → Lead[]
```

**`src/services/pipeline.service.ts`**
```typescript
// getPipelineStages(companyId) → PipelineStage[]
// createStage(companyId, data) → PipelineStage
// updateStage(stageId, data) → PipelineStage
// deleteStage(stageId) → void
// reorderStages(stageIds: string[]) → void  ← atualiza position em batch
```

## HOOKS

**`src/hooks/use-leads.ts`**
- `useLeads(filters?)` - lista leads com React Query, filtros opcionais (stage, source, temperature, search)
- `useCreateLead()` - mutation para criar
- `useUpdateLead()` - mutation para atualizar
- `useDeleteLead()` - mutation para deletar
- `useMoveLeadToStage()` - mutation otimista para drag & drop

**`src/hooks/use-pipeline-stages.ts`**
- `usePipelineStages()` - fases ordenadas por position
- `useCreateStage()` - mutation
- `useUpdateStage()` - mutation
- `useDeleteStage()` - mutation
- `useReorderStages()` - mutation em batch

**`src/hooks/use-lead-sources.ts`**
- `useLeadSources()` - origens ativas da empresa

## STORE

Adicionar ao `src/stores/pipeline.store.ts`:
```typescript
interface PipelineState {
    activeLeadId: string | null       // lead sendo arrastado
    selectedLeadId: string | null     // lead selecionado (modal aberto)
    filters: PipelineFilters
    setActiveLeadId: (id: string | null) => void
    setSelectedLeadId: (id: string | null) => void
    setFilters: (filters: Partial<PipelineFilters>) => void
}

interface PipelineFilters {
    search: string
    sourceId: string | null
    temperature: LeadTemperature | null
    assignedTo: string | null
}
```

## COMPONENTES

### Pipeline Page (fina)
**`src/pages/pipeline.tsx`**
Apenas composição: `<PipelineBoard />` + `<PipelineHeader />`

### Pipeline Board
**`src/components/pipeline/pipeline-board.tsx`**
- `DndContext` do dnd-kit envolvendo todas as colunas
- Gerencia eventos `onDragStart`, `onDragEnd`
- No `onDragEnd`: chama `useMoveLeadToStage` com update otimista
- Renderiza `StageColumn` para cada fase

### Stage Column
**`src/components/pipeline/stage-column.tsx`**
Props: `stage: PipelineStage`, `leads: Lead[]`
- Header: nome da fase + badge com count + cor da fase
- Área droppable com `useDroppable`
- Lista de `LeadCard` dentro de `SortableContext`
- Rodapé: botão "+ Novo Lead" que abre `CreateLeadModal` com stage pré-selecionado

### Lead Card
**`src/components/pipeline/lead-card.tsx`**
Props: `lead: LeadWithDetails`
- Draggable com `useSortable`
- Exibe: nome/telefone, temperatura (emoji), ai_score (barra), origem (badge colorido), vendedor atribuído (avatar)
- Click abre `EditLeadModal`
- Visual: glass card com hover elevado (`kanban-card` do design system)
- Animação: `animate-fade-in` ao montar

### Create Lead Modal
**`src/components/pipeline/create-lead-modal.tsx`**
Campos: nome, telefone*, email, origem, fase*, temperatura, valor do negócio, vendedor, observações, tags
Validação zod:
```typescript
const schema = z.object({
    phone: z.string().min(8, 'Telefone inválido'),
    name: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    stage_id: z.string().uuid(),
    source_id: z.string().uuid().optional(),
    temperature: z.enum(['cold', 'warm', 'hot', 'fire']).default('cold'),
    deal_value: z.number().positive().optional(),
    assigned_to: z.string().uuid().optional(),
    observations: z.string().optional(),
    tags: z.array(z.string()).default([]),
})
```

### Edit Lead Modal
**`src/components/pipeline/edit-lead-modal.tsx`**
- Mesmos campos do Create + campos somente leitura (score IA, status da conversa, data de criação)
- Tab "Informações" + tab "Histórico" (activity logs — placeholder vazio por ora)
- Botão de deletar lead (com confirmação)
- Ao mover para estágio final positivo: dispara confetti (`celebration.ts`)

### Pipeline Header
**`src/components/pipeline/pipeline-header.tsx`**
- Título "Pipeline"
- Busca (filtra cards em tempo real)
- Filtro por origem (dropdown)
- Filtro por temperatura (dropdown)
- Botão "+ Novo Lead"
- Botão de configuração de fases (abre `StageManagerModal`)

### Stage Manager Modal
**`src/components/pipeline/stage-manager-modal.tsx`**
- Lista de fases com drag para reordenar (dnd-kit)
- Editar nome e cor de cada fase inline
- Adicionar nova fase
- Deletar fase (desabilitado se tiver leads)
- Só visível para admin/manager

### Lead Source Badge
**`src/components/pipeline/lead-source-badge.tsx`**
Props: `source: LeadSourceRecord | null`
Pill com cor e ícone da origem (reaproveitar lógica do Lovable)

### Lead Tags Input
**`src/components/pipeline/lead-tags-input.tsx`**
Input de tags com chips removíveis (reaproveitar do Lovable)

### Celebration
**`src/lib/celebration.ts`**
```typescript
// triggerCelebration() → dispara canvas-confetti
// Copiar implementação do projeto Lovable
```

## ROTA

Adicionar em `App.tsx`:
```tsx
<Route path="/pipeline" element={<Pipeline />} />
```

Habilitar link na sidebar (estava disabled na Fase 1).

## DESIGN DO PIPELINE

### Layout geral
- Scroll horizontal nas colunas (overflow-x: auto)
- Cada coluna com `min-width: 280px`, `max-width: 320px`
- Gap entre colunas: 16px
- Header fixo no topo da página

### Coluna
- Fundo: `bg-muted/30` com `rounded-xl`
- Header: cor da fase como borda superior (4px)
- Altura mínima: 500px para área droppable visual

### Card (Lead)
- Glass card: `bg-card/80 backdrop-blur-sm`
- Hover: `shadow-lg border-primary/20`
- Dragging: `opacity-50 scale-105 shadow-xl`
- Score bar: gradiente de cor baseado no valor (0-33 vermelho, 34-66 amarelo, 67-100 verde)

### DragOverlay
- Card clonado com `scale-105` e `rotate-2` ao arrastar
- Shadow intensa para sensação de profundidade

## CRITÉRIOS DE CONCLUSÃO
- [ ] Pipeline kanban renderiza todas as fases da empresa
- [ ] Cards de lead exibem informações corretas
- [ ] Drag & drop move lead entre fases (update otimista no banco)
- [ ] Ao mover para fase final positiva, dispara confetti
- [ ] Status do lead sincroniza com o tipo da fase (trigger SQL)
- [ ] Modal de criar lead funciona com validação
- [ ] Modal de editar lead funciona com todas as informações
- [ ] Busca filtra cards em tempo real (client-side)
- [ ] Filtros por origem e temperatura funcionam
- [ ] Stage Manager permite adicionar, editar, reordenar e deletar fases
- [ ] Scroll horizontal funciona em telas menores
- [ ] Realtime: ao criar/mover lead em outra aba, pipeline atualiza
- [ ] Build sem erros de TypeScript
