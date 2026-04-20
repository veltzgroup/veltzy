# Phase 08 - Reorganização de Settings/Admin/Company + Features Faltantes

## OBJETIVO
Reorganizar os painéis de configuração em três áreas semanticamente distintas (`/settings` pessoal, `/admin` operacional, `/company` identidade), trazendo features importantes do projeto Lovable original que faltam no Veltzy atual sem duplicar funcionalidades. Ao final desta fase, o produto tem um sistema de configuração completo, bem organizado e sem gambiarras.

## PRÉ-REQUISITOS
- Fases 1 a 6 concluídas e funcionais
- Estrutura atual de /settings, /admin, /company existente

## FILOSOFIA DA REORGANIZAÇÃO

### Regra de ouro
- `/settings` = **eu** (o que cada usuário configura para si)
- `/admin` = **nós** (como a empresa opera)
- `/company` = **a marca** (como a empresa se apresenta)

### O que NÃO trazer (evitar gambiarra)
- NÃO criar "Regras de Negócio Críticas" como módulo separado — isso é feito via Automações
- NÃO criar controles globais de border-radius, font-size e animações — quebra o design system
- NÃO duplicar IA SDR em múltiplas abas (config + métricas + regras) — consolidar em uma

### O que trazer (features valiosas)
- Redefinir senha de vendedor via Supabase Auth
- Alterar função do usuário pelo painel
- Responsável Fallback configurável
- Pagamentos (Asaas, Stripe, Mercado Pago)
- Métricas visuais da IA SDR (distribuição por faixa de score)
- Templates/Scripts com categoria

---

## ESTRUTURA FINAL

```
/settings  (pessoal do usuário logado)
├── Perfil
├── Scripts (templates de resposta)
├── Notificações
└── Relatórios Pessoais

/admin  (operação da empresa - admin/manager)
├── Vendedores
├── Pipeline
├── Automações
├── IA SDR (config + métricas + prompt)
├── Integrações
│   ├── WhatsApp
│   ├── Instagram
│   ├── Webhooks
│   └── Pagamentos
├── Auto-Reply
├── Relatórios
└── Logs de Atividade

/company  (identidade da empresa - admin)
├── Dados da Empresa
└── Aparência
```

---

## MIGRATION SQL

Criar `supabase/migrations/008_settings_enhancements.sql`:

```sql
-- ===========================================
-- SCRIPTS / TEMPLATES (Fase 8 - trazendo do Lovable)
-- ===========================================

-- reply_templates já existe desde a Fase 3, adicionar campo de categoria se não tiver
ALTER TABLE public.reply_templates
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ===========================================
-- PAYMENT CONFIGS
-- ===========================================

CREATE TABLE public.payment_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('asaas', 'stripe', 'mercadopago')),
    api_key TEXT NOT NULL,
    api_secret TEXT,
    webhook_secret TEXT,
    environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('sandbox', 'production')),
    is_active BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, provider)
);

ALTER TABLE public.payment_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view company payment configs"
ON public.payment_configs FOR SELECT TO authenticated
USING (company_id = get_current_company_id() AND is_company_admin() OR is_super_admin());

CREATE POLICY "Admins can manage company payment configs"
ON public.payment_configs FOR ALL TO authenticated
USING (company_id = get_current_company_id() AND is_company_admin() OR is_super_admin());

CREATE TRIGGER on_payment_configs_updated
    BEFORE UPDATE ON public.payment_configs
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ===========================================
-- NOTIFICATION PREFERENCES (persistência)
-- ===========================================

-- Já usamos system_settings para isso, apenas garantir convenção
-- Key pattern: 'notification_prefs_{user_id}'
-- Value: { new_lead: true, new_message: true, lead_transferred: true, system_alerts: false }

-- ===========================================
-- FALLBACK LEAD OWNER (trazendo do Lovable)
-- ===========================================

-- Já persistido em system_settings com key 'business_rules' desde a Fase 4
-- Adicionar campo 'fallback_lead_owner' no JSONB

-- ===========================================
-- AUDIT TRIGGER para ativar/desativar vendedor
-- ===========================================

CREATE OR REPLACE FUNCTION public.log_availability_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_available IS DISTINCT FROM NEW.is_available THEN
        INSERT INTO public.activity_logs (company_id, user_id, action, resource_type, resource_id, metadata)
        VALUES (
            NEW.company_id,
            auth.uid(),
            CASE WHEN NEW.is_available THEN 'seller_available' ELSE 'seller_unavailable' END,
            'profile',
            NEW.id,
            jsonb_build_object('is_available', NEW.is_available)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_availability_changed
    AFTER UPDATE OF is_available ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_availability_change();
```

