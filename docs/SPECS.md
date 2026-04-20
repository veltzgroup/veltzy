# SPECS - Veltzy Technical Foundation

## 1. STACK TECNOLÓGICA

### Frontend
- **Framework:** React 18 + Vite 5 + TypeScript 5
- **Roteamento:** React Router DOM v6 com `ProtectedRoute`
- **UI:** Tailwind CSS v3 + shadcn/ui + Radix UI + Lucide Icons
- **State Management:** TanStack React Query v5
- **Drag & Drop:** dnd-kit (pipeline kanban)
- **Charts:** Recharts (dashboard analítico)
- **Animações:** framer-motion (`PageTransition`)
- **Notificações:** sonner (toasts)
- **Forms:** react-hook-form + zod

### Backend (Lovable Cloud / Supabase)
- **Auth:** Supabase Auth (email/password) + recuperação de senha
- **Database:** PostgreSQL com RLS multi-tenant
- **Realtime:** Supabase Realtime (chat, notificações, presença)
- **Storage:** Bucket `chat-attachments` para mídias
- **Edge Functions:** Deno runtime
- **IA Gateway:** Lovable AI Gateway (Gemini, GPT) + suporte a chaves próprias do cliente

## 2. SCHEMA DO BANCO (MULTI-TENANT)

Todas as tabelas de domínio possuem `company_id` para isolamento via RLS.

### Tabelas Principais

| Tabela | Descrição |
|---|---|
| `companies` | Tenant principal: `features` (JSONB), `settings`, `primary_color`, `secondary_color`, `logo_url`, `slug`, `is_active` |
| `profiles` | Vinculados a `auth.users` via `user_id`, com `company_id`, `is_available`, `last_seen_at` |
| `user_roles` | Roles separadas em tabela própria (super_admin, admin, manager, seller) — previne escalada de privilégios |
| `leads` | `ai_score`, `temperature` (cold/warm/hot/fire), `stage_id`, `source_id`, `assigned_to`, `tags[]`, `deal_value`, `observations`, `is_ai_active`, `is_queued`, `conversation_status`, `ad_context` (Meta Ads) |
| `messages` | Chat com `sender_type` (ai/human/lead), `message_type`, `file_url`, `file_mime_type`, `file_name`, `source`, `replied_message_id`, `is_scheduled`, `scheduled_at` |
| `pipeline_stages` | Fases dinâmicas por empresa: `position`, `color`, `is_final`, `is_positive`, `slug` |
| `lead_sources` | Origens customizáveis por empresa: `slug`, `icon_name`, `color`, `is_system`, `is_active` |
| `source_integrations` | Configuração técnica por origem: `integration_type`, `config` (JSONB) |
| `pipeline_sources` | Mapeamento N:N entre `pipeline_stages` e `lead_sources` |
| `automation_rules` | `trigger_type`, `conditions`, `action_type`, `action_data`, `priority`, `is_enabled` |
| `automation_logs` | Histórico de execução com `old_value` e `new_value` |
| `notifications` | Alertas persistentes por usuário: `type`, `action_type`, `action_data`, `is_read` |
| `reply_templates` | Templates de resposta rápida categorizados |
| `whatsapp_configs` | Instância Z-API por empresa: `instance_id`, `instance_token`, `client_token`, `qr_code`, `status` |
| `instagram_connections` | OAuth tokens: `access_token`, `page_id`, `instagram_account_id`, `token_expires_at` |
| `system_settings` | Configurações dinâmicas chave/valor por empresa (tema, SDR, business rules, **auto_reply_config**) |
| `support_tickets` | Tickets com `error_message`, `error_stack`, `page_url`, `user_agent`, `priority`, `status` |
| `activity_logs` | Auditoria: `action`, `resource_type`, `resource_id`, `user_id`, `metadata` |
| `company_invites` | Convites por email com `invite_code`, `expires_at`, `role`, `company_config` |

### Enums

- `app_role`: `admin | seller | manager | super_admin`
- `lead_source`: `whatsapp | instagram | linkedin | manual`
- `lead_status`: `new | qualifying | open | deal | lost`
- `lead_temperature`: `cold | warm | hot | fire`
- `conversation_status`: `unread | read | replied | waiting_client | waiting_internal | resolved`
- `integration_type`: `manual | webhook | whatsapp_api | instagram_api | linkedin_api`
- `sender_type`: `ai | human | lead`

