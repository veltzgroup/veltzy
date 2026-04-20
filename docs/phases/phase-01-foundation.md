# Phase 01 - Foundation: Auth, Multi-tenant e Onboarding

## OBJETIVO
Criar a fundação do Veltzy: autenticação, estrutura multi-tenant, onboarding de empresa e layout principal. Ao final desta fase, um usuário consegue se cadastrar, criar uma empresa, ver o dashboard vazio e navegar pela sidebar.

## PRÉ-REQUISITOS
- Projeto Supabase criado (novo, limpo)
- Variáveis de ambiente configuradas no `.env`
- Repositório Git inicializado
- Node.js + npm instalados

## ENTREGÁVEIS

### 1. Setup do Projeto
```bash
npm create vite@latest veltzy -- --template react-ts
cd veltzy
npm install
```

**Dependências a instalar:**
```bash
# Core
npm i @supabase/supabase-js @tanstack/react-query zustand react-router-dom

# UI
npm i tailwindcss@3 postcss autoprefixer
npm i @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-avatar @radix-ui/react-tooltip @radix-ui/react-separator @radix-ui/react-label @radix-ui/react-select @radix-ui/react-switch @radix-ui/react-tabs
npm i class-variance-authority clsx tailwind-merge lucide-react sonner
npm i react-hook-form @hookform/resolvers zod
npm i next-themes framer-motion

# Dev
npm i -D @types/node tailwindcss-animate
```

**NÃO instalar (removidos do Lovable):**
- lovable-tagger
- drizzle-kit
- canvas-confetti (adicionar depois, na fase de pipeline)
- dnd-kit (fase 2)
- recharts (fase 5)
- embla-carousel-react
- react-resizable-panels (fase 3)
- jspdf / jspdf-autotable (fase 5)

### 2. Configuração Base

**`vite.config.ts`** - Configurar alias `@/` para `src/`

**`tailwind.config.ts`** - Copiar tokens do DESIGN_SYSTEM.md (light, dark, sand)

**`src/styles/globals.css`** - Tokens CSS, classes utilitárias, scrollbars, animações base

**`src/lib/utils.ts`** - Helper `cn()` (clsx + tailwind-merge)

**`src/lib/supabase.ts`** - Cliente Supabase singleton

**`.env.example`:**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### 3. Migration SQL Consolidada

Criar `supabase/migrations/001_foundation.sql` com:

