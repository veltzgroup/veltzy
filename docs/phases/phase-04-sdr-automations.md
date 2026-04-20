# Phase 04 - IA SDR + Distribuição de Leads + Automações

## OBJETIVO
Implementar a camada inteligente do Veltzy: qualificação automática de leads via IA (score 0-100 + temperatura), distribuição hierárquica com Round Robin, auto-reply fora do horário, automações de fluxo com triggers e ações, e reprocessamento de fila. Ao final desta fase, leads entram, são qualificados pela IA e distribuídos automaticamente para vendedores.

## PRÉ-REQUISITOS
- Fases 1, 2 e 3 concluídas
- Z-API configurado e funcional
- Edge Functions deployadas

## NOVAS DEPENDÊNCIAS
Nenhuma dependência frontend nova nesta fase. Toda a lógica é server-side (Edge Functions).

## MIGRATION SQL

Criar `supabase/migrations/004_sdr_automations.sql`:

```sql
-- ===========================================
-- TABELAS DA FASE 4
-- ===========================================

-- Regras de automação
CREATE TABLE public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL
        CHECK (trigger_type IN (
            'lead_created', 'lead_stage_changed', 'lead_temperature_changed',
            'message_received', 'no_response', 'deal_closed', 'lead_lost'
        )),
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    action_type TEXT NOT NULL
        CHECK (action_type IN (
            'send_message', 'change_stage', 'assign_lead',
            'add_tag', 'remove_tag', 'update_temperature',
            'send_webhook', 'notify_team'
        )),
    action_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    priority INTEGER NOT NULL DEFAULT 0,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Histórico de execução de automações
CREATE TABLE public.automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'success'
        CHECK (status IN ('success', 'failed', 'skipped')),
    trigger_data JSONB DEFAULT '{}'::jsonb,
    old_value JSONB,
    new_value JSONB,
    error_message TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notificações persistentes por usuário
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL
        CHECK (type IN ('new_lead', 'lead_assigned', 'new_message', 'lead_transferred', 'system')),
    title TEXT NOT NULL,
    body TEXT,
    action_type TEXT,
    action_data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- ÍNDICES
-- ===========================================
CREATE INDEX idx_automation_rules_company ON public.automation_rules(company_id, is_enabled);
CREATE INDEX idx_automation_logs_company ON public.automation_logs(company_id, executed_at DESC);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_leads_queued ON public.leads(company_id, is_queued) WHERE is_queued = true;

-- ===========================================
-- RLS
-- ===========================================

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view automation rules"
ON public.automation_rules FOR SELECT TO authenticated
USING (company_id = get_current_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage automation rules"
ON public.automation_rules FOR ALL TO authenticated
USING (company_id = get_current_company_id() AND is_admin_or_manager() OR is_super_admin());

CREATE POLICY "Members can view automation logs"
ON public.automation_logs FOR SELECT TO authenticated
USING (company_id = get_current_company_id() OR is_super_admin());

CREATE POLICY "System can insert automation logs"
ON public.automation_logs FOR INSERT TO authenticated
WITH CHECK (company_id = get_current_company_id() OR is_super_admin());

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_super_admin());

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (company_id = get_current_company_id() OR is_super_admin());

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- ===========================================
-- REALTIME
-- ===========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE TRIGGER on_automation_rules_updated
    BEFORE UPDATE ON public.automation_rules
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

## EDGE FUNCTIONS

### `supabase/functions/sdr-ai/index.ts`
Qualifica um lead automaticamente via IA.

Recebe:
```typescript
interface SDRPayload {
    leadId: string
    companyId: string
    messageContent: string
    conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>
}
```

Fluxo:
1. Busca `sdr_config` da empresa em `system_settings`
2. Se `sdr_config.enabled = false` → retorna sem processar
3. Monta prompt com histórico da conversa + dados do lead
4. Chama OpenAI (GPT-4o-mini por padrão) ou Gemini (se configurado)
5. Resposta esperada em JSON:
```json
{
    "score": 72,
    "temperature": "hot",
    "response": "Olá! Vi que você tem interesse em...",
    "should_respond": true,
    "reasoning": "Lead demonstrou interesse claro"
}
```
6. Atualiza `leads.ai_score` e `leads.temperature`
7. Se `should_respond = true`: insere mensagem de resposta + envia via zapi-send
8. Registra em `automation_logs`

Prompt padrão do sistema (configurável por empresa):
```
Você é um SDR (Sales Development Representative) especialista em qualificação de leads.
Analise a conversa e retorne um JSON com:
- score: número de 0-100 indicando potencial de compra
- temperature: cold/warm/hot/fire
- response: mensagem de resposta ao lead (em português, natural e amigável)
- should_respond: true se deve responder agora, false se deve aguardar
- reasoning: breve explicação da pontuação

