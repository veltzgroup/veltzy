---
name: auth-ecosystem
description: >
  Padrão de autenticação, autorização e controle de acesso para todos os produtos SaaS
  multi-tenant do ecossistema Veltz Group (Veltzy, Leadbaze, PowerV, Hub). Use esta skill
  SEMPRE que o trabalho envolver: criação ou modificação de fluxos de login, cadastro,
  convite de membros, controle de roles e permissions, proteção de rotas, RLS no Supabase,
  fluxo de onboarding pós-checkout, multi-empresa, auditoria de acesso, ou qualquer lógica
  relacionada a quem pode fazer o quê em qual produto. Também usar ao criar novos produtos
  do ecossistema para garantir que a arquitetura de auth seja consistente desde o início.
---

# Auth Ecosystem — Padrão de Autenticação Veltz Group

Padrão obrigatório de autenticação e autorização para todos os produtos do ecossistema
Veltz Group. Construído para um SaaS multi-tenant com múltiplos produtos, múltiplas
empresas clientes, e usuários que podem pertencer a mais de uma empresa.

---

## 0. Princípios Fundamentais

1. **Um único Supabase Central** para todos os produtos. Mesmo JWT, mesma sessão.
2. **Cada produto tem sua própria página de login.** Sem login centralizado no Hub.
3. **SSO passivo:** se o JWT já existe, o usuário entra direto sem tela de login.
4. **Empresa nunca é perguntada no convite.** O sistema já sabe qual é.
5. **Manager é o árbitro de conflitos comerciais.** Admin cuida da empresa, não do processo.
6. **Representative nunca toma lead diretamente.** Sempre via solicitação ao manager.
7. **Checkout é o gatilho de criação de empresa.** Sem pagamento, sem empresa.
8. **Auditoria desde o início.** Todo evento de acesso é registrado.

---

## 1. Hierarquia de Roles

### `super_admin`
- Existe apenas no Hub (`hub.veltz.group`)
- Gerencia todas as empresas, infra de IA, integrações, billing
- Não tem `company_id` — é supra-empresa
- Não acessa os produtos dos clientes como usuário normal
- É o dono do ecossistema (Toni)

### `admin`
- Dono ou sócio da empresa cliente
- Existe nos produtos (Veltzy, Leadbaze)
- Gerencia tudo dentro da empresa: configura produto, assinatura, convida qualquer role
- Não acessa o Hub
- Pode acumular `admin` + `manager` em empresas pequenas

### `manager` (gestor comercial)
- Lidera o time de vendas da empresa
- Foco exclusivo no processo comercial
- Pode convidar `seller` e `representative`
- Não configura produto, não gerencia assinatura, não cria admins
- É o árbitro de conflitos de leads e transferências

### `seller`
- Vendedor interno
- Recebe leads via tráfego pela fila de distribuição (round robin)
- Atende pelo inbox
- Vê apenas os próprios leads e tarefas
- Não cadastra leads em massa

### `representative`
- Representante comercial freelancer
- Pode pertencer a múltiplas empresas simultaneamente
- Sempre vê o seletor de empresa no login
- Cadastra leads apenas manualmente, um por um
- Não recebe leads de tráfego
- Segue regras específicas de conflito (ver seção 6)

### Regra multi-role
Um usuário pode ter múltiplas roles na mesma empresa.
Exemplo: dono de empresa pequena tem `admin` + `manager`.
A checagem de permissão usa `OR` entre as roles do usuário.

---

## 2. Schema do Banco de Dados

### Tabela `public.companies`
```sql
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  is_active boolean not null default true,
  features jsonb not null default '{}',
  -- Exemplos de features:
  -- {"ai_sdr_enabled": true, "inbox_enabled": true, "google_calendar_enabled": false}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Tabela `public.profiles`
```sql
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- NUNCA armazenar company_id aqui.
-- Um usuário pode ter múltiplas empresas via user_roles.
```

### Tabela `public.user_roles`
```sql
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  -- NULL para super_admin
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, company_id, role)
);

-- Enum de roles
create type app_role as enum (
  'super_admin',
  'admin',
  'manager',
  'seller',
  'representative'
);
```

### Tabela `public.permissions`
```sql
create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  -- Formato: recurso.acao (ex: leads.view_all, members.invite_seller)
  description text,
  product text check (product in ('veltzy', 'leadbaze', 'powerv', 'hub', 'all'))
);