```sql
-- ===========================================
-- ENUMS
-- ===========================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'seller');
CREATE TYPE public.lead_status AS ENUM ('new', 'qualifying', 'open', 'deal', 'lost');
CREATE TYPE public.lead_temperature AS ENUM ('cold', 'warm', 'hot', 'fire');
CREATE TYPE public.sender_type AS ENUM ('ai', 'human', 'lead');
CREATE TYPE public.conversation_status AS ENUM ('unread', 'read', 'replied', 'waiting_client', 'waiting_internal', 'resolved');
CREATE TYPE public.integration_type AS ENUM ('manual', 'webhook', 'whatsapp_api', 'instagram_api', 'linkedin_api');

-- ===========================================
-- TABELAS CORE (FASE 1)
-- ===========================================

-- Empresas (tenants)
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color TEXT DEFAULT '158 64% 42%',
    secondary_color TEXT DEFAULT '240 5% 92%',
    features JSONB DEFAULT '{
        "whatsapp_enabled": false,
        "instagram_enabled": false,
        "ai_sdr_enabled": false,
        "custom_pipeline": false,
        "export_reports": false,
        "automation_rules": false,
        "max_users": 5,
        "max_leads": 500
    }'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfis de usuários
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roles (tabela separada para segurança)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'seller',
    UNIQUE (user_id, role)
);

-- Configurações dinâmicas por empresa
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    key TEXT NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, key)
);

-- Pipeline stages
CREATE TABLE public.pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT '#6B7280',
    is_final BOOLEAN NOT NULL DEFAULT false,
    is_positive BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Origens de lead
CREATE TABLE public.lead_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6B7280',
    icon_name TEXT NOT NULL DEFAULT 'User',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- FUNÇÕES AUXILIARES
-- ===========================================

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- É super admin?
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
$$;

-- Company ID do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_company_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Profile ID do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Pertence à empresa?
CREATE OR REPLACE FUNCTION public.belongs_to_company(_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() AND company_id = _company_id
    )
$$;

-- É admin da empresa?
CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
$$;

-- É admin ou manager?
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'super_admin')
    )
$$;

-- Pode criar empresa?
CREATE OR REPLACE FUNCTION public.can_create_company()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() AND company_id IS NOT NULL
    )
$$;

-- ===========================================
-- TRIGGERS DE ONBOARDING
-- ===========================================

-- Criar profile + role seller ao cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'seller');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Primeiro usuário da empresa vira admin
CREATE OR REPLACE FUNCTION public.assign_admin_role_on_first_company()
RETURNS TRIGGER AS $$
DECLARE
    _member_count INTEGER;
BEGIN
    IF NEW.company_id IS NOT NULL AND (OLD.company_id IS NULL OR OLD.company_id != NEW.company_id) THEN
        SELECT COUNT(*) INTO _member_count
        FROM public.profiles
        WHERE company_id = NEW.company_id AND id != NEW.id;

        IF _member_count = 0 THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.user_id, 'admin')
            ON CONFLICT (user_id, role) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_company_assigned
    AFTER UPDATE OF company_id ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.assign_admin_role_on_first_company();

-- Pipeline padrão ao criar empresa
CREATE OR REPLACE FUNCTION public.create_default_pipeline_for_company()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.pipeline_stages (company_id, name, slug, position, color, is_final, is_positive) VALUES
        (NEW.id, 'Novo Lead', 'novo-lead', 0, '#3B82F6', false, null),
        (NEW.id, 'Qualificando', 'qualificando', 1, '#F59E0B', false, null),
        (NEW.id, 'Em Negociação', 'em-negociacao', 2, '#8B5CF6', false, null),
        (NEW.id, 'Proposta Enviada', 'proposta-enviada', 3, '#06B6D4', false, null),
        (NEW.id, 'Fechado (Ganho)', 'fechado-ganho', 4, '#22C55E', true, true),
        (NEW.id, 'Perdido', 'perdido', 5, '#EF4444', true, false);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_company_created_pipeline
    AFTER INSERT ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.create_default_pipeline_for_company();

-- Origens padrão ao criar empresa
CREATE OR REPLACE FUNCTION public.create_default_lead_sources_for_company()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.lead_sources (company_id, name, slug, color, icon_name, is_system) VALUES
        (NEW.id, 'WhatsApp', 'whatsapp', '#25D366', 'MessageCircle', true),
        (NEW.id, 'Instagram', 'instagram', '#E4405F', 'Instagram', true),
        (NEW.id, 'Manual', 'manual', '#6B7280', 'UserPlus', true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_company_created_sources
    AFTER INSERT ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.create_default_lead_sources_for_company();

-- Settings padrão ao criar empresa
CREATE OR REPLACE FUNCTION public.create_default_settings_for_company()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.system_settings (company_id, key, value) VALUES
        (NEW.id, 'theme_config', '{"card_style": "glass", "sidebar_style": "expanded"}'::jsonb),
        (NEW.id, 'sdr_config', '{"enabled": false, "model": "gpt-4o-mini", "prompt": ""}'::jsonb),
        (NEW.id, 'business_rules', '{"fallback_role": "admin", "auto_reply_enabled": false}'::jsonb);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_company_created_settings
    AFTER INSERT ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.create_default_settings_for_company();

-- ===========================================
-- RLS POLICIES
-- ===========================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

-- Companies
CREATE POLICY "Members can view own company"
ON public.companies FOR SELECT TO authenticated
USING (id = get_current_company_id() OR is_super_admin());

CREATE POLICY "Authenticated can insert company"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (can_create_company());

CREATE POLICY "Admins can update own company"
ON public.companies FOR UPDATE TO authenticated
USING (id = get_current_company_id() AND is_company_admin() OR is_super_admin());

-- Profiles
CREATE POLICY "Members can view company profiles"
ON public.profiles FOR SELECT TO authenticated
USING (company_id = get_current_company_id() OR user_id = auth.uid() OR is_super_admin());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- User Roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_super_admin());

CREATE POLICY "Admins can view company roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = user_roles.user_id
        AND p.company_id = get_current_company_id()
    )
    AND is_company_admin()
);

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (is_company_admin() OR is_super_admin());

-- System Settings
CREATE POLICY "Members can view company settings"
ON public.system_settings FOR SELECT TO authenticated
USING (company_id = get_current_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage company settings"
ON public.system_settings FOR ALL TO authenticated
USING (company_id = get_current_company_id() AND is_company_admin() OR is_super_admin());

-- Pipeline Stages
CREATE POLICY "Members can view company stages"
ON public.pipeline_stages FOR SELECT TO authenticated
USING (company_id = get_current_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage company stages"
ON public.pipeline_stages FOR ALL TO authenticated
USING (company_id = get_current_company_id() AND is_company_admin() OR is_super_admin());

-- Lead Sources
CREATE POLICY "Members can view company sources"
ON public.lead_sources FOR SELECT TO authenticated
USING (company_id = get_current_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage company sources"
ON public.lead_sources FOR ALL TO authenticated
USING (company_id = get_current_company_id() AND is_company_admin() OR is_super_admin());

-- ===========================================
-- UPDATED_AT TRIGGERS
-- ===========================================
CREATE TRIGGER on_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER on_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER on_system_settings_updated BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER on_pipeline_stages_updated BEFORE UPDATE ON public.pipeline_stages FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER on_lead_sources_updated BEFORE UPDATE ON public.lead_sources FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

### 4. Types TypeScript

**`src/types/database.ts`** - Interfaces de domínio (copiar do projeto original, limpar):
- `AppRole`, `LeadStatus`, `LeadTemperature`, `SenderType`, `ConversationStatus`, `IntegrationType`
- `Company`, `CompanyFeatures`, `Profile`, `UserRole`, `SystemSetting`, `PipelineStage`, `LeadSourceRecord`

### 5. Services (camada de dados)

**`src/services/auth.service.ts`**
```typescript
// signUp(email, password, name)
// signIn(email, password)
// signOut()
// resetPassword(email)
// updatePassword(password)
// getSession()
// onAuthStateChange(callback)
```

**`src/services/company.service.ts`**
```typescript
// createCompany(name, slug)
// getCompany(companyId)
// updateCompany(companyId, data)
// getCurrentCompany()
```

**`src/services/profile.service.ts`**
```typescript
// getProfile(userId)
// getCurrentProfile()
// updateProfile(profileId, data)
// getCompanyMembers(companyId)
```

**`src/services/roles.service.ts`**
```typescript
// getUserRoles(userId)
// hasRole(userId, role)
// isAdmin()
// isSuperAdmin()
```

### 6. Hooks

**`src/hooks/use-auth.ts`** - Gerencia sessão, login, logout, estado de autenticação
**`src/hooks/use-company.ts`** - Dados da empresa atual via React Query
**`src/hooks/use-profile.ts`** - Perfil do usuário atual
**`src/hooks/use-roles.ts`** - Roles e permissões do usuário
**`src/hooks/use-theme-config.ts`** - Tema da empresa (cores, modo)

### 7. Stores (Zustand)

**`src/stores/auth.store.ts`**
```typescript
interface AuthState {
    user: User | null
    profile: Profile | null
    company: Company | null
    roles: AppRole[]
    isLoading: boolean
    setUser: (user: User | null) => void
    setProfile: (profile: Profile | null) => void
    setCompany: (company: Company | null) => void
    setRoles: (roles: AppRole[]) => void
    clear: () => void
}
```

### 8. Páginas e Componentes

**Páginas (finas, só composição):**

- `src/pages/auth.tsx` - Login/Register com tabs
- `src/pages/onboarding.tsx` - Formulário de criação de empresa
- `src/pages/dashboard.tsx` - Placeholder com boas-vindas
- `src/pages/not-found.tsx` - 404
- `src/pages/update-password.tsx` - Reset de senha

**Componentes de Layout:**

- `src/components/layout/main-layout.tsx` - Sidebar + Outlet
- `src/components/layout/app-sidebar.tsx` - Navegação lateral (Dashboard, Pipeline, Inbox, Deals, Sellers, Admin)
- `src/components/layout/theme-toggle.tsx` - Botão light/dark/sand
- `src/components/layout/theme-initializer.tsx` - Aplica tema da empresa ao carregar

**Componentes de Auth:**

- `src/components/auth/login-form.tsx` - Email + senha
- `src/components/auth/register-form.tsx` - Nome + email + senha
- `src/components/auth/protected-route.tsx` - Guard de rota com checks de role e company

**Componentes de Onboarding:**

- `src/components/onboarding/company-form.tsx` - Nome da empresa + slug

### 9. Routing

```tsx
// App.tsx
<Routes>
    {/* Público */}
    <Route path="/auth" element={<AuthPage />} />

    {/* Autenticado sem empresa */}
    <Route path="/onboarding" element={<ProtectedRoute skipCompanyCheck><Onboarding /></ProtectedRoute>} />
    <Route path="/update-password" element={<ProtectedRoute skipCompanyCheck><UpdatePasswordPage /></ProtectedRoute>} />

    {/* Autenticado com empresa - Layout persistente */}
    <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        {/* Demais rotas nas próximas fases */}
    </Route>

    <Route path="*" element={<NotFound />} />
