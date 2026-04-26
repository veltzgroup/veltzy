# PRD - Veltzy: CRM Multi-tenant com IA SDR e Atendimento Multicanal

## 1. VISAO DO PRODUTO
Veltzy e um SaaS CRM multi-tenant white-label voltado para consultores e empresas que automatizam a captacao, qualificacao e distribuicao de leads via WhatsApp, Instagram, LinkedIn, Webhook e cadastro Manual. Combina IA SDR para qualificacao automatica, pipeline dinamico drag & drop, distribuicao hierarquica de leads e atendimento multicanal em tempo real.

## 2. PERSONAS E ACESSOS

### Super Admin (Daxen Labs) -- `/super-admin`
- Visao global de todas as empresas (tenants)
- Impersonacao de qualquer empresa via seletor administrativo
- Dashboard de tickets de suporte de todos os tenants
- Gestao de convites globais (`SuperAdminInvitesDashboard`)

### Org Admin
- Gerencia empresa, equipe, roles e convites
- Configura integracoes (WhatsApp/Z-API, Instagram OAuth, Webhooks, LinkedIn)
- Configura IA SDR (modelo, prompts, comportamento)
- Define regras de negocio, automacoes e Auto-Reply
- Gerencia tema white-label e configuracoes de pagamento

### Org Manager
- Supervisiona pipeline, equipe de vendedores e metricas
- Aprova trocas manuais de leads entre vendedores
- Acessa dashboards de metricas SDR e tempo de resposta
- Gerencia automacoes e regras de distribuicao

### Org Seller
- Atende leads atribuidos via Inbox multicanal
- Gerencia chat manual com texto, imagem, audio, video e documentos
- Marca disponibilidade (`is_available`) para entrar/sair do Round Robin
- Usa templates de resposta rapida e mensagens agendadas

## 3. FUNCIONALIDADES CORE

### IA SDR Automatizada (`sdr-ai`)
- Qualificacao automatica por score (0-100) e temperatura (cold/warm/hot/fire)
- Modelos suportados via chaves proprias do cliente (OpenAI/Gemini) chamadas pela Edge Function `sdr-ai`
- Configuracao granular por empresa em `SdrSettings`
- Dashboard de metricas SDR (`SdrMetricsDashboard`)
- Dicas de follow-up geradas pela IA (`AIFollowUpTips`)

### Pipeline Dinamico Drag & Drop
- Fases customizaveis por empresa (`pipeline_stages`)
- Posicionamento, cor, status final e flag de positivo/negativo por etapa
- Mapeamento N:N origem->pipeline via `pipeline_sources`
- Tabs por origem (`SourceTabs`) e cards de lead arrastaveis (`LeadCard`)
- Modais de criacao e edicao (`CreateLeadModal`, `EditLeadModal`)

### LeadCard com Temperatura Visual
- Barra de temperatura com gradiente linear frio-quente (azul -> ciano -> ambar -> laranja -> vermelho)
- Largura proporcional: cold=25%, warm=50%, hot=75%, fire=100%
- Efeito "pegando fogo" para leads fire (box-shadow animado com classe `.fire-card`)
- Icone de Bot (lucide) com tooltip "Atendido pela IA SDR" para leads com `is_ai_active=true`
- Icone de chat sempre visivel (text-muted-foreground, hover text-primary)

### Inbox Multicanal Realtime
- WhatsApp via Z-API (`zapi-webhook`, `zapi-send`)
- Instagram DM via OAuth + Webhooks (`instagram-oauth`, `instagram-webhook`, `instagram-send`)
- LinkedIn via Webhook (planejado)
- Suporte a texto, imagem, audio, video e documento
- Indicador de digitacao em tempo real (`useTypingIndicator`)
- Upload de midias (`ChatMediaUpload`)
- Card de contexto de anuncios Meta Ads (`AdContextCard`)
- Status de conversa: unread, read, replied, waiting_client, waiting_internal, resolved
- Mensagens com reply (resposta a mensagem especifica)