-- Seed de permissions
insert into public.permissions (key, description, product) values
  -- Hub
  ('hub.access',                    'Acessar o Hub',                          'hub'),
  -- Empresa
  ('company.configure',             'Configurar produto e integrações',       'all'),
  ('company.billing',               'Gerenciar assinatura e plano',           'all'),
  -- Membros
  ('members.invite_admin',          'Convidar admins',                        'all'),
  ('members.invite_manager',        'Convidar managers',                      'all'),
  ('members.invite_seller',         'Convidar sellers',                       'all'),
  ('members.invite_representative', 'Convidar representatives',               'all'),
  ('members.remove',                'Remover membros',                        'all'),
  -- Leads
  ('leads.view_all',                'Ver todos os leads da empresa',          'veltzy'),
  ('leads.view_own',                'Ver apenas os próprios leads',           'veltzy'),
  ('leads.receive_traffic',         'Receber leads de tráfego',               'veltzy'),
  ('leads.create_manual',           'Cadastrar lead manualmente',             'veltzy'),
  ('leads.delete',                  'Deletar leads',                          'veltzy'),
  ('leads.transfer_resolve',        'Resolver conflitos e transferências',    'veltzy'),
  ('leads.transfer_request',        'Solicitar transferência de lead',        'veltzy'),
  -- Relatórios
  ('reports.full',                  'Ver relatórios completos da empresa',    'all'),
  ('reports.own',                   'Ver apenas os próprios relatórios',      'all'),
  -- Pipeline
  ('pipeline.configure',            'Configurar fases do pipeline',           'veltzy'),
  -- IA
  ('ai.configure',                  'Configurar IA do produto',               'all'),
  -- Integrações
  ('integrations.configure',        'Configurar integrações',                 'all');
```

### Tabela `public.role_permissions`
```sql
create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role app_role not null,
  permission_key text not null references public.permissions(key),
  unique (role, permission_key)
);

-- Seed de role_permissions
insert into public.role_permissions (role, permission_key) values
  -- super_admin: tudo
  ('super_admin', 'hub.access'),
  ('super_admin', 'company.configure'),
  ('super_admin', 'company.billing'),
  ('super_admin', 'members.invite_admin'),
  ('super_admin', 'members.invite_manager'),
  ('super_admin', 'members.invite_seller'),
  ('super_admin', 'members.invite_representative'),
  ('super_admin', 'members.remove'),
  ('super_admin', 'leads.view_all'),
  ('super_admin', 'leads.view_own'),
  ('super_admin', 'leads.receive_traffic'),
  ('super_admin', 'leads.create_manual'),
  ('super_admin', 'leads.delete'),
  ('super_admin', 'leads.transfer_resolve'),
  ('super_admin', 'leads.transfer_request'),
  ('super_admin', 'reports.full'),
  ('super_admin', 'reports.own'),
  ('super_admin', 'pipeline.configure'),
  ('super_admin', 'ai.configure'),
  ('super_admin', 'integrations.configure'),
  -- admin: tudo exceto hub
  ('admin', 'company.configure'),
  ('admin', 'company.billing'),
  ('admin', 'members.invite_admin'),
  ('admin', 'members.invite_manager'),
  ('admin', 'members.invite_seller'),
  ('admin', 'members.invite_representative'),
  ('admin', 'members.remove'),
  ('admin', 'leads.view_all'),
  ('admin', 'leads.view_own'),
  ('admin', 'leads.receive_traffic'),
  ('admin', 'leads.create_manual'),
  ('admin', 'leads.delete'),
  ('admin', 'leads.transfer_resolve'),
  ('admin', 'leads.transfer_request'),
  ('admin', 'reports.full'),
  ('admin', 'reports.own'),
  ('admin', 'pipeline.configure'),
  ('admin', 'ai.configure'),
  ('admin', 'integrations.configure'),
  -- manager: processo comercial
  ('manager', 'members.invite_seller'),
  ('manager', 'members.invite_representative'),
  ('manager', 'leads.view_all'),
  ('manager', 'leads.view_own'),
  ('manager', 'leads.receive_traffic'),
  ('manager', 'leads.create_manual'),
  ('manager', 'leads.transfer_resolve'),
  ('manager', 'leads.transfer_request'),
  ('manager', 'reports.full'),
  ('manager', 'reports.own'),
  -- seller: atendimento
  ('seller', 'leads.view_own'),
  ('seller', 'leads.receive_traffic'),
  ('seller', 'leads.create_manual'),
  ('seller', 'reports.own'),
  -- representative: manual, multi-empresa
  ('representative', 'leads.view_own'),
  ('representative', 'leads.create_manual'),
  ('representative', 'leads.transfer_request'),
  ('representative', 'reports.own');