---

## PARTE 1 — /settings (Pessoal)

### Estrutura de abas
```
/settings
├── Perfil
├── Scripts
├── Notificações
└── Relatórios Pessoais
```

### 1.1 Aba "Perfil"
**`src/components/settings/profile-settings.tsx`** (já existe, expandir)

Campos:
- Avatar (upload para Storage `company-assets/avatars/{user_id}`)
- Nome (editável)
- Email (read-only com aviso "não pode ser alterado")
- Badge da função atual (Admin / Manager / Vendedor / Super Admin) com cor correspondente
- Botão "Alterar senha" → envia email via `supabase.auth.resetPasswordForEmail()`
- Botão "Salvar Perfil" com loading state

### 1.2 Aba "Scripts" (NOVA)
**`src/components/settings/scripts-manager.tsx`**

Gerencia templates de resposta rápida pessoais e da empresa.

Layout:
- Header: título + botão "+ Novo Template"
- Formulário inline (colapsável) ao clicar em "+ Novo":
  - Título (input)
  - Categoria (input com `<datalist>` contendo categorias já usadas)
  - Conteúdo (textarea)
  - Botões Cancelar / Salvar
- Tabela de templates:
  - Título | Categoria (badge) | Preview do conteúdo (truncado 60 chars) | Criado por | Ações
  - Ação: Editar (inline) e Excluir (confirmação)
- Busca por título/conteúdo no topo
- Filtro por categoria (dropdown)

Integração:
- Esses templates aparecem no `ReplyTemplatesPopover` dentro do chat (já implementado na Fase 3)
- Query: `useReplyTemplates()` já existe

### 1.3 Aba "Notificações" (NOVA)
**`src/components/settings/notification-preferences.tsx`**

Toggles por tipo de notificação:
- Novo lead atribuído a mim (push + email)
- Nova mensagem não lida (push)
- Lead transferido para mim (push + email)
- Alertas do sistema (email)
- Som de notificação ao receber mensagem (toggle)

Persiste em `system_settings` com key `notification_prefs_{user_id}`.

### 1.4 Aba "Relatórios Pessoais" (NOVA)
**`src/components/settings/personal-reports.tsx`**

Para vendedores: seus próprios dados
Para admin/manager: aparece mas avisa "Para relatórios da empresa, acesse /admin > Relatórios"

Conteúdo:
- Seus leads atribuídos (contagem)
- Seus deals fechados (período selecionável)
- Sua taxa de conversão
- Seu tempo médio de resposta
- Botão "Exportar meu relatório" (PDF com dados pessoais do período)

---

## PARTE 2 — /admin (Operação)

### Estrutura de abas
```
/admin
├── Vendedores
├── Pipeline
├── Automações
├── IA SDR
├── Integrações
├── Auto-Reply
├── Relatórios
└── Logs
```

**Importante**: a página `/sellers` atual é MOVIDA para ser a primeira aba do `/admin` como "Vendedores". A rota `/sellers` redireciona para `/admin?tab=sellers`.

### 2.1 Aba "Vendedores" (EXPANDIR existente)
Já temos listagem de membros e convites. **Adicionar**:

**Card "Gerenciamento de Equipe"** — Tabela com colunas:
- Avatar + Nome + Email
- Função (badge colorido)
- Disponível (switch para `is_available` — controla Round Robin)
- Alterar Função (Select com Vendedor/Manager/Admin) — visível só para admin
- Ações (dropdown):
  - Redefinir Senha → envia email via Supabase Auth
  - Remover da Empresa → confirmação + aviso "leads atribuídos ficarão sem responsável"
  - (não aparece para si mesmo nem para outros admins quando você não é super admin)

**Card "Responsável Fallback"**:
- Select listando admins e managers
- "Nenhum (desativado)" como primeira opção
- Ajuda: "Quando nenhum vendedor está online, novos leads são atribuídos a essa pessoa"
- Salva em `system_settings.business_rules.fallback_lead_owner`

**Modal "Convidar Membro"** (já existe, manter)

### 2.2 Aba "Pipeline"
Duas seções empilhadas verticalmente:

**Seção "Etapas do Funil"**
- `PipelineStageManager` (já existe, mover da posição atual para aqui)
- CRUD com drag-and-drop para reordenar
- Campos: nome, cor, slug, is_final, is_positive
- Deletar desabilitado se tiver leads na etapa