### Funções RPC

- `has_role(_user_id, _role)` — verifica role específica
- `is_super_admin()` — checa role super_admin
- `is_company_admin()` — checa admin do tenant atual
- `is_admin_or_manager()` — checa admin ou manager
- `is_manager_or_admin(_user_id)` — variante com user_id
- `belongs_to_company(_company_id)` — valida pertencimento
- `get_current_company_id()` — retorna company_id do usuário logado
- `get_current_profile_id()` — retorna profile.id do usuário logado
- `can_create_company()` — valida criação de novo tenant
- `accept_invite(p_invite_code, p_user_id)` — aceita convite e vincula usuário
- `remove_user_from_company(p_target_user_id)` — desvincula usuário
- `get_seller_avg_response_times(_company_id, _start_date)` — métrica de tempo de resposta

## 3. EDGE FUNCTIONS

| Função | Responsabilidade |
|---|---|
| `zapi-webhook` | Recebe mensagens WhatsApp via Z-API + dispara distribuição + auto-reply + IA SDR |
| `zapi-send` | Envia mensagens via Z-API (texto, imagem, áudio, vídeo, documento) |
| `instagram-webhook` | Recebe mensagens Instagram via Graph API |
| `instagram-send` | Envia mensagens via Instagram Graph API |
| `instagram-oauth` | Fluxo OAuth para conectar conta Instagram Business |
| `linkedin-webhook` | Recebe dados de leads do LinkedIn |
| `source-webhook` | Webhook genérico para landing pages e formulários |
| `whatsapp-manager` | Gerenciamento de instâncias Z-API (criar/conectar/desconectar) |
| `sdr-ai` | Qualificação automática via IA (score + temperatura + resposta) |
| `run-automations` | Execução server-side de regras de automação |
| `distribute-queue` | Heartbeat (2 min) que reprocessa fila de leads não distribuídos |
| `send-scheduled-messages` | Envio programado de mensagens agendadas |
| `send-invite-email` | Disparo de email de convite para novos membros |
| `clerk-webhook` | (Legado) Webhook de migração do Clerk |

## 4. ROTAS DA APLICAÇÃO

| Rota | Componente | Acesso |
|---|---|---|
| `/` | `Index` | Público (redirect) |
| `/auth` | `Auth` | Público |
| `/update-password` | `UpdatePassword` | Autenticado |
| `/onboarding` | `Onboarding` | Autenticado sem empresa |
| `/dashboard` | `Dashboard` | Autenticado com empresa |
| `/pipeline` | `Pipeline` | Autenticado |
| `/inbox` | `Inbox` | Autenticado |
| `/deals` | `Deals` | Autenticado |
| `/sellers` | `Sellers` | Manager/Admin |
| `/company` | `Company` | Admin |
| `/settings` | `Settings` | Autenticado |
| `/admin` | `Admin` | Admin |
| `/super-admin` | `SuperAdmin` | Super Admin |

## 5. HOOKS PRINCIPAIS

- **Auth/Org:** `useAuth`, `use-organization`, `useCompany`, `useAdmin`, `useSuperAdmin`
- **Realtime Hub:** `useRealtimeHub` (canal central para chat, notificações, presença)
- **Leads:** `useLeads`, `useLeadSources`, `useActiveLeadSources`, `useLeadNotifications`
- **Pipeline:** `usePipelineStages`, `useSourcePipelineStages`
- **Mensagens:** `useMessages`, `useTypingIndicator`, `useInactiveMessageAlert`, `useReplyTemplates`
- **Conversação:** `useConversationStatus`
- **Vendedores:** `useSellers`, `useOnlineSellers`, `useSellerResponseTimes`
- **Notificações:** `useNotifications`, `useNotificationPreferences`
- **Integrações:** `useWhatsAppConfig`, `useInstagramConnection`, `useSourceIntegrations`
- **Automações:** `useAutomationRules`, `useBusinessRules`, `useGlobalSdrEnabled`
- **Suporte:** `useSupportTickets`, `useActivityLogs`
- **Convites:** `useCompanyInvites`
- **Tema:** `useThemeConfig`
- **Util:** `use-mobile`, `use-toast`

## 6. SEGURANÇA (RLS)

