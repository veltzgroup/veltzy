# PRD - Veltzy: CRM Multi-tenant com IA SDR e Atendimento Multicanal

## 1. VISÃO DO PRODUTO
Veltzy é um SaaS CRM multi-tenant white-label voltado para consultores e empresas que automatizam a captação, qualificação e distribuição de leads via WhatsApp, Instagram, LinkedIn, Webhook e cadastro Manual. Combina IA SDR para qualificação automática, pipeline dinâmico drag & drop, distribuição hierárquica de leads e atendimento multicanal em tempo real.

## 2. PERSONAS E ACESSOS

### Super Admin (Daxen Labs) — `/super-admin`
- Visão global de todas as empresas (tenants)
- Impersonação de qualquer empresa via seletor administrativo
- Dashboard de tickets de suporte de todos os tenants
- Gestão de convites globais (`SuperAdminInvitesDashboard`)

### Org Admin
- Gerencia empresa, equipe, roles e convites
- Configura integrações (WhatsApp/Z-API, Instagram OAuth, Webhooks, LinkedIn)
- Configura IA SDR (modelo, prompts, comportamento)
- Define regras de negócio, automações e Auto-Reply
- Gerencia tema white-label e configurações de pagamento

### Org Manager
- Supervisiona pipeline, equipe de vendedores e métricas
- Aprova trocas manuais de leads entre vendedores
- Acessa dashboards de métricas SDR e tempo de resposta
- Gerencia automações e regras de distribuição

### Org Seller
- Atende leads atribuídos via Inbox multicanal
- Gerencia chat manual com texto, imagem, áudio, vídeo e documentos
- Marca disponibilidade (`is_available`) para entrar/sair do Round Robin
- Usa templates de resposta rápida e mensagens agendadas

## 3. FUNCIONALIDADES CORE

### IA SDR Automatizada (`sdr-ai`)
- Qualificação automática por score (0-100) e temperatura (cold/warm/hot/fire)
- Modelos suportados via Lovable AI Gateway (Gemini, GPT) ou chaves próprias do cliente
- Configuração granular por empresa em `SdrSettings`
- Dashboard de métricas SDR (`SdrMetricsDashboard`)
- Dicas de follow-up geradas pela IA (`AIFollowUpTips`)

### Pipeline Dinâmico Drag & Drop
- Fases customizáveis por empresa (`pipeline_stages`)
- Posicionamento, cor, status final e flag de positivo/negativo por etapa
- Mapeamento N:N origem→pipeline via `pipeline_sources`
- Tabs por origem (`SourceTabs`) e cards de lead arrastáveis (`LeadCard`)
- Modais de criação e edição (`CreateLeadModal`, `EditLeadModal`)

### Inbox Multicanal Realtime
- WhatsApp via Z-API (`zapi-webhook`, `zapi-send`)
- Instagram DM via OAuth + Webhooks (`instagram-oauth`, `instagram-webhook`, `instagram-send`)
- LinkedIn via Webhook (`linkedin-webhook`)
- Suporte a texto, imagem, áudio, vídeo e documento
- Indicador de digitação em tempo real (`useTypingIndicator`)
- Alerta sonoro de mensagens não respondidas (`useInactiveMessageAlert`)
- Upload de mídias (`ChatMediaUpload`)
- Card de contexto de anúncios Meta Ads (`AdContextCard`)
- Status de conversa: unread, read, replied, waiting_client, waiting_internal, resolved
- Mensagens com reply (resposta a mensagem específica)

### Distribuição Hierárquica de Leads
- Round Robin entre vendedores online (sem regra de foco)
- Fallback aceita admin **ou** manager configurado
- Se ninguém disponível, lead vai para fila (`is_queued = true`)
- Heartbeat a cada 2 minutos reprocessa fila (`distribute-queue`)
- Trocas entre vendedores apenas manuais pelo gestor (sem reatribuição automática)

### Auto-Reply Fora do Horário
- Mensagem automática configurável por janela de horário (start/end)
- Seleção de dias da semana ativos
- Disparada apenas para leads novos quando ninguém está online
- Não interfere com IA SDR (que tem prioridade quando habilitada)
- Configuração por empresa em `system_settings.auto_reply_config`

### Mensagens Agendadas
- Envio programado de mensagens (`send-scheduled-messages`)
- Campo `scheduled_at` e `is_scheduled` na tabela `messages`

### Templates de Resposta Rápida
- Biblioteca de respostas categorizadas por empresa (`reply_templates`)
- Hook `useReplyTemplates` para inserção rápida no chat

### Automações de Fluxo
- Regras com `trigger_type`, `conditions` e `action_data` (`automation_rules`)
- Histórico de execução (`automation_logs`)
- Gestão visual via `AutomationRulesManager`
- Execução server-side (`run-automations`)

### Central de Notificações
- Notificações persistentes por usuário (`notifications`)
- Realtime via Supabase Channels (`useRealtimeHub`, `useNotifications`)
- Tipos: novas mensagens, atribuições, transferências
- Componente `NotificationCenter` + badge de novos leads (`NewLeadsBadge`)
- Preferências de notificação por usuário (`useNotificationPreferences`)