**Seção "Origens de Lead"**
- `LeadSourcesManager` (já existe na Fase 6, mover para aqui)
- CRUD de origens com configuração de integrações por origem

### 2.3 Aba "Automações"
Mantém exatamente como está na Fase 4:
- `AutomationRulesManager` com lista, criação, edição, toggle
- `AutomationLogsDrawer` para histórico

### 2.4 Aba "IA SDR" (CONSOLIDAR)
Uma única aba com 3 sub-seções via tabs internas ou cards empilhados:

**Sub-seção "Configuração"** (já existe em /settings, MOVER para cá)
- Toggle global SDR
- Seleção de modelo (GPT-4o-mini / GPT-4o / Gemini Flash / Gemini Pro)
- Campo API Key (criptografado)
- Textarea de prompt customizado
- Critérios de qualificação (BANT/SPIN) via templates
- Toggle "Handover automático quando score > 80"
- Botão "Testar SDR" (envia mensagem de teste)

**Sub-seção "Métricas"** (NOVA)
**`src/components/admin/sdr-metrics-dashboard.tsx`**

KPIs no topo:
- Leads qualificados pela IA no período
- Score médio
- Taxa de qualificação automática (leads qualificados / total)
- Tempo médio de primeira resposta da IA

Gráfico principal: **Distribuição por faixa de score**
- Gráfico de barras (Recharts)
- 5 faixas com cores graduais:
  - 0-20 (vermelho escuro): "Muito frio"
  - 21-40 (vermelho): "Frio"
  - 41-60 (amarelo): "Morno"
  - 61-80 (verde claro): "Quente"
  - 81-100 (verde primary): "Pegando fogo"
- Eixo Y: quantidade de leads
- Tooltip customizado mostrando faixa + count + %

**Sub-seção "Prompt Preview"** (NOVA)
- Exibe o prompt final montado (system + context + user) que é enviado à IA
- Read-only, útil para debug

### 2.5 Aba "Integrações" (CONSOLIDAR)
Sub-abas horizontais internas:

**2.5.1 WhatsApp** (já existe em /settings, MOVER para cá)
- Instance ID, Token, Client Token
- Status de conexão
- QR code
- Webhook URL para copiar

**2.5.2 Instagram** (já existe na Fase 6, MOVER para cá)
- OAuth Business
- Contas conectadas
- Botão conectar/desconectar

**2.5.3 Webhooks** (já existe na Fase 6, MOVER para cá)
- Webhooks de saída
- Lista + criação
- URL do source-webhook para integrações externas

**2.5.4 Pagamentos** (NOVA)
**`src/components/admin/payment-integrations.tsx`**

Cards para cada provedor (Asaas, Stripe, Mercado Pago):
- Logo do provedor
- Status (Ativo / Inativo)
- Ambiente (Sandbox / Produção) via Select
- Campos:
  - API Key
  - API Secret (se aplicável)
  - Webhook Secret
- Botão "Testar conexão"
- Toggle ativo/inativo
- Salva em `payment_configs`

Asaas aparece com badge "Recomendado" (mais popular no Brasil).

Aviso importante: "Esta configuração ainda não está conectada ao fluxo de checkout. Será usada quando o módulo de cobranças for habilitado."

### 2.6 Aba "Auto-Reply"
Mantém como está na Fase 4, apenas mover de /settings para cá:
- Toggle ativar/desativar
- Mensagem personalizada
- Horário comercial (start/end/dias)
- Fuso horário (America/Sao_Paulo)

### 2.7 Aba "Relatórios"
Mantém como está na Fase 5:
- Filtros de período, origem, vendedor, stage
- Export CSV e PDF
- Dados de todos os leads da empresa

### 2.8 Aba "Logs"
**`src/components/admin/activity-logs-dashboard.tsx`** (já existe na Fase 6)

Visualização da tabela `activity_logs`:
- Histórico de ações: criação de leads, mudanças de stage, login/logout, transferências, edições, disponibilidade
- Filtros: usuário, tipo de ação, resource_type, período
- Paginação (20 por página)
- Export CSV dos logs filtrados

---

## PARTE 3 — /company (Identidade)

### Estrutura de abas
```
/company
├── Dados da Empresa
└── Aparência
```

### 3.1 Aba "Dados da Empresa"
Mantém como está:
- Nome
- Slug (com validação de unicidade)
- Logo upload

### 3.2 Aba "Aparência" (SIMPLIFICAR)
**`src/components/company/theme-customizer.tsx`** (já existe, mas simplificar)

