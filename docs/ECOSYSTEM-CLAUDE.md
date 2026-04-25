# CLAUDE.md - Veltz Group Ecosystem

## O QUE É O VELTZ GROUP
Ecossistema SaaS multi-produto da Daxen Labs com identidade unificada. Cada produto é uma aplicação independente com domínio próprio, mas compartilha autenticação, tenants e dados via Supabase Central.

## PRODUTOS DO ECOSSISTEMA

| Produto | Descrição | Domínio App | Domínio Landing | Status |
|---|---|---|---|---|
| **Veltzy** | CRM com IA SDR, pipeline, inbox multicanal | app.veltzy.com | veltzy.com | Em produção |
| **Leadbaze** | Marketing: campanhas WhatsApp/SMS/email, automações | app.leadbaze.com | leadbaze.com | Em desenvolvimento |
| **PowerV** | Governança corporativa para PMEs (POWER V framework) | app.[dominio].com | [dominio].com | Planejado |
| **Portal Hub** | Acesso unificado a todos os produtos contratados | app.veltz.group | veltz.group | A construir |

## SUPABASE CENTRAL

```
Project: veltz-group
Ref: zxefzegggntfjlfsdgvw
URL: https://zxefzegggntfjlfsdgvw.supabase.co
Região: us-east-1 (North Virginia)
```

### Responsabilidades do Central
- Autenticação unificada (um login para todos os produtos)
- Tabela de companies (tenants compartilhados)
- Tabela de subscriptions (controle de acesso por produto)
- Profiles básicos compartilhados
- Schema por produto: `veltzy.*`, `leadbaze.*`, `powerv.*`

### Responsabilidade de cada produto
- Dados específicos do produto ficam no schema do produto
- Toda query filtra por `company_id` vindo do Central
- RLS em todas as tabelas com `company_id`

## ARQUITETURA

```
Supabase Central (veltz-group)
├── schema: public
│   ├── companies          → tenants (um por cliente, compartilhado entre produtos)
│   ├── profiles           → dados básicos do usuário
│   ├── user_roles         → roles globais (super_admin, admin, manager, seller)
│   ├── subscriptions      → qual company tem acesso a qual produto/plano
│   └── auth.users         → Supabase Auth nativo
│
├── schema: veltzy
│   ├── leads, messages, pipeline_stages, lead_sources...
│   └── Todos os dados específicos do Veltzy
│
├── schema: leadbaze
│   ├── campaigns, contacts, broadcasts, automations...
│   └── Todos os dados específicos do Leadbaze
│
└── schema: powerv
    ├── governance_modules, okrs, valuations...
    └── Todos os dados específicos do PowerV

Frontend (Vercel)
├── app.veltzy.com     → React app do Veltzy
├── app.leadbaze.com   → React app do Leadbaze
├── app.veltz.group    → Portal hub
└── app.[powerv].com   → React app do PowerV

Landing Pages (Vercel)
├── veltzy.com         → Site de vendas do Veltzy
├── leadbaze.com       → Site de vendas do Leadbaze
└── veltz.group        → Site institucional do grupo
```

## FLUXO DE VALOR ENTRE PRODUTOS

```
Leadbaze → captura lead via tráfego pago → dispara campanha WhatsApp/email
    ↓
Lead responde → passa para Veltzy → vendedor atende em tempo real → fecha negócio
    ↓
Empresa cresce → contrata PowerV → estrutura governança para escalar ou vender
```

## AUTENTICAÇÃO (SSO)

Um único JWT do Supabase Central é aceito em todos os produtos.

Fluxos de acesso:
1. **Produto avulso**: usuário acessa `app.veltzy.com` → faz login → vê só o Veltzy
2. **Portal hub**: usuário acessa `app.veltz.group` → faz login → vê todos os produtos contratados → clica em um → entra sem novo login (SSO via token compartilhado)
3. **Upgrade**: dentro de qualquer produto, banner discreto oferece outros produtos do ecossistema

## SUBSCRIPTIONS (CONTROLE DE ACESSO)