Contexto da empresa: {company_context}
Dados do lead: {lead_data}
```

### `supabase/functions/run-automations/index.ts`
Executa regras de automação para um lead após um trigger.

Recebe:
```typescript
interface AutomationPayload {
    trigger: string           // ex: 'lead_created', 'lead_stage_changed'
    leadId: string
    companyId: string
    triggerData: Record<string, unknown>   // dados contextuais do trigger
}
```

Fluxo:
1. Busca regras ativas da empresa com `trigger_type = payload.trigger`
2. Ordena por `priority DESC`
3. Para cada regra:
   a. Avalia `conditions` (ex: `temperature == 'hot'`, `source == 'whatsapp'`)
   b. Se condições passam → executa `action_type` com `action_data`
   c. Registra resultado em `automation_logs`

Tipos de condição suportados:
```typescript
interface Condition {
    field: string          // 'temperature', 'source', 'ai_score', 'stage_id', 'assigned_to'
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'in'
    value: unknown
}
```

Tipos de ação:
- `send_message`: envia mensagem WhatsApp via zapi-send
- `change_stage`: move lead para outro stage
- `assign_lead`: reatribui para vendedor específico ou round robin
- `add_tag` / `remove_tag`: gerencia tags do lead
- `update_temperature`: altera temperatura manualmente
- `notify_team`: cria notificação para membros da equipe

### `supabase/functions/distribute-queue/index.ts`
Heartbeat (cron a cada 2 minutos) que reprocessa leads na fila.

Fluxo:
1. Busca leads com `is_queued = true` por empresa
2. Para cada empresa com leads na fila:
   a. Busca vendedores com `is_available = true`
   b. Se há vendedores disponíveis → distribui via Round Robin
   c. Atualiza `is_queued = false` nos leads distribuídos
3. Registra em `activity_logs`

Configurar cron no `supabase/config.toml`:
```toml
[functions.distribute-queue]
schedule = "*/2 * * * *"
```

### Atualizar `supabase/functions/zapi-webhook/index.ts`
Integrar chamadas ao SDR e automações após criar mensagem:

```typescript
// Após inserir mensagem no banco:

// 1. Dispara IA SDR se habilitado
if (sdrConfig.enabled && lead.is_ai_active) {
    await fetch(`${supabaseUrl}/functions/v1/sdr-ai`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ leadId, companyId, messageContent, conversationHistory })
    })
}

// 2. Dispara automações
await fetch(`${supabaseUrl}/functions/v1/run-automations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceRoleKey}` },
    body: JSON.stringify({
        trigger: isNewLead ? 'lead_created' : 'message_received',
        leadId, companyId,
        triggerData: { messageContent, source: 'whatsapp' }
    })
})

// 3. Auto-reply fora do horário (se habilitado e ninguém online)
const autoReplyConfig = await getAutoReplyConfig(companyId)
if (autoReplyConfig.enabled && isOutsideBusinessHours(autoReplyConfig) && isNewLead) {
    await sendAutoReply(leadId, companyId, autoReplyConfig.message)
}
```

### Lógica de Auto-Reply
Verificar horário comercial configurado em `system_settings.business_rules`:
```typescript
interface AutoReplyConfig {
    enabled: boolean
    message: string
    schedule: {
        start: string      // "08:00"
        end: string        // "18:00"
        days: number[]     // [1,2,3,4,5] (0=dom, 6=sab)
        timezone: string   // "America/Sao_Paulo"
    }
}