```

### Tabela `public.invitations`
```sql
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invited_by uuid not null references auth.users(id),
  email text not null,
  role app_role not null,
  token uuid not null unique default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'expired', 'revoked')),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invitations enable row level security;
create policy "tenant_isolation" on public.invitations
  for all using (company_id = get_current_company_id() OR is_super_admin());
```

### Tabela `public.lead_transfer_requests`
```sql
create table public.lead_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lead_id uuid not null,
  -- references veltzy.leads(id) — referência cruzada de schema
  requested_by uuid not null references auth.users(id),
  -- quem pediu (representative ou vendedor)
  requested_to uuid not null references auth.users(id),
  -- para quem quer transferir
  type text not null check (type in ('duplicate_conflict', 'queue_transfer', 'manual_transfer')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  resolved_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.lead_transfer_requests enable row level security;
create policy "tenant_isolation" on public.lead_transfer_requests
  for all using (company_id = get_current_company_id() OR is_super_admin());
```

### Tabela `public.notifications`
```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  -- Exemplos: 'lead_conflict', 'transfer_request', 'invite_accepted',
  --           'role_changed', 'login_new_device'
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "own_notifications" on public.notifications
  for all using (user_id = auth.uid());

create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_is_read_idx on public.notifications(is_read);
```

### Tabela `public.auth_audit_log`
```sql
create table public.auth_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  event text not null,
  -- Eventos: login_success, login_failed, logout, invite_sent, invite_accepted,
  --          invite_revoked, role_changed, company_switched, password_reset,
  --          google_oauth_linked, login_new_device
  ip_address text,
  user_agent text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Sem RLS — apenas super_admin lê via service role
create index auth_audit_log_user_id_idx on public.auth_audit_log(user_id);
create index auth_audit_log_company_id_idx on public.auth_audit_log(company_id);
create index auth_audit_log_event_idx on public.auth_audit_log(event);
create index auth_audit_log_created_at_idx on public.auth_audit_log(created_at);
```

### Funções RLS auxiliares
```sql
-- Retorna o company_id ativo da sessão atual
create or replace function public.get_current_company_id()
returns uuid language sql stable security definer
set search_path = public as $$
  select company_id
  from public.user_roles
  where user_id = auth.uid()
    and company_id is not null
  limit 1;
$$;

-- Verifica se o usuário atual é super_admin
create or replace function public.is_super_admin()
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role = 'super_admin'
  );
$$;

-- Verifica se o usuário tem uma permission específica
create or replace function public.has_permission(p_key text)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role = ur.role
    where ur.user_id = auth.uid()
      and rp.permission_key = p_key
  );
$$;

-- Retorna todas as empresas do usuário atual
create or replace function public.get_user_companies()
returns setof uuid language sql stable security definer
set search_path = public as $$
  select distinct company_id
  from public.user_roles
  where user_id = auth.uid()
    and company_id is not null;
$$;
```

---

## 3. Fluxos de Autenticação

### Fluxo 1 — Login do dia a dia
```
1. Usuário acessa app.veltzy.com
2. JWT válido no cookie? → entra direto (SSO passivo)
3. Sem JWT → tela de login (email/senha ou Google)
4. Supabase valida credenciais → retorna JWT
5. Sistema busca user_roles para o user_id
6. Tem mais de uma empresa? → mostra seletor de empresa
7. Só uma empresa? → entra direto
8. Redireciona baseado na role principal:
   - seller → /pipeline
   - manager → /dashboard
   - admin → /dashboard
   - super_admin → hub.veltz.group/dashboard