```sql
-- Tabela central de controle de acesso por produto
subscriptions (
    company_id,     -- o tenant
    product,        -- 'veltzy' | 'leadbaze' | 'powerv'
    plan,           -- 'starter' | 'pro' | 'enterprise'
    status,         -- 'trial' | 'active' | 'cancelled' | 'expired'
    trial_ends_at,
    current_period_ends_at
)
```

Cada produto verifica no boot se existe `subscription` ativa para aquele `company_id + product`.
Se não existir → redireciona para página de upgrade.

## STACK PADRÃO (TODOS OS PRODUTOS)

- **Frontend:** React 18 + Vite 5 + TypeScript 5 + Tailwind CSS 3 + shadcn/ui
- **State:** TanStack React Query v5 + Zustand
- **Backend:** Supabase Central (Auth, DB, Realtime, Storage, Edge Functions)
- **Deploy:** Vercel
- **Idiomas:** PT-BR + EN (i18n via react-i18next)
- **Fuso:** America/Sao_Paulo (BR) / America/New_York (US)

## INTERNACIONALIZAÇÃO

Todos os produtos suportam PT-BR e EN.
Detecção automática via browser language.
Strings em `src/locales/pt-BR.json` e `src/locales/en.json`.
Hook: `useTranslation()` do react-i18next.

## CONVENÇÕES GLOBAIS

### Multi-tenant
- TODA query filtra por `company_id`
- TODA tabela tem `company_id NOT NULL` com FK para `public.companies`
- RLS em todas as tabelas: `company_id = get_current_company_id() OR is_super_admin()`

### Schemas
- Dados compartilhados → schema `public`
- Dados do Veltzy → schema `veltzy`
- Dados do Leadbaze → schema `leadbaze`
- Dados do PowerV → schema `powerv`
- Nunca misturar dados de produto no schema `public`

### Subscriptions
- Todo produto verifica subscription no boot
- Hook: `useSubscription(product)` → `{ isActive, plan, trialDaysLeft }`
- Se não ativo → componente `<UpgradePrompt product="veltzy" />`

### Naming de variáveis de ambiente
```
# Supabase Central (igual em todos os produtos)
VITE_SUPABASE_URL=https://zxefzegggntfjlfsdgvw.supabase.co
VITE_SUPABASE_ANON_KEY=

# Produto específico
VITE_PRODUCT=veltzy          # 'veltzy' | 'leadbaze' | 'powerv'
VITE_APP_URL=https://app.veltzy.com
VITE_APP_NAME=Veltzy
```

## SUPER ADMIN (Daxen Labs)

- Acesso em `app.veltz.group/super-admin`
- Visão global de TODOS os tenants de TODOS os produtos
- Gerencia subscriptions (ativar, cancelar, alterar plano)
- Impersonação de qualquer empresa em qualquer produto
- Dashboard de receita consolidada do ecossistema

## PRODUTOS E SLUGS (IMUTÁVEIS)

Os slugs abaixo são definitivos e não devem ser alterados pois são usados em subscriptions, logs e integrações:

| Produto | Slug |
|---|---|
| Veltzy | `veltzy` |
| Leadbaze | `leadbaze` |
| PowerV | `powerv` |
| Portal Hub | `hub` |

## ROADMAP DE INTEGRAÇÃO

```
Fase atual:  Veltzy standalone (Supabase próprio)
Próximo:     Supabase Central criado + schema veltzy migrado
Depois:      Leadbaze migrado para Central
Depois:      Portal hub app.veltz.group
Depois:      PowerV entra no ecossistema
Futuro:      Billing integrado (Asaas/Stripe)
Futuro:      IA cross-produto (Leadbaze + Veltzy vendo o mesmo lead)
```

## O QUE NÃO FAZER

- NÃO criar projetos Supabase separados por produto (tudo no Central)
- NÃO duplicar tabela de `companies` em cada produto
- NÃO usar auth diferente por produto (sempre Supabase Central)
- NÃO hardcodar slugs de produto (sempre usar `VITE_PRODUCT`)
- NÃO criar schemas com nome genérico (sempre prefixar com o produto)