function isOutsideBusinessHours(config: AutoReplyConfig): boolean {
    const now = new Date(new Date().toLocaleString('en', { timeZone: config.schedule.timezone }))
    const day = now.getDay()
    const time = now.getHours() * 60 + now.getMinutes()
    const [startH, startM] = config.schedule.start.split(':').map(Number)
    const [endH, endM] = config.schedule.end.split(':').map(Number)
    const start = startH * 60 + startM
    const end = endH * 60 + endM
    return !config.schedule.days.includes(day) || time < start || time >= end
}
```

## SERVICES

**`src/services/sdr.service.ts`**
```typescript
// getSdrConfig(companyId) → SdrConfig
// saveSdrConfig(companyId, config) → void
// toggleSdrForLead(leadId, enabled) → void
// getSdrMetrics(companyId, period) → SdrMetrics
```

**`src/services/automations.service.ts`**
```typescript
// getRules(companyId) → AutomationRule[]
// createRule(companyId, data) → AutomationRule
// updateRule(id, data) → AutomationRule
// deleteRule(id) → void
// toggleRule(id, enabled) → void
// getLogs(companyId, filters?) → AutomationLog[]
```

**`src/services/notifications.service.ts`**
```typescript
// getNotifications(userId) → Notification[]
// markAsRead(notificationId) → void
// markAllAsRead(userId) → void
// getUnreadCount(userId) → number
```

## HOOKS

**`src/hooks/use-sdr-config.ts`**
- `useSdrConfig()` - configurações da IA SDR
- `useSaveSdrConfig()` - mutation para salvar

**`src/hooks/use-automation-rules.ts`**
- `useAutomationRules()` - regras com React Query
- `useCreateRule()`, `useUpdateRule()`, `useDeleteRule()`, `useToggleRule()`

**`src/hooks/use-automation-logs.ts`**
- `useAutomationLogs(filters?)` - histórico paginado

**`src/hooks/use-notifications.ts`**
- `useNotifications()` - lista com Realtime subscription
- `useUnreadCount()` - badge no header
- `useMarkAsRead()`, `useMarkAllAsRead()`

**`src/hooks/use-global-sdr-enabled.ts`**
- `useGlobalSdrEnabled()` - feature flag `ai_sdr_enabled` da empresa

## STORE

**`src/stores/notifications.store.ts`**
```typescript
interface NotificationsState {
    notifications: Notification[]
    unreadCount: number
    isOpen: boolean
    setNotifications: (n: Notification[]) => void
    setUnreadCount: (n: number) => void
    setIsOpen: (open: boolean) => void
    markRead: (id: string) => void
}
```

## COMPONENTES

### Notification Center
**`src/components/shared/notification-center.tsx`**
- Popover no header com lista de notificações
- Badge com contagem de não lidas
- Botão "Marcar todas como lidas"
- Item de notificação com ícone por tipo, título, corpo e tempo relativo
- Click navega para o recurso relacionado (lead, conversa)
- Realtime: badge atualiza ao receber nova notificação

### SDR Settings
**`src/components/settings/sdr-settings.tsx`**
Aba "IA SDR" em `/settings`:
- Toggle global (habilitar/desabilitar SDR para empresa)
- Seleção de modelo: GPT-4o-mini / GPT-4o / Gemini Flash / Gemini Pro
- Campo de API Key (criptografado, exibido como ••••)
- Textarea de prompt customizado (com placeholder do prompt padrão)
- Botão "Testar SDR" (envia mensagem de teste e exibe resposta)
- Aviso: "A IA SDR processa mensagens entrantes automaticamente"

### SDR Lead Toggle
**`src/components/pipeline/sdr-lead-toggle.tsx`**
Pequeno toggle no EditLeadModal para habilitar/desabilitar SDR por lead:
- Switch "IA SDR ativa para este lead"
- Só visível se feature `ai_sdr_enabled` da empresa estiver habilitada

### Automation Rules Manager
**`src/components/admin/automation-rules-manager.tsx`**
Página/aba de automações em `/admin`:
- Lista de regras com toggle ativo/inativo
- Badge do trigger type
- Botão "+ Nova Regra" abre `AutomationRuleModal`
- Botão de logs abre `AutomationLogsDrawer`

### Automation Rule Modal
**`src/components/admin/automation-rule-modal.tsx`**
Formulário de criação/edição de regra:
- Nome da regra
- Trigger: dropdown com tipos disponíveis
- Condições: lista dinâmica de condições (campo + operador + valor)
  - Botão "+ Adicionar condição"
  - Cada condição: select do campo, select do operador, input do valor
- Ação: dropdown do tipo de ação + campos dinâmicos conforme tipo
- Toggle ativo/inativo
- Preview: "Quando [trigger] e [condições], então [ação]"

### Automation Logs Drawer
**`src/components/admin/automation-logs-drawer.tsx`**
- Drawer lateral com histórico de execuções
- Filtro por regra, status (success/failed/skipped), período
- Cada log: timestamp, regra, lead, status, dados de antes/depois
- Badge colorido por status

### Auto-Reply Settings
**`src/components/settings/auto-reply-settings.tsx`**
Aba "Auto-Reply" em `/settings`:
- Toggle habilitar/desabilitar
- Textarea da mensagem automática
- Seleção de dias da semana (checkboxes: Seg-Dom)
- Horário início e fim (time inputs)
- Fuso horário (fixo: America/Sao_Paulo)
- Preview: "Mensagem enviada quando leads entram fora do horário comercial"

### Business Rules Settings
**`src/components/settings/business-rules-settings.tsx`**
Aba "Distribuição" em `/settings`:
- Fallback de atribuição: dropdown (Admin / Manager)
- Mensagem quando ninguém está disponível
- Toggle: permitir que sellers marquem disponibilidade

## ATUALIZAR REALTIME HUB

Adicionar ao `use-realtime-hub.ts`:
```typescript
// Novo canal: notifications
supabase.channel('notifications')
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
    }, (payload) => {
        notificationsStore.addNotification(payload.new)
    })
    .subscribe()