9. Registra evento login_success em auth_audit_log
```

### Fluxo 2 — Google OAuth
```
1. Usuário clica em "Entrar com Google"
2. Supabase inicia OAuth flow
3. Google retorna email
4. Email já existe no banco?
   a. Sim → faz merge silencioso (link_identity), loga na conta existente
   b. Não → verifica se email tem convite pendente em invitations
      - Tem convite → cria conta e segue fluxo de aceitação
      - Não tem convite → bloqueia com mensagem:
        "Acesso restrito. Entre em contato com seu gestor."
5. Registra evento google_oauth_linked em auth_audit_log
```

### Fluxo 3 — Convite de membro
```
1. Admin ou manager acessa tela de membros no produto
2. Informa email + role do convidado
3. Sistema valida se quem convida tem permission members.invite_<role>
4. Cria registro em public.invitations com token único e validade 7 dias
5. Supabase envia email com link:
   app.veltzy.com/aceitar-convite?token=<uuid>
6. Registra invite_sent em auth_audit_log
7. Convidado clica no link:
   a. Token válido e não expirado → prossegue
   b. Token inválido ou expirado → tela de erro com opção de solicitar novo convite
8. Email já tem conta no Supabase?
   a. Sim → loga automaticamente, cria user_role, redireciona para produto
   b. Não → tela de "Criar sua conta" com campos: nome completo + senha
      (NUNCA pedir nome de empresa — já está no token)
9. Sistema cria profile + user_role com company_id e role do token
10. Marca invitation.accepted_at e status = 'accepted'
11. Registra invite_accepted em auth_audit_log
12. Notifica quem convidou via public.notifications
```

### Fluxo 4 — Novo cliente via checkout (futuro)
```
1. Cliente acessa landing page do produto e escolhe plano
2. Vai para checkout (Stripe ou Asaas)
3. Pagamento aprovado → webhook dispara Edge Function
4. Edge Function:
   a. Cria registro em public.companies
   b. Cria registro em public.subscriptions com plano e features
   c. Envia email para o cliente com link de ativação:
      app.veltzy.com/ativar?token=<uuid>
5. Cliente clica no link e cria sua conta:
   - nome completo, email (já preenchido), senha
   - nome da empresa (ÚNICO momento em que faz sentido perguntar empresa)
6. Sistema cria profile + user_role com role = 'admin'
7. Cliente entra no produto como admin e pode convidar o time
```

### Fluxo 5 — Multi-empresa (seletor)
```
1. Usuário loga normalmente
2. Sistema busca todos os company_ids em user_roles para o user_id
3. Mais de uma empresa?
   a. Não → entra direto na única empresa
   b. Sim → mostra tela de seleção:
      [ Veltz Group — admin    ]
      [ Empresa XYZ — seller   ]
      [ Empresa ABC — representative ]
4. Usuário seleciona empresa
5. Sistema seta company_id ativo na sessão (localStorage ou cookie)
6. Registra company_switched em auth_audit_log se troca de empresa
7. Representative sempre vê este seletor, independente de quantas empresas tem
```

---

## 4. Regras do Representative

### Cadastro de leads
- Somente manual, um por um. Sem importação CSV ou upload em massa.
- Campo obrigatório: telefone/WhatsApp (campo de deduplicação)
- Sistema checa duplicata por telefone no momento do cadastro

### Conflito Tipo A: representative cadastra lead que já existe
```
1. Sistema detecta telefone duplicado
2. Bloqueia o cadastro
3. Cria registro em lead_transfer_requests com type = 'duplicate_conflict'
4. Notifica manager + representative via public.notifications
5. Lead continua com o vendedor atual
6. Representative vê status "aguardando decisão do gestor"
7. Manager aprova ou rejeita:
   - Aprova → lead transferido para representative, vendedor notificado
   - Rejeita → lead permanece com vendedor, representative notificado
```

### Conflito Tipo B: lead de tráfego chega com contato que representative já atende
```
1. Webhook Z-API recebe mensagem
2. Sistema checa: existe atendimento ativo com esse telefone?
3. Sim, atendido por representative → não entra na fila de distribuição
4. Registros são mesclados, lead permanece com representative
5. Manager recebe notificação informativa
```

### Solicitação de transferência de lead na fila
```
1. Representative solicita lead que ainda não foi distribuído
2. Cria registro em lead_transfer_requests com type = 'queue_transfer'
3. Notifica manager
4. Lead continua na fila normalmente
5. Manager aprova ou rejeita
6. Representative recebe resposta via notifications
```

---

## 5. Código Base — Frontend

### Hook `useAuth`
```typescript
// src/hooks/use-auth.ts
import { useAuthStore } from '@/stores/auth.store'