**Manter apenas o essencial:**
- **Modo do Tema**: 3 botões grandes com preview: Claro / Escuro / Areia
- **Cor Primária**:
  - Color picker nativo
  - Input hex (#RRGGBB)
  - Preview em quadrado 16x16
  - 6 swatches predefinidos (verde Veltzy default, azul, roxo, laranja, rosa, vermelho)
- **Estilo dos Cards**: Plano / Elevado / Glass (radio group)
- **Estilo da Sidebar**: Sólido / Glass (radio group)

**Preview ao vivo** (aplica em tempo real enquanto muda):
- Mini preview com sidebar + card de lead + botão + badge
- CSS vars aplicadas no container do preview via inline style

**NÃO trazer do Lovable:**
- Border radius global (quebra design system)
- Font size global (quebra design system)
- Toggle de animações (desnecessário)
- "Cor de destaque secundária" configurável (complica sem agregar)

Botões:
- Restaurar Padrão (reseta para verde Veltzy default)
- Salvar Tema

Persiste em `system_settings.theme_config`.

---

## PARTE 4 — SERVICES NOVOS

### 4.1 `src/services/team.service.ts` (EXPANDIR)
```typescript
// Novas funções:
// resetMemberPassword(email) → void
//   → chama supabase.auth.resetPasswordForEmail
// setFallbackLeadOwner(companyId, profileId | null) → void
//   → atualiza system_settings.business_rules.fallback_lead_owner
// getFallbackLeadOwner(companyId) → Profile | null
```

### 4.2 `src/services/reply-templates.service.ts` (já existe)
Apenas adicionar:
```typescript
// getCategories(companyId) → string[]
//   → distinct de categorias existentes para autocomplete
```

### 4.3 `src/services/payments.service.ts` (NOVO)
```typescript
// getPaymentConfigs(companyId) → PaymentConfig[]
// savePaymentConfig(companyId, provider, data) → PaymentConfig
// togglePaymentConfig(id, active) → void
// testPaymentConnection(id) → { success: boolean; message: string }
//   → chama API do provider para validar credenciais
// deletePaymentConfig(id) → void
```

### 4.4 `src/services/sdr-metrics.service.ts` (NOVO)
```typescript
// getScoreDistribution(companyId, period) → { range: string; count: number }[]
//   → agrega leads por faixa de ai_score
// getSdrKpis(companyId, period) → {
//     qualified_count: number
//     avg_score: number
//     qualification_rate: number
//     avg_first_response_minutes: number
//   }
```

### 4.5 `src/services/notifications.service.ts` (EXPANDIR)
```typescript
// getPreferences(userId) → NotificationPreferences
// savePreferences(userId, prefs) → void
```

### 4.6 `src/services/personal-reports.service.ts` (NOVO)
```typescript
// getPersonalReport(userId, period) → {
//     assigned_leads: number
//     deals_closed: number
//     conversion_rate: number
//     avg_response_time: number
//     revenue: number
//   }
// exportPersonalReport(userId, period) → Blob (PDF)
```

---

## PARTE 5 — HOOKS NOVOS

### 5.1 `src/hooks/use-fallback-owner.ts`
```typescript
// useFallbackOwner() → { profile: Profile | null; setFallback: mutation }
```

### 5.2 `src/hooks/use-payment-configs.ts`
```typescript
// usePaymentConfigs() → PaymentConfig[]
// useSavePaymentConfig() → mutation
// useTogglePaymentConfig() → mutation
// useTestPaymentConnection() → mutation
```

### 5.3 `src/hooks/use-sdr-metrics.ts`
```typescript
// useSdrMetrics(period) → { kpis, distribution, isLoading }
```

### 5.4 `src/hooks/use-notification-preferences.ts`
```typescript
// useNotificationPreferences() → { prefs, savePrefs }
```

### 5.5 `src/hooks/use-personal-report.ts`
```typescript
// usePersonalReport(period) → ReportData
```

---

## PARTE 6 — NAVEGAÇÃO

### Atualizar `src/components/layout/app-sidebar.tsx`

Remover item "Vendedores" da sidebar (agora é aba de /admin).

Ordem final da sidebar:
1. Dashboard
2. Pipeline
3. Inbox
4. Deals
5. Admin (admin/manager/super_admin)
6. Company (admin/super_admin)
7. Settings (todos)
8. Super Admin (super_admin)

### Redirecionar rotas antigas
Em `App.tsx`:
```tsx
<Route path="/sellers" element={<Navigate to="/admin?tab=sellers" replace />} />
```

### Query param para aba ativa
As páginas `/admin`, `/settings` e `/company` leem `?tab=xxx` da URL para abrir a aba correta.
Usar `useSearchParams` do react-router-dom.

---

## PARTE 7 — PROTECTED ROUTE AJUSTES

Adicionar em `src/components/auth/protected-route.tsx`:
- Prop `requireAdmin` (só admin e super_admin)
- Prop `requireManager` (admin, manager, super_admin — equivale ao `is_admin_or_manager`)

Aplicar:
- `/admin` → `requireManager`
- `/company` → `requireAdmin`
- `/super-admin` → `requireSuperAdmin`
- `/settings` → apenas autenticado

Vendedor tentando acessar `/admin` é redirecionado para `/settings`.

---

## PARTE 8 — DESIGN

### Abas horizontais
- Usar componente `Tabs` do shadcn
- TabsList com border-bottom sutil, `border-border/30`
- TabsTrigger ativo: `border-b-2 border-primary text-foreground`
- TabsTrigger inativo: `text-muted-foreground hover:text-foreground`

### Cards de configuração
- Usar `glass-card` do design system
- Header: título em `text-lg font-semibold` + descrição em `text-sm text-muted-foreground`
- Divisor entre header e conteúdo: `border-b border-border/30 my-4`

### Color picker (Aparência)
- Input nativo `<input type="color">` estilizado
- Swatches em grid 6 colunas, cada um `w-10 h-10 rounded-lg ring-2 ring-transparent` (ring aparece no selecionado)

### Tabelas
- Header: `bg-muted/30 text-muted-foreground text-xs uppercase`
- Rows: hover `bg-muted/20`
- Ações: `DropdownMenu` com ícone `MoreVertical`

---

## PARTE 9 — MIGRAÇÃO DE DADOS

Ao rodar a migration, executar script de migração para:
1. Mover `sdr_config` de onde estiver para `system_settings.sdr_config` se necessário
2. Mover `whatsapp_config` — já está em `whatsapp_configs` (ok)
3. Mover `business_rules` incluindo o novo campo `fallback_lead_owner` em `system_settings.business_rules`

Script idempotente:
```sql
-- Garantir que todas as empresas têm system_settings base
INSERT INTO system_settings (company_id, key, value)
SELECT c.id, 'business_rules', '{}'::jsonb
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM system_settings ss
    WHERE ss.company_id = c.id AND ss.key = 'business_rules'
)
ON CONFLICT DO NOTHING;

-- Garantir que business_rules tem a chave fallback_lead_owner
UPDATE system_settings
SET value = value || '{"fallback_lead_owner": null}'::jsonb
WHERE key = 'business_rules'
AND NOT (value ? 'fallback_lead_owner');
```

---

## CRITÉRIOS DE CONCLUSÃO

### /settings
- [ ] Aba Perfil com upload de avatar, edição de nome, badge de role, reset de senha
- [ ] Aba Scripts funcional com CRUD de templates + categorias com autocomplete
- [ ] Aba Notificações salva preferências em system_settings
- [ ] Aba Relatórios Pessoais exibe dados do usuário logado

### /admin
- [ ] Aba Vendedores com tabela completa, alterar função, reset senha, remover membro
- [ ] Responsável Fallback configurável e salvando
- [ ] Aba Pipeline com Stages + Sources
- [ ] Aba Automações mantida da Fase 4
- [ ] Aba IA SDR consolidada com Config + Métricas + Prompt Preview
- [ ] Gráfico de distribuição por faixa de score funcional
- [ ] Aba Integrações com sub-abas WhatsApp, Instagram, Webhooks, Pagamentos
- [ ] Pagamentos com 3 providers (Asaas, Stripe, Mercado Pago)
- [ ] Aba Auto-Reply movida de /settings
- [ ] Aba Relatórios mantida da Fase 5
- [ ] Aba Logs com filtros e paginação

### /company
- [ ] Aba Dados da Empresa com nome, slug, logo
- [ ] Aba Aparência simplificada (modo + cor primária + estilos de card/sidebar)
- [ ] Preview ao vivo do tema

### Geral
- [ ] Sidebar atualizada (Vendedores removido, é aba de /admin)
- [ ] Redirect /sellers → /admin?tab=sellers
- [ ] Query param ?tab= funciona em /admin, /settings, /company
- [ ] Proteção de rota por role funcional
- [ ] Build sem erros de TypeScript
- [ ] Nenhuma feature do Lovable trazida como gambiarra
