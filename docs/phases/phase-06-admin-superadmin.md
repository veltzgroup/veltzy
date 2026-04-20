# Phase 06 - Admin Panel + SuperAdmin + White-label + Configurações Avançadas

## OBJETIVO
Implementar o painel administrativo completo do tenant (integrações, origens de lead, white-label, webhooks de saída, logs de auditoria, suporte), o painel SuperAdmin da Daxen Labs (visão global de empresas, impersonação, tickets de suporte) e as configurações avançadas restantes. Ao final desta fase, o produto está feature-complete.

## PRÉ-REQUISITOS
- Fases 1 a 5 concluídas

## NOVAS DEPENDÊNCIAS
Nenhuma dependência nova. Tudo com libs já instaladas.

## MIGRATION SQL

Criar `supabase/migrations/006_admin_superadmin.sql`:

```sql
-- ===========================================
-- TABELAS DA FASE 6
-- ===========================================

-- Source integrations (config técnica por origem de lead)
CREATE TABLE public.source_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    source_id UUID REFERENCES public.lead_sources(id) ON DELETE CASCADE NOT NULL,
    integration_type TEXT NOT NULL
        CHECK (integration_type IN ('manual', 'webhook', 'whatsapp_api', 'instagram_api', 'linkedin_api')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, source_id, integration_type)
);

-- Conexões Instagram OAuth
CREATE TABLE public.instagram_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
    page_id TEXT NOT NULL,
    page_name TEXT,
    instagram_account_id TEXT NOT NULL,
    instagram_username TEXT,
    access_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tickets de suporte
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    error_message TEXT,
    error_stack TEXT,
    page_url TEXT,
    user_agent TEXT,
    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- ÍNDICES
-- ===========================================
CREATE INDEX idx_source_integrations_company ON public.source_integrations(company_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status, created_at DESC);
CREATE INDEX idx_support_tickets_company ON public.support_tickets(company_id);

-- ===========================================
-- RLS
-- ===========================================

ALTER TABLE public.source_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Source Integrations
CREATE POLICY "Members can view source integrations"
ON public.source_integrations FOR SELECT TO authenticated
USING (company_id = get_current_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage source integrations"
ON public.source_integrations FOR ALL TO authenticated
USING (company_id = get_current_company_id() AND is_company_admin() OR is_super_admin());

-- Instagram Connections
CREATE POLICY "Members can view instagram connection"
ON public.instagram_connections FOR SELECT TO authenticated
USING (company_id = get_current_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage instagram connection"
ON public.instagram_connections FOR ALL TO authenticated
USING (company_id = get_current_company_id() AND is_company_admin() OR is_super_admin());

-- Support Tickets
CREATE POLICY "Users can view own tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_super_admin());

CREATE POLICY "Admins can view company tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (company_id = get_current_company_id() AND is_company_admin() OR is_super_admin());

CREATE POLICY "Authenticated can insert tickets"
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "SuperAdmin can update tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (is_super_admin());

-- ===========================================
-- TRIGGERS
-- ===========================================
CREATE TRIGGER on_source_integrations_updated
    BEFORE UPDATE ON public.source_integrations
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_instagram_connections_updated
    BEFORE UPDATE ON public.instagram_connections
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_support_tickets_updated
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

## EDGE FUNCTIONS

### `supabase/functions/instagram-oauth/index.ts`
Fluxo OAuth para conectar conta Instagram Business.

Ações via `?action=`:
- `authorize` → redireciona para URL de autorização do Facebook/Instagram
- `callback` → troca code por access_token, salva em `instagram_connections`
- `refresh` → renova token expirado
- `disconnect` → remove conexão

### `supabase/functions/instagram-webhook/index.ts`
Recebe mensagens Instagram via Graph API.
Mesmo padrão do `zapi-webhook`:
1. Valida `X-Hub-Signature-256`
2. Identifica empresa via `instagram_account_id`
3. Cria lead ou busca existente por `instagram_id`
4. Insere mensagem com `source = 'instagram'`
5. Dispara SDR e automações

### `supabase/functions/instagram-send/index.ts`
Envia mensagens via Instagram Graph API.
Suporta: texto, imagem, áudio, vídeo, documento.

### `supabase/functions/source-webhook/index.ts`
Webhook genérico para landing pages e formulários externos.
URL pública: `/functions/v1/source-webhook?company={slug}&source={source_slug}`

Payload esperado:
```typescript
interface WebhookLeadPayload {
    name?: string
    phone: string
    email?: string
    source?: string
    tags?: string[]
    observations?: string
    metadata?: Record<string, unknown>   // dados extras do formulário
}
```

Fluxo:
1. Valida `company_slug` e `source_slug`
2. Cria lead (ou atualiza se phone já existir)
3. Distribui via Round Robin
4. Dispara automações com trigger `lead_created`
5. Retorna `{ success: true, leadId }`

### `supabase/functions/linkedin-webhook/index.ts`
Recebe dados de leads do LinkedIn (mesmo padrão do source-webhook, mais simples).

## SERVICES

**`src/services/source-integrations.service.ts`**
```typescript
// getIntegrations(companyId) → SourceIntegration[]
// getIntegrationBySource(sourceId) → SourceIntegration | null
// saveIntegration(companyId, sourceId, type, config) → SourceIntegration
// deleteIntegration(id) → void
// generateWebhookUrl(companySlug, sourceSlug) → string
```

**`src/services/instagram.service.ts`**
```typescript
// getConnection(companyId) → InstagramConnection | null
// getAuthUrl(companyId) → string
// disconnect(companyId) → void
```

**`src/services/support.service.ts`**
```typescript
// createTicket(data: CreateTicketInput) → SupportTicket
// getTickets(companyId?) → SupportTicket[]   // companyId null = todos (super admin)
// updateTicketStatus(id, status) → SupportTicket
// getAllTickets() → SupportTicket[]   // super admin only
```

**`src/services/super-admin.service.ts`**
```typescript
// getAllCompanies() → Company[]
// getCompanyDetails(companyId) → CompanyDetails
// toggleCompanyActive(companyId, active) → void
// getAllTickets() → SupportTicket[]
// impersonateCompany(companyId) → void   // seta company_id na store
// stopImpersonation() → void
```

## HOOKS

**`src/hooks/use-source-integrations.ts`**
- `useSourceIntegrations()` - integrações por origem
- `useSaveIntegration()` - mutation
- `useDeleteIntegration()` - mutation

**`src/hooks/use-instagram-connection.ts`**
- `useInstagramConnection()` - estado da conexão
- `useDisconnectInstagram()` - mutation

**`src/hooks/use-support-tickets.ts`**
- `useSupportTickets()` - tickets da empresa
- `useCreateTicket()` - mutation

**`src/hooks/use-super-admin.ts`**
- `useAllCompanies()` - todas as empresas (super admin only)
- `useAllTickets()` - todos os tickets
- `useImpersonation()` - estado de impersonação

**`src/hooks/use-activity-logs.ts`**
- `useActivityLogs(filters?)` - logs paginados
- Filtros: resource_type, action, userId, período

## STORE

Adicionar ao `auth.store.ts`:
```typescript
// Impersonation state (super admin)
impersonatingCompanyId: string | null
impersonatingCompanyName: string | null
setImpersonation: (companyId: string | null, name: string | null) => void
```

## COMPONENTES - ADMIN PANEL (/admin)

O `/admin` já existe (Fase 4 criou automações). Adicionar abas:

### Estrutura de abas do Admin
```
/admin
├── Automações       (já implementado - Fase 4)
├── Origens de Lead  (nova)
├── Integrações      (nova)
├── Webhooks         (nova)
├── Logs             (nova)
└── Relatórios       (já implementado - Fase 5)
```

### Lead Sources Manager
**`src/components/admin/lead-sources-manager.tsx`**
- Lista de origens com toggle ativo/inativo
- Botão "+ Nova Origem"
- Cada origem: ícone, nome, cor, badge "Sistema" se `is_system = true`
- Edit inline: nome, cor, ícone (seletor de ícones Lucide)
- Deletar (desabilitado se tiver leads ativos)
- Sistema de origens não pode ser deletado, apenas desativado

### Source Integrations Panel
**`src/components/admin/source-integrations-panel.tsx`**
Para cada origem ativa, exibe painel de configuração técnica:

**Webhook Config Panel** (`integration_type = 'webhook'`)
- URL do webhook gerada automaticamente (read-only + botão copiar)
- Secret key (read-only + botão regenerar)
- Exemplo de payload JSON
- Botão "Testar webhook" (envia payload de teste)

**WhatsApp Config Panel** (`integration_type = 'whatsapp_api'`)
- Campos: Instance ID, Instance Token, Client Token
- Status da conexão (badge)
- QR Code (quando conectando)
- URL do webhook para configurar no Z-API (read-only + copiar)
- Botão desconectar

**Instagram Config Panel** (`integration_type = 'instagram_api'`)
- Botão "Conectar Instagram Business"
- Status da conexão: conta conectada com @username e foto
- Botão desconectar
- Instruções para configurar webhook no Meta Dashboard

**Manual Config Panel** (`integration_type = 'manual'`)
- Apenas informativo: "Leads adicionados manualmente via interface"

### Webhooks Settings
**`src/components/admin/webhooks-settings.tsx`**
Aba "Webhooks" no Admin:
- Lista de webhooks de saída configurados
- Botão "+ Adicionar webhook"
- Campos: URL, eventos (checkboxes: lead_created, deal_closed, etc.), secret
- Botão "Testar" (envia payload de teste para a URL)
- Toggle ativo/inativo por webhook

### Activity Logs Dashboard
**`src/components/admin/activity-logs-dashboard.tsx`**
Aba "Logs" no Admin:
- Tabela paginada (20 por página)
- Filtros: tipo de recurso (lead, message, user), ação, vendedor, período
- Cada linha: timestamp, usuário, ação, recurso, detalhes (expandível)
- Export CSV dos logs filtrados

---

## COMPONENTES - COMPANY PAGE (/company)

**`src/pages/company.tsx`** (substituir placeholder da Fase 1)

Seções:
- Informações da empresa (nome, slug)
- Logo upload
- Personalização visual (cores primária e secundária + preview)
- Configurações de pagamento (placeholder com "Em breve")

### Company Form
**`src/components/company/company-form.tsx`**
- Input nome da empresa
- Slug (editável, com validação de unicidade)
- Upload de logo (Supabase Storage, bucket `company-assets`)
- Botão salvar

### Theme Customizer
**`src/components/company/theme-customizer.tsx`**
- Color picker para cor primária
- Color picker para cor secundária
- Seletor de estilo de card: Glass / Flat / Elevated
- Seletor de estilo de sidebar: Compact / Expanded
- Preview em tempo real (aplica CSS vars no preview inline)
- Botão salvar (persiste em `system_settings.theme_config`)

---

## COMPONENTES - SETTINGS (/settings)

O `/settings` já tem WhatsApp e SDR (Fases 3 e 4). Adicionar:

### Estrutura completa de abas do Settings
```
/settings
├── Perfil           (nova)
├── WhatsApp         (já implementado - Fase 3)
├── IA SDR           (já implementado - Fase 4)
├── Auto-Reply       (já implementado - Fase 4)
├── Distribuição     (já implementado - Fase 4)
└── Notificações     (nova)
```

### Profile Settings
**`src/components/settings/profile-settings.tsx`**
- Nome do usuário
- Email (read-only)
- Avatar upload
- Botão alterar senha (envia email de reset)

### Notification Preferences
**`src/components/settings/notification-preferences.tsx`**
Toggles por tipo:
- Novo lead atribuído (push + email)
- Nova mensagem não lida (push)
- Lead transferido (push + email)
- Alertas do sistema (email)
Persiste em `system_settings` com key `notification_prefs_{userId}`

---

## COMPONENTES - ERROR REPORT

### Error Report Button
**`src/components/shared/error-report-button.tsx`**
Botão flutuante (fixo no canto inferior direito, só para admins):
- Ícone de bug
- Click abre `ErrorReportDialog`

### Error Report Dialog
**`src/components/shared/error-report-dialog.tsx`**
Modal com:
- Título (input)
- Descrição do problema (textarea)
- Captura automática: URL atual, user agent, stack trace se disponível
- Prioridade (dropdown: Baixa / Média / Alta / Crítica)
- Botão enviar → cria `support_ticket`
- Confirmação de envio

---

## COMPONENTES - SUPER ADMIN (/super-admin)

**`src/pages/super-admin.tsx`**

Estrutura de abas:
```
/super-admin
├── Empresas
├── Tickets de Suporte
└── Convites Globais
```

Acesso restrito: apenas `role = 'super_admin'`.
Banner de aviso no topo: "Painel Daxen Labs — Ambiente de produção"

### Companies Dashboard
**`src/components/super-admin/companies-dashboard.tsx`**
- Tabela de todas as empresas
- Colunas: nome, slug, membros, leads, status (ativo/inativo), criada em
- Botão "Impersonar" → seta empresa na store sem alterar auth
- Toggle ativo/inativo da empresa
- Busca por nome/slug

### Impersonation Banner
**`src/components/super-admin/impersonation-banner.tsx`**
Banner fixo no topo quando impersonando:
- "Visualizando como: [Nome da Empresa]"
- Botão "Sair da impersonação"
- Fundo amarelo âmbar para destaque visual

Quando impersonando, `get_current_company_id()` usa o ID da empresa impersonada (via store, não altera a session real do Supabase — queries manuais passam o company_id explicitamente).

### Support Tickets Dashboard
**`src/components/super-admin/support-tickets-dashboard.tsx`**
- Tabela de todos os tickets de todas as empresas
- Colunas: empresa, usuário, título, prioridade, status, criado em
- Filtros: status, prioridade, empresa
- Click abre detalhes do ticket
- Alterar status: open → in_progress → resolved → closed
- Badge colorido por prioridade (vermelho=crítico, laranja=alto, amarelo=médio, cinza=baixo)

### Super Admin Invites Dashboard
**`src/components/super-admin/invites-dashboard.tsx`**
- Lista de convites de todas as empresas
- Colunas: empresa, email, role, status, expira em
- Filtro por empresa e status
- Botão cancelar convite

---

## DESIGN

### Admin Panel
- Abas horizontais no topo com bordas ativas
- Cada aba: conteúdo em card glass
- Ações destrutivas com confirmação (Dialog)

### Super Admin
- Banner de ambiente: fundo `hsl(43 96% 56% / 0.15)` (âmbar suave)
- Impersonation Banner: `bg-yellow-500/20 border-yellow-500/50`
- Tabelas com hover `bg-muted/50`

### Error Report Button
- Posição: `fixed bottom-6 right-6 z-50`
- Visível apenas para admins
- Ícone `Bug` do Lucide
- Tamanho compacto, tooltip "Reportar problema"

### Theme Customizer Preview
- Mini preview da sidebar + card de lead com as cores aplicadas
- Atualiza em tempo real ao mover o color picker

## CRITÉRIOS DE CONCLUSÃO
- [ ] Lead Sources Manager: criar, editar, ativar/desativar origens
- [ ] Webhook config: URL gerada, copiar, testar
- [ ] WhatsApp config movida para aba Integrações (manter em Settings também)
- [ ] Instagram OAuth: conectar e desconectar
- [ ] Webhooks de saída: criar, editar, testar, toggle
- [ ] Activity Logs: tabela paginada com filtros
- [ ] Company Page: editar nome, logo, cores
- [ ] Theme Customizer: preview em tempo real, salvar
- [ ] Profile Settings: editar nome, avatar, senha
- [ ] Notification Preferences: salvar preferências
- [ ] Error Report Button: criar ticket de suporte
- [ ] Super Admin: lista de empresas com impersonação
- [ ] Impersonation Banner visível ao impersonar
- [ ] Support Tickets Dashboard: todos os tickets, alterar status
- [ ] Edge Functions: instagram-oauth, instagram-webhook, source-webhook deployadas
- [ ] Build sem erros de TypeScript