export const useAuth = () => {
  const store = useAuthStore()

  const hasPermission = (key: string): boolean => {
    return store.permissions.includes(key)
  }

  const isSuperAdmin = (): boolean => {
    return store.roles.includes('super_admin')
  }

  const isRepresentative = (): boolean => {
    return store.roles.includes('representative') &&
      !store.roles.includes('admin') &&
      !store.roles.includes('manager')
  }

  const activeCompanyId = (): string | null => {
    return store.activeCompanyId
  }

  return {
    user: store.user,
    profile: store.profile,
    roles: store.roles,
    permissions: store.permissions,
    companies: store.companies,
    activeCompanyId,
    hasPermission,
    isSuperAdmin,
    isRepresentative,
    signOut: store.signOut,
  }
}
```

### Hook `useAuthInit`
```typescript
// src/hooks/use-auth-init.ts
import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

export const useAuthInit = () => {
  const initialized = useRef(false)
  const { setUser, loadUserData, clear, setIsLoading } = useAuthStore()

  useEffect(() => {
    // Carrega sessão inicial uma única vez
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadUserData(session.user.id)
      } else {
        setIsLoading(false)
      }
      initialized.current = true
    })

    // Escuta mudanças de auth — ignora INITIAL_SESSION (já tratado acima)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!initialized.current) return
        if (event === 'INITIAL_SESSION') return

        if (session?.user) {
          setUser(session.user)
          loadUserData(session.user.id)
        } else {
          clear()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])
}
```

### Auth Store (Zustand)
```typescript
// src/stores/auth.store.ts
import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface Company {
  id: string
  name: string
  slug: string
  role: string
}

interface AuthStore {
  user: User | null
  profile: { full_name: string; avatar_url: string | null } | null
  roles: string[]
  permissions: string[]
  companies: Company[]
  activeCompanyId: string | null
  isLoading: boolean

  setUser: (user: User | null) => void
  setIsLoading: (loading: boolean) => void
  loadUserData: (userId: string) => Promise<void>
  switchCompany: (companyId: string) => void
  signOut: () => Promise<void>
  clear: () => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  roles: [],
  permissions: [],
  companies: [],
  activeCompanyId: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setIsLoading: (isLoading) => set({ isLoading }),

  loadUserData: async (userId: string) => {
    try {
      // Busca perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', userId)
        .single()

      // Busca roles e empresas
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role, company_id, companies(id, name, slug)')
        .eq('user_id', userId)

      if (!userRoles) throw new Error('Roles não encontradas')

      const roles = [...new Set(userRoles.map(r => r.role))]

      // Busca permissions das roles
      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('permission_key')
        .in('role', roles)

      const permissions = [...new Set(rolePerms?.map(p => p.permission_key) ?? [])]

      // Monta lista de empresas
      const companies: Company[] = userRoles
        .filter(r => r.company_id && r.companies)
        .map(r => ({
          id: r.company_id!,
          name: (r.companies as any).name,
          slug: (r.companies as any).slug,
          role: r.role,
        }))

      // Define empresa ativa
      const saved = localStorage.getItem('activeCompanyId')
      const activeCompanyId = saved && companies.find(c => c.id === saved)
        ? saved
        : companies[0]?.id ?? null

      set({ profile, roles, permissions, companies, activeCompanyId, isLoading: false })
    } catch (error) {
      console.error('[Auth] loadUserData error:', error)
      set({ isLoading: false })
    }
  },

  switchCompany: (companyId: string) => {
    localStorage.setItem('activeCompanyId', companyId)
    set({ activeCompanyId: companyId })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('activeCompanyId')
    get().clear()
  },

  clear: () => set({
    user: null,
    profile: null,
    roles: [],
    permissions: [],
    companies: [],
    activeCompanyId: null,
    isLoading: false,
  }),
}))
```

### ProtectedRoute
```typescript
// src/components/auth/protected-route.tsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { LoadingScreen } from '@/components/shared/loading-screen'

interface ProtectedRouteProps {
  children: React.ReactNode
  requirePermission?: string
  requireRole?: string[]
}