### Dashboard Analítico
- Métricas de conversão e receita
- Comparação mensal (`MonthlyComparisonChart`)
- Visão geral do pipeline (`PipelineOverview`)
- Tempo médio de resposta por vendedor (`useSellerResponseTimes`)
- Filtro de período (`DashboardPeriodFilter`)
- Dicas de follow-up via IA (`AIFollowUpTips`)

### Relatórios e Exportações
- Relatório de vendas exportável (`generateSalesReport.ts`)
- Exportação de leads (`ExportLeadsModal`, `exportLeads.ts`)
- Aba dedicada de relatórios (`ReportsTab`)

### Gestão de Origens de Lead
- Origens customizáveis por empresa (`lead_sources`)
- Integrações técnicas por origem (`source_integrations`)
- Tipos: manual, webhook, whatsapp_api, instagram_api, linkedin_api
- Painéis de configuração: `WebhookConfigPanel`, `WhatsAppConfigPanel`, `ManualConfigPanel`
- Webhook genérico para landing pages e formulários (`source-webhook`)
- Webhooks de saída configuráveis (`WebhooksSettings`)

### Gestão de Equipe
- Convites por email com código (`company_invites`, `send-invite-email`)
- Painel de gestão (`TeamManagementPanel`, `InviteMemberModal`)
- Roles separadas em `user_roles` (super_admin, admin, manager, seller)
- Status de disponibilidade por vendedor (`useOnlineSellers`, `useSellers`)
- Remoção de usuários da empresa via RPC

### Logs e Auditoria
- Histórico de ações (`activity_logs`, `useActivityLogs`)
- Dashboard administrativo (`ActivityLogsDashboard`)

### Sistema de Suporte
- Botão de reporte de erro em toda a interface (`ErrorReportButton`, `ErrorReportDialog`)
- Tickets com contexto técnico (URL, user agent, stack trace)
- Dashboard de tickets para Super Admin (`SupportTicketsDashboard`)

### Onboarding e Empresa
- Fluxo de criação de empresa (`Onboarding`)
- Página de gestão da empresa (`Company`)
- Primeiro usuário promovido automaticamente a admin
- Triggers automáticos criam pipeline padrão (6 fases), origens padrão (WhatsApp, Instagram, Manual/Webhook) e configurações iniciais

### Tema e White-label
- Modo claro/escuro (`ThemeToggleButton`, `ThemeInitializer`)
- Cores primária e secundária por empresa
- Estilos de card e sidebar customizáveis (`useThemeConfig`)
- Logo personalizado por empresa
- Sem referências a plataformas terceiras na interface do cliente

### Configurações de Pagamento
- Painel de pagamentos (`PaymentSettings`)

### Outros
- Celebração visual ao fechar negócio (`celebration.ts`)
- Transições de página (`PageTransition`)
- Skeletons de carregamento (Dashboard, Pipeline, Chat, ConversationList)
- Tags em leads, deal_value, observações
- Contexto de anúncios Meta Ads (`ad_context` com ad_id, título, mídia, ctwa_clid)

## 4. ORIGENS DE LEAD SUPORTADAS
- **WhatsApp** via Z-API (`whatsapp_api`)
- **Instagram** via OAuth Graph API (`instagram_api`)
- **LinkedIn** via Webhook (`linkedin_api`)
- **Webhook genérico** para formulários e landing pages (`webhook`)
- **Manual** (cadastro direto via interface) (`manual`)

## 5. FEATURE FLAGS POR EMPRESA
Controle granular em `companies.features`:
- `whatsapp_enabled` — Habilita integração WhatsApp
- `instagram_enabled` — Habilita integração Instagram
- `ai_sdr_enabled` — Habilita IA SDR
- `custom_pipeline` — Permite customizar pipeline
- `export_reports` — Permite exportar relatórios
- `automation_rules` — Habilita automações
- `max_users` — Limite de usuários
- `max_leads` — Limite de leads

## 6. REQUISITOS NÃO-FUNCIONAIS
- **Isolamento Multi-tenant:** RLS por `company_id` em todas as tabelas
- **Realtime:** Supabase Realtime para chat, notificações e presença (hub central `useRealtimeHub`)
- **Storage:** Bucket `chat-attachments` para mídias
- **Fuso horário padrão:** `America/Sao_Paulo`
- **Autenticação:** Supabase Auth (email/password) com recuperação de senha (`UpdatePassword`)
- **White-label:** Interface 100% customizável por empresa, sem branding de terceiros
- **Responsivo:** Suporte mobile (`use-mobile`)
- **Rotas protegidas:** `ProtectedRoute` com verificação de role e empresa

## 7. REGRAS DE DISTRIBUIÇÃO (ESTADO ATUAL)
```
Lead novo entra
  ├── Vendedores online? → Round Robin simples (sem regra de foco)
  ├── Ninguém online?
  │   ├── Auto-Reply habilitado + horário válido? → Envia mensagem automática
  │   └── Manager online? → Atribui ao manager
  │       └── Fallback configurado (admin OU manager)? → Atribui ao fallback
  │           └── Ninguém disponível? → Lead vai para fila (is_queued = true)
  └── Heartbeat a cada 2 min (distribute-queue) reprocessa fila

Trocas entre vendedores: APENAS MANUAIS pelo gestor comercial.
```
