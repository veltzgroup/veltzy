# CLAUDE.md - Veltz Group Ecosystem

## O QUE E O VELTZ GROUP
Ecossistema SaaS multi-produto da Daxen Labs com identidade unificada. Cada produto e uma aplicacao independente com dominio proprio, mas compartilha autenticacao, tenants e dados via Supabase Central (quando migrado).

## PRODUTOS DO ECOSSISTEMA

| Produto | Descricao | Dominio App | Dominio Landing | Status |
|---|---|---|---|---|
| **Veltzy** | CRM com IA SDR, pipeline, inbox multicanal, metas comerciais | app.veltzy.com | veltzy.com | Em producao (Supabase proprio, pre-migracao Central) |
| **Leadbaze** | Marketing: campanhas WhatsApp/SMS/email, automacoes | app.leadbaze.com | leadbaze.com | Em desenvolvimento |
| **PowerV** | Governanca corporativa para PMEs (POWER V framework) | app.[dominio].com | [dominio].com | Planejado |
| **Portal Hub** | Acesso unificado a todos os produtos contratados | app.veltz.group | veltz.group | A construir |

## ESTADO ATUAL DO VELTZY

O Veltzy opera em **Supabase proprio** (projeto `frwzyfnrztotkggvksci`, regiao Sao Paulo), ainda nao migrado para o Supabase Central. Deploy via Vercel (app.veltzy.com). GitHub: veltzgroup/veltzy.

Feature-complete com 8 fases implementadas:
1. Foundation (auth, multi-tenant, onboarding, layout)
2. Pipeline Kanban (drag & drop, leads, modais)
3. Inbox (chat multicanal, Z-API, realtime)
4. IA SDR + Automacoes (qualificacao, distribuicao, auto-reply)
5. Dashboard + Equipe (KPIs, graficos, sellers, convites, exportacao)
6. Admin + SuperAdmin (integracoes, support tickets, impersonacao)
7. Deploy + Polish (code splitting, SEO, error boundary, indices)
8. Settings Reorg (/minha-conta pessoal, /admin operacao, /company marca)

Funcionalidades adicionais pos-fases:
- Modulo de Metas Comerciais (goals + goal_metrics)
- Pagina de Negocios (/deals) com KPIs e tabela
- Gestao Comercial (/gestao) com 7 abas
- Lead card com barra de temperatura gradiente, efeito fire, icone Bot IA
- Sidebar com branding Veltzy + nome do tenant

10 Edge Functions deployadas. 9 migrations SQL aplicadas.

## SUPABASE CENTRAL

```
Project: veltz-group
Ref: zxefzegggntfjlfsdgvw
URL: https://zxefzegggntfjlfsdgvw.supabase.co
Regiao: us-east-1 (North Virginia)
```

### Responsabilidades do Central
- Autenticacao unificada (um login para todos os produtos)
- Tabela de companies (tenants compartilhados)
- Tabela de subscriptions (controle de acesso por produto)
- Profiles basicos compartilhados
- Schema por produto: `veltzy.*`, `leadbaze.*`, `powerv.*`

### Responsabilidade de cada produto
- Dados especificos do produto ficam no schema do produto
- Toda query filtra por `company_id` vindo do Central
- RLS em todas as tabelas com `company_id`

## ARQUITETURA

```
Supabase Central (veltz-group)
|-- schema: public
|   |-- companies          -> tenants (um por cliente, compartilhado entre produtos)
|   |-- profiles           -> dados basicos do usuario
|   |-- user_roles         -> roles globais (super_admin, admin, manager, seller)
|   |-- subscriptions      -> qual company tem acesso a qual produto/plano
|   |-- auth.users         -> Supabase Auth nativo
|
|-- schema: veltzy
|   |-- leads, messages, pipeline_stages, lead_sources, goals, goal_metrics...
|   |-- Todos os dados especificos do Veltzy
|
|-- schema: leadbaze
|   |-- campaigns, contacts, broadcasts, automations...
|   |-- Todos os dados especificos do Leadbaze
|
|-- schema: powerv
    |-- governance_modules, okrs, valuations...
    |-- Todos os dados especificos do PowerV

Frontend (Vercel)
|-- app.veltzy.com     -> React app do Veltzy
|-- app.leadbaze.com   -> React app do Leadbaze
|-- app.veltz.group    -> Portal hub
|-- app.[powerv].com   -> React app do PowerV

Landing Pages (Vercel)
|-- veltzy.com         -> Site de vendas do Veltzy
|-- leadbaze.com       -> Site de vendas do Leadbaze
|-- veltz.group        -> Site institucional do grupo
```