```

## VARIÁVEIS DE AMBIENTE (EDGE FUNCTIONS)

Adicionar nos secrets do Supabase:
```
OPENAI_API_KEY=          # Chave padrão da Daxen Labs (fallback)
GEMINI_API_KEY=          # Opcional
```

Chaves do cliente (por empresa) ficam em `system_settings.sdr_config.api_key` e sobrescrevem as defaults.

## DESIGN

### Notification Badge
- Círculo vermelho `bg-destructive` com número branco
- Posição: top-right no ícone do sino
- Pulsa com `animate-pulse` quando há novas notificações

### Automation Rules
- Lista com cards compactos (glass-card)
- Trigger badge: roxo
- Action badge: azul
- Status toggle: verde/cinza
- Row hover: `bg-muted/50`

### SDR Score no Lead Card
- Barra de progresso colorida por faixa:
  - 0-33: `bg-destructive`
  - 34-66: `bg-yellow-500`
  - 67-100: `bg-primary` (verde)
- Tooltip com "Score IA: X/100"

## CRITÉRIOS DE CONCLUSÃO
- [ ] IA SDR qualifica lead ao receber mensagem (score + temperatura)
- [ ] IA SDR responde automaticamente quando habilitada
- [ ] Toggle de SDR por lead funciona no modal
- [ ] Configurações de SDR (modelo, prompt, API key) salvam corretamente
- [ ] Round Robin distribui leads para vendedores online
- [ ] Leads sem vendedor disponível vão para fila (`is_queued = true`)
- [ ] Cron `distribute-queue` reprocessa fila a cada 2 minutos
- [ ] Auto-reply envia mensagem fora do horário comercial
- [ ] Automações executam ao trigger correto
- [ ] Condições de automação filtram corretamente
- [ ] Logs de automação registram sucesso e falha
- [ ] Notificações aparecem em tempo real no header
- [ ] Marcar notificações como lidas funciona
- [ ] Build sem erros de TypeScript