### Distribuicao Hierarquica de Leads
- Round Robin entre vendedores online (sem regra de foco)
- Fallback aceita admin **ou** manager configurado
- Se ninguem disponivel, lead vai para fila (`is_queued = true`)
- Heartbeat a cada 2 minutos reprocessa fila (`distribute-queue`)
- Trocas entre vendedores apenas manuais pelo gestor (sem reatribuicao automatica)

### Auto-Reply Fora do Horario
- Mensagem automatica configuravel por janela de horario (start/end)
- Selecao de dias da semana ativos
- Disparada apenas para leads novos quando ninguem esta online
- Nao interfere com IA SDR (que tem prioridade quando habilitada)
- Configuracao por empresa em `system_settings.auto_reply_config`

### Templates de Resposta Rapida
- Biblioteca de respostas categorizadas por empresa (`reply_templates`)
- Hook `useReplyTemplates` para insercao rapida no chat

### Automacoes de Fluxo
- Regras com `trigger_type`, `conditions` e `action_data` (`automation_rules`)
- Historico de execucao (`automation_logs`)
- Gestao visual via `AutomationRulesManager`
- Execucao server-side (`run-automations`)

### Central de Notificacoes
- Notificacoes persistentes por usuario (`notifications`)
- Realtime via Supabase Channels (`useRealtimeHub`, `useNotifications`)
- Tipos: novas mensagens, atribuicoes, transferencias
- Componente `NotificationCenter` + badge de novos leads (`NewLeadsBadge`)
- Preferencias de notificacao por usuario (`useNotificationPreferences`)

### Dashboard Analitico
- Metricas de conversao e receita
- Comparacao mensal (`MonthlyComparisonChart`)
- Visao geral do pipeline (`PipelineOverview`)
- Tempo medio de resposta por vendedor (`useSellerResponseTimes`)
- Filtro de periodo (`DashboardPeriodFilter`)
- Dicas de follow-up via IA (`AIFollowUpTips`)

### Pagina de Negocios (`/deals`)
- Filtros de periodo (Hoje, Semana, Mes, Total)
- KPIs: total de negocios, ticket medio, valor total (com breakdown por status)
- Tabela de leads com deal_value, fase, temperatura, origem, responsavel
- Icones de temperatura por nivel (Snowflake, Thermometer, Flame, Zap)

### Metas Comerciais (`/gestao?tab=metas`)
- Ciclos: mensal (selecao mes/ano), sprint ou periodo customizado (datas inicio/fim)
- Metricas por meta: revenue, deals_closed, leads_attended, conversion_rate, avg_response_time
- Escopo por metrica: equipe toda ou individual (vendedor especifico)
- Visibilidade configuravel para vendedores
- CRUD completo (goals + goal_metrics)

### Gestao Comercial (`/gestao`)
- 7 abas: Vendedores, Metas, Scripts, Auto-Reply, IA SDR, Relatorios, Logs Comerciais
- Acesso para admin e manager

### Relatorios e Exportacoes
- Relatorio de vendas exportavel (`generateSalesReport.ts`)
- Exportacao de leads (`ExportLeadsModal`, `exportLeads.ts`)
- Aba dedicada de relatorios (`ReportsTab`)
- Relatorio pessoal do vendedor (`PersonalReports`)

### Gestao de Origens de Lead
- Origens customizaveis por empresa (`lead_sources`)
- Integracoes tecnicas por origem (`source_integrations`)
- Tipos: manual, webhook, whatsapp_api, instagram_api, linkedin_api
- Paineis de configuracao: `WebhookConfigPanel`, `WhatsAppConfigPanel`, `ManualConfigPanel`
- Webhook generico para landing pages e formularios (`source-webhook`)
- Webhooks de saida configuraveis (`WebhooksSettings`)

### Gestao de Equipe
- Convites por email com codigo (`company_invites`)
- Painel de gestao (`TeamManagementPanel`, `InviteMemberModal`)
- Roles separadas em `user_roles` (super_admin, admin, manager, seller)
- Status de disponibilidade por vendedor (`useOnlineSellers`, `useSellers`)
- Remocao de usuarios da empresa via RPC

### Logs e Auditoria
- Historico de acoes (`activity_logs`, `useActivityLogs`)
- Dashboard administrativo (`ActivityLogsDashboard`)