## FLUXO DE VALOR ENTRE PRODUTOS

```
Leadbaze -> captura lead via trafego pago -> dispara campanha WhatsApp/email
    |
Lead responde -> passa para Veltzy -> vendedor atende em tempo real -> fecha negocio
    |
Empresa cresce -> contrata PowerV -> estrutura governanca para escalar ou vender
```

## AUTENTICACAO (SSO)

Um unico JWT do Supabase Central e aceito em todos os produtos.

Fluxos de acesso:
1. **Produto avulso**: usuario acessa `app.veltzy.com` -> faz login -> ve so o Veltzy
2. **Portal hub**: usuario acessa `app.veltz.group` -> faz login -> ve todos os produtos contratados -> clica em um -> entra sem novo login (SSO via token compartilhado)
3. **Upgrade**: dentro de qualquer produto, banner discreto oferece outros produtos do ecossistema

**Nota:** Enquanto o Veltzy nao migrar para o Central, auth e feito via Supabase proprio.

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
Se nao existir -> redireciona para pagina de upgrade.

## STACK PADRAO (TODOS OS PRODUTOS)

- **Frontend:** React 18 + Vite 5 + TypeScript 5 + Tailwind CSS 3 + shadcn/ui
- **State:** TanStack React Query v5 + Zustand
- **Backend:** Supabase (Auth, DB, Realtime, Storage, Edge Functions)
- **Deploy:** Vercel
- **Idioma:** PT-BR (i18n planejado para futuro)
- **Fuso:** America/Sao_Paulo

## CONVENCOES GLOBAIS

### Multi-tenant
- TODA query filtra por `company_id`
- TODA tabela tem `company_id NOT NULL` com FK para `public.companies`
- RLS em todas as tabelas: `company_id = get_current_company_id() OR is_super_admin()`

### Schemas
- Dados compartilhados -> schema `public`
- Dados do Veltzy -> schema `veltzy`
- Dados do Leadbaze -> schema `leadbaze`
- Dados do PowerV -> schema `powerv`
- Nunca misturar dados de produto no schema `public`

### Subscriptions
- Todo produto verifica subscription no boot
- Hook: `useSubscription(product)` -> `{ isActive, plan, trialDaysLeft }`
- Se nao ativo -> componente `<UpgradePrompt product="veltzy" />`

### Naming de variaveis de ambiente
```
# Supabase Central (igual em todos os produtos)
VITE_SUPABASE_URL=https://zxefzegggntfjlfsdgvw.supabase.co
VITE_SUPABASE_ANON_KEY=

# Produto especifico
VITE_PRODUCT=veltzy          # 'veltzy' | 'leadbaze' | 'powerv'
VITE_APP_URL=https://app.veltzy.com
VITE_APP_NAME=Veltzy
```

## SUPER ADMIN (Daxen Labs)

- Acesso em `app.veltz.group/super-admin`
- Visao global de TODOS os tenants de TODOS os produtos
- Gerencia subscriptions (ativar, cancelar, alterar plano)
- Impersonacao de qualquer empresa em qualquer produto
- Dashboard de receita consolidada do ecossistema

## PRODUTOS E SLUGS (IMUTAVEIS)

Os slugs abaixo sao definitivos e nao devem ser alterados pois sao usados em subscriptions, logs e integracoes:

| Produto | Slug |
|---|---|
| Veltzy | `veltzy` |
| Leadbaze | `leadbaze` |
| PowerV | `powerv` |
| Portal Hub | `hub` |

## ROADMAP DE INTEGRACAO

```
Fase atual:  Veltzy standalone (Supabase proprio, frwzyfnrztotkggvksci)
Proximo:     Supabase Central criado + schema veltzy migrado
Depois:      Leadbaze migrado para Central
Depois:      Portal hub app.veltz.group
Depois:      PowerV entra no ecossistema
Futuro:      Billing integrado (Asaas/Stripe)
Futuro:      IA cross-produto (Leadbaze + Veltzy vendo o mesmo lead)
```

## O QUE NAO FAZER

- NAO criar projetos Supabase separados por produto (tudo no Central, quando migrado)
- NAO duplicar tabela de `companies` em cada produto
- NAO usar auth diferente por produto (sempre Supabase Central)
- NAO hardcodar slugs de produto (sempre usar `VITE_PRODUCT`)
- NAO criar schemas com nome generico (sempre prefixar com o produto)
- NAO usar Lovable AI Gateway ou qualquer dependencia Lovable (removido)