export const ProtectedRoute = ({
  children,
  requirePermission,
  requireRole,
}: ProtectedRouteProps) => {
  const { user, roles, permissions, isLoading } = useAuthStore()

  if (isLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />

  if (requireRole && !requireRole.some(r => roles.includes(r))) {
    return <Navigate to="/acesso-negado" replace />
  }

  if (requirePermission && !permissions.includes(requirePermission)) {
    return <Navigate to="/acesso-negado" replace />
  }

  return <>{children}</>
}

// Uso:
// <ProtectedRoute requirePermission="leads.view_all">
//   <PipelinePage />
// </ProtectedRoute>
```

### CompanySelector
```typescript
// src/components/auth/company-selector.tsx
// Mostrar apenas se companies.length > 1 OU se role inclui 'representative'
import { useAuthStore } from '@/stores/auth.store'

export const CompanySelector = () => {
  const { companies, activeCompanyId, switchCompany, roles } = useAuthStore()
  const isRepresentative = roles.includes('representative') &&
    !roles.includes('admin') && !roles.includes('manager')

  if (companies.length <= 1 && !isRepresentative) return null

  return (
    <select
      value={activeCompanyId ?? ''}
      onChange={(e) => switchCompany(e.target.value)}
    >
      {companies.map(c => (
        <option key={c.id} value={c.id}>
          {c.name} ({c.role})
        </option>
      ))}
    </select>
  )
}
```

---

## 6. Auditoria de Acesso

### Helper para logar eventos
```typescript
// src/lib/audit.ts
import { supabase } from '@/lib/supabase'

type AuditEvent =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'invite_sent'
  | 'invite_accepted'
  | 'invite_revoked'
  | 'role_changed'
  | 'company_switched'
  | 'password_reset'
  | 'google_oauth_linked'
  | 'login_new_device'

export const logAuditEvent = async (
  event: AuditEvent,
  metadata: Record<string, unknown> = {},
  companyId?: string
) => {
  const { data: { user } } = await supabase.auth.getUser()

  await supabase.from('auth_audit_log').insert({
    user_id: user?.id ?? null,
    company_id: companyId ?? null,
    event,
    metadata,
  })
}
```

---

## 7. Checklist de Implementação

Ao criar auth em qualquer produto do ecossistema:

- [ ] Schema: `companies`, `profiles`, `user_roles`, `permissions`, `role_permissions`, `invitations`, `notifications`, `auth_audit_log`, `lead_transfer_requests` (se produto de vendas)
- [ ] Funções RLS: `get_current_company_id()`, `is_super_admin()`, `has_permission()`, `get_user_companies()`
- [ ] RLS em todas as tabelas com `company_id`
- [ ] Seed de permissions e role_permissions
- [ ] `useAuthInit` com flag `initialized` para evitar race condition
- [ ] `loadUserData` loga erro antes de limpar estado
- [ ] `ProtectedRoute` com suporte a `requirePermission` e `requireRole`
- [ ] `CompanySelector` sempre visível para `representative`
- [ ] Google OAuth com vinculação por email (`link_identity`)
- [ ] Fluxo de convite com tabela `invitations` (nunca perguntar empresa)
- [ ] Tela de aceite de convite: apenas nome + senha para novos usuários
- [ ] `auth_audit_log` em todos os eventos de acesso
- [ ] JWT 1 hora + refresh token 30 dias com rotação
- [ ] Rate limiting habilitado no Supabase Auth settings
- [ ] `super_admin` sem `company_id` em `user_roles`
- [ ] Representative: cadastro manual apenas, sem importação em massa
- [ ] `lead_transfer_requests` para conflitos (se produto de vendas)

---

## 8. O que nunca fazer

- Nunca perguntar nome de empresa no fluxo de convite
- Nunca armazenar `company_id` em `profiles` (usuário pode ter múltiplas empresas)
- Nunca fazer login centralizado no Hub redirecionando para os produtos
- Nunca permitir cadastro público sem convite ou checkout
- Nunca permitir que representative importe leads em massa
- Nunca deixar representative tomar lead diretamente sem aprovação do manager
- Nunca criar novo projeto Supabase para um novo produto — usar o Central
- Nunca hardcodar roles como string no frontend sem checar no banco
- Nunca declarar "feito" sem PVO completo