</Routes>
```

## DESIGN DA FASE 1

### Tela de Auth
- Fundo dark com ambient glow (2 orbs radiais)
- Card central glass com tabs Login/Cadastro
- Logo Veltzy no topo
- Inputs com estilo `input-clean`
- Botão primary com glow no hover

### Tela de Onboarding
- Layout centralizado, passo único
- Input para nome da empresa
- Slug gerado automaticamente a partir do nome
- Botão "Criar Empresa" com loading state
- Ao criar, redireciona para `/`

### Dashboard (placeholder)
- Sidebar com navegação (itens futuros ficam disabled)
- Área central com mensagem de boas-vindas
- Nome da empresa + nome do usuário exibidos
- Theme toggle funcional
- Skeleton de preparação para a fase 2

## CRITÉRIOS DE CONCLUSÃO
- [ ] Usuário consegue se cadastrar (email/senha)
- [ ] Usuário consegue fazer login
- [ ] Usuário sem empresa é redirecionado para /onboarding
- [ ] Ao criar empresa, triggers criam pipeline, sources e settings padrão
- [ ] Primeiro usuário da empresa recebe role admin
- [ ] Dashboard exibe dados da empresa e do usuário
- [ ] Tema light/dark/sand funciona
- [ ] RLS impede acesso cross-tenant
- [ ] Build de produção funciona sem erros
- [ ] Código segue todas as convenções do CLAUDE.md