- RLS habilitado em **todas** as tabelas multi-tenant
- Padrão de policy: `company_id = get_current_company_id() OR is_super_admin()`
- Roles armazenadas em tabela própria (`user_roles`) — **nunca** em `profiles` (previne privilege escalation)
- Funções `SECURITY DEFINER` com `search_path = public` para evitar recursão em RLS
- Storage com policies por `company_id` no path

## 7. TRIGGERS AUTOMÁTICOS

| Trigger | Função |
|---|---|
| `handle_new_user` | Cria `profile` + role `seller` ao cadastrar via Supabase Auth |
| `assign_admin_role_on_first_company` | Promove primeiro usuário da empresa a `admin` |
| `create_default_pipeline_for_company` | Cria 6 fases padrão ao criar empresa |
| `create_default_lead_sources_for_company` | Cria origens padrão (WhatsApp, Instagram, Manual/Webhook) |
| `create_default_settings_for_company` | Cria tema, SDR config e business rules padrão |

## 8. FLUXO DE DISTRIBUIÇÃO DE LEADS

```
Lead novo (zapi-webhook / instagram-webhook / source-webhook)
  ├── Vendedores online? → Round Robin simples
  ├── Ninguém online?
  │   ├── Auto-Reply habilitado + horário/dia válido? → Envia mensagem automática
  │   └── Manager online? → Atribui ao manager
  │       └── Fallback configurado (admin OU manager)? → Atribui ao fallback
  │           └── Ninguém? → Lead vai para fila (is_queued = true)
  └── Heartbeat (distribute-queue, 2 min) reprocessa fila

IA SDR (se habilitada): processa qualificação ANTES da distribuição
Trocas entre vendedores: APENAS MANUAIS pelo gestor
```

## 9. STORAGE

- **Bucket:** `chat-attachments`
- **Estrutura:** `{company_id}/{lead_id}/{filename}`
- **Tipos suportados:** imagem, áudio, vídeo, documento (PDF, DOC, etc.)
- **Upload:** componente `ChatMediaUpload`

## 10. REALTIME (CANAIS)

Hub central via `useRealtimeHub`:
- `messages` — novas mensagens no chat
- `leads` — atualizações em leads (status, atribuição, stage)
- `notifications` — alertas para usuários
- `typing_{lead_id}` — indicador de digitação por conversa
- `presence` — status online dos vendedores

## 11. WHITE-LABEL

- Tema claro/escuro por usuário (`ThemeToggleButton`, `ThemeInitializer`)
- Cores primária/secundária por empresa (HSL via design tokens)
- Logo personalizado por empresa
- Estilos de card e sidebar customizáveis (`useThemeConfig`)
- Sem branding de plataforma terceira na interface do cliente

## 12. CONFIGURAÇÕES (`system_settings`)

Configurações chave/valor por empresa:
- `theme_config` — cores, logo, estilos visuais
- `sdr_config` — modelo IA, prompt, comportamento
- `business_rules` — regras de fallback e distribuição
- `auto_reply_config` — mensagem automática fora do horário
- `webhook_config` — webhooks de saída
- `payment_config` — configurações de pagamento

## 13. FEATURE FLAGS (`companies.features`)

| Flag | Descrição |
|---|---|
| `whatsapp_enabled` | Habilita integração WhatsApp |
| `instagram_enabled` | Habilita integração Instagram |
| `ai_sdr_enabled` | Habilita IA SDR |
| `custom_pipeline` | Permite customizar pipeline |
| `export_reports` | Permite exportar relatórios |
| `automation_rules` | Habilita módulo de automações |
| `max_users` | Limite de usuários da empresa |
| `max_leads` | Limite de leads da empresa |

## 14. SUPER ADMIN (Daxen Labs)

- Acesso global em `/super-admin`
- Impersonação de qualquer empresa via seletor
- Dashboard de tickets de suporte de todos os tenants (`SupportTicketsDashboard`)
- Gestão de convites globais (`SuperAdminInvitesDashboard`)
- Bypass automático de RLS via `is_super_admin()`

## 15. PADRÕES NÃO-FUNCIONAIS

- **Fuso horário:** `America/Sao_Paulo`
- **Idioma:** Português (Brasil)
- **Responsivo:** Suporte mobile via `use-mobile`
- **Skeletons de carregamento:** Dashboard, Pipeline, Chat, ConversationList
- **Transições:** `PageTransition` entre rotas
- **Celebração visual:** confetti ao fechar negócio (`celebration.ts`)
- **Reporte de erros:** `ErrorReportButton` em toda a interface