### Sistema de Suporte
- Botao de reporte de erro em toda a interface (`ErrorReportButton`, `ErrorReportDialog`)
- Tickets com contexto tecnico (URL, user agent, stack trace)
- Dashboard de tickets para Super Admin (`SupportTicketsDashboard`)

### Onboarding e Empresa
- Fluxo de criacao de empresa (`Onboarding`)
- Pagina de gestao da empresa (`Company`)
- Primeiro usuario promovido automaticamente a admin
- Triggers automaticos criam pipeline padrao (6 fases), origens padrao (WhatsApp, Instagram, Manual/Webhook) e configuracoes iniciais

### Tema e White-label
- Modo claro/escuro/sand (`ThemeToggle`, `ThemeInitializer`)
- Cores primaria e secundaria por empresa
- Estilos de card e sidebar customizaveis (`useThemeConfig`)
- Logo personalizado por empresa
- Sem referencias a plataformas terceiras na interface do cliente

### Sidebar
- Header com logo Veltzy (icone "V" em bg-primary + texto "Veltzy" em text-primary) e nome do tenant abaixo em text-muted-foreground
- Navegacao: Dashboard, Pipeline, Inbox, Negocios, Gestao, Admin, Super Admin
- Secao de usuarios online (para admin/manager)
- Alternancia de tema e central de notificacoes
- Menu do usuario com link para Minha Conta e indicador de disponibilidade

### Configuracoes de Pagamento
- Painel de pagamentos (`PaymentSettings`)

### Outros
- Celebracao visual ao fechar negocio (`celebration.ts`)
- Transicoes de pagina (`PageTransition`)
- Skeletons de carregamento (Dashboard, Pipeline, Chat, ConversationList)
- Tags em leads, deal_value, observacoes
- Contexto de anuncios Meta Ads (`ad_context` com ad_id, titulo, midia, ctwa_clid)

## 4. ORIGENS DE LEAD SUPORTADAS
- **WhatsApp** via Z-API (`whatsapp_api`)
- **Instagram** via OAuth Graph API (`instagram_api`)
- **LinkedIn** via Webhook (`linkedin_api`) -- planejado
- **Webhook generico** para formularios e landing pages (`webhook`)
- **Manual** (cadastro direto via interface) (`manual`)

## 5. FEATURE FLAGS POR EMPRESA
Controle granular em `companies.features`:
- `whatsapp_enabled` -- Habilita integracao WhatsApp
- `instagram_enabled` -- Habilita integracao Instagram
- `ai_sdr_enabled` -- Habilita IA SDR
- `custom_pipeline` -- Permite customizar pipeline
- `export_reports` -- Permite exportar relatorios
- `automation_rules` -- Habilita automacoes
- `max_users` -- Limite de usuarios
- `max_leads` -- Limite de leads

## 6. REQUISITOS NAO-FUNCIONAIS
- **Isolamento Multi-tenant:** RLS por `company_id` em todas as tabelas
- **Realtime:** Supabase Realtime para chat, notificacoes e presenca (hub central `useRealtimeHub`)
- **Storage:** Bucket `chat-attachments` para midias
- **Fuso horario padrao:** `America/Sao_Paulo`
- **Autenticacao:** Supabase Auth (email/password) com recuperacao de senha (`UpdatePassword`)
- **White-label:** Interface 100% customizavel por empresa, sem branding de terceiros
- **Responsivo:** Suporte mobile (`use-mobile`)
- **Rotas protegidas:** `ProtectedRoute` com verificacao de role e empresa

## 7. REGRAS DE DISTRIBUICAO (ESTADO ATUAL)
```
Lead novo entra
  |-- Vendedores online? -> Round Robin simples (sem regra de foco)
  |-- Ninguem online?
  |   |-- Auto-Reply habilitado + horario valido? -> Envia mensagem automatica
  |   |-- Manager online? -> Atribui ao manager
  |       |-- Fallback configurado (admin OU manager)? -> Atribui ao fallback
  |           |-- Ninguem disponivel? -> Lead vai para fila (is_queued = true)
  |-- Heartbeat a cada 2 min (distribute-queue) reprocessa fila

Trocas entre vendedores: APENAS MANUAIS pelo gestor comercial.
```
