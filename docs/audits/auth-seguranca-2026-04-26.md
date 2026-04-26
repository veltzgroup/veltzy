# Auditoria: Auth e Seguranca
**Data:** 2026-04-26
**Area:** Autenticacao, autorizacao, RLS, secrets, Edge Functions, RBAC
**Auditor:** Claude Code

---

## Semaforo Geral: 🔴 VERMELHO

| Dimensao | Status | Gaps |
|----------|--------|------|
| 1. Funcional (Auth Flow) | 🟡 Medio | 3 gaps |
| 2. Dados (RLS/DB) | 🔴 Critico | 6 gaps |
| 3. Integracao (Edge Functions) | 🔴 Critico | 5 gaps |
| 4. UX/Visual | 🟡 Medio | 2 gaps |
| 5. Comercial | 🟠 Alto | Risco reputacional se explorado |

**Resumo:** O sistema de auth funciona para o fluxo feliz, mas tem **vulnerabilidades criticas** que impedem deploy em producao multi-tenant: rotas admin sem protecao de role, policies RLS com `USING (true)`, credenciais em plaintext no banco, CORS `*` em todas Edge Functions, e Edge Functions sem validacao de auth.

---

## Achados por Severidade

### 🔴 CRITICO (8 achados)

#### C1. Rotas /admin, /super-admin, /gestao sem protecao de role
- **Arquivo:** `src/App.tsx:84-90`
- **Problema:** Todas as rotas admin estao dentro de `<ProtectedRoute>` generico (verifica auth), mas SEM `requireRole`. Qualquer seller autenticado acessa `/admin` ou `/super-admin` digitando a URL
- **O ProtectedRoute JA suporta `requireRole`** (definido em `src/components/auth/protected-route.tsx:31`) - so nao esta sendo usado
- **Impacto:** Seller acessa painel admin, pode ver/editar config da empresa, fazer impersonation via super-admin
- **Correcao:** Adicionar `requireRole` nas rotas

#### C2. RLS: company_invites SELECT com USING (true)
- **Arquivo:** `supabase/migrations/010_central_migration.sql:545`
- **Problema:** Policy `vz_ci_select` permite que qualquer usuario autenticado veja convites de TODAS as empresas
- **Impacto:** Exposicao de emails e estrutura organizacional de outros tenants
- **Correcao:** Filtrar por `company_id = veltzy.get_current_company_id()`

#### C3. RLS: support_tickets INSERT com WITH CHECK (true)
- **Arquivos:** `migrations/007_admin_superadmin.sql:94-96` e `migrations/010_central_migration.sql:560`
- **Problema:** Qualquer usuario autenticado pode inserir tickets para QUALQUER empresa
- **Impacto:** Poluicao de dados cross-tenant, possivel vetor de ataque
- **Correcao:** Adicionar `company_id = get_current_company_id()` no WITH CHECK

#### C4. Edge Function instagram-oauth sem autenticacao
- **Arquivo:** `supabase/functions/instagram-oauth/index.ts:11-13`
- **Problema:** Aceita `companyId` do body sem validar se o usuario pertence a essa empresa. Usa SERVICE_ROLE_KEY (bypassa RLS)
- **Impacto:** Qualquer pessoa pode conectar Instagram a qualquer empresa
- **Correcao:** Validar Bearer token e verificar pertencimento ao company

#### C5. CORS `Access-Control-Allow-Origin: *` em TODAS Edge Functions
- **Arquivos:** Todas as 10 Edge Functions em `supabase/functions/*/index.ts`
- **Problema:** Permite que qualquer website faca requests as funcoes
- **Impacto:** CSRF, exfiltracao de dados, invocacao nao autorizada
- **Correcao:** Restringir para dominio(s) da aplicacao

#### C6. Credenciais armazenadas em plaintext no banco
- **Tabelas afetadas:**
  - `whatsapp_configs`: `instance_token`, `client_token`
  - `instagram_connections`: `access_token`
  - `payment_configs`: `api_key`, `api_secret`, `webhook_secret`
  - `system_settings` (sdr_config): `api_key` (OpenAI)
- **Impacto:** Se banco for comprometido, todas integracoes ficam expostas. Backups tambem contem as chaves
- **Correcao:** Usar Supabase Vault ou encriptar antes de salvar

#### C7. Password policy fraca (minimo 6 caracteres)
- **Arquivos:** `src/components/auth/login-form.tsx:14`, `register-form.tsx:15`, `pages/update-password.tsx:15`
- **Problema:** `z.string().min(6)` - sem complexidade, sem uppercase/number/special
- **Impacto:** Senhas fraceis facilmente brute-forcadas
- **Correcao:** Minimo 8+ com requisitos de complexidade

#### C8. Role "representative" no TypeScript mas NAO no enum do Supabase
- **Arquivos:** `src/types/database.ts:1` vs `supabase/migrations/001_foundation.sql:4`
- **Problema:** TypeScript define 5 roles (`super_admin`, `admin`, `manager`, `seller`, `representative`) mas o banco tem apenas 4 (sem `representative`)
- **Impacto:** Tentar atribuir role `representative` causa erro em runtime
- **Correcao:** Adicionar ao enum do banco ou remover do TypeScript

---

### 🟠 ALTO (5 achados)

#### A1. RLS: operator precedence bug na policy de companies UPDATE
- **Arquivo:** `supabase/migrations/001_foundation.sql:317-318`
- **Problema:** `id = get_current_company_id() AND is_company_admin() OR is_super_admin()` avalia como `(A AND B) OR C` em vez de `(A AND B) OR C` - neste caso funciona, mas e fragil e sem parenteses explicitos
- **Correcao:** Adicionar parenteses explicitos

#### A2. RLS: leads SELECT policy com precedencia ambigua
- **Arquivo:** `supabase/migrations/003_leads_pipeline.sql:120-126`
- **Problema:** `company_id = ... AND (is_admin_or_manager() OR assigned_to = ...) OR is_super_admin()` - falta parenteses externo
- **Correcao:** Envolver tudo em `(...) OR is_super_admin()`

#### A3. Edge Functions usando SERVICE_ROLE_KEY para requests client-facing
- **Arquivos:** Todas Edge Functions
- **Problema:** SERVICE_ROLE_KEY bypassa todo RLS. Se combinado com CORS `*`, atacante pode manipular dados de qualquer tenant
- **Correcao:** Para funcoes que recebem requests do client, validar auth token e usar client com RLS

#### A4. Super-admin impersonation sem role check no hook
- **Arquivo:** `src/hooks/use-super-admin.ts:12-26`
- **Problema:** `impersonate()` apenas atualiza Zustand store, sem verificar role. Se rota /super-admin esta acessivel a todos (C1), qualquer user pode impersonar
- **Correcao:** Corrigir C1 resolve, mas adicionar check no hook tambem

#### A5. API keys visiveis na UI em campos de formulario
- **Arquivos:** `src/components/admin/payment-integrations.tsx:32-35`, `src/components/settings/sdr-settings.tsx:65`
- **Problema:** API keys carregadas do banco e exibidas em inputs (mesmo que type=password), acessiveis via DevTools
- **Correcao:** Mascarar mostrando apenas ultimos 4 chars

---

### 🟡 MEDIO (5 achados)

#### M1. Sem session timeout / inactivity logout
- **Arquivo:** `src/hooks/use-auth-init.ts`
- **Problema:** Sessoes ficam ativas indefinidamente. Supabase gerencia refresh automatico
- **Correcao:** Implementar timeout de inatividade (15-30 min configuravel)

#### M2. Erro silencioso na inicializacao de auth
- **Arquivo:** `src/hooks/use-auth-init.ts:34`
- **Problema:** `console.error()` apenas - usuario nao sabe que auth falhou
- **Correcao:** Adicionar error state no auth store + UI de notificacao

#### M3. Missing DELETE policies em 6+ tabelas
- **Tabelas:** system_settings, lead_sources, reply_templates, automation_rules, source_integrations, support_tickets
- **Problema:** Dados podem ser inseridos mas nunca deletados via RLS normal
- **Correcao:** Adicionar DELETE policies ou documentar que e soft-delete

#### M4. source-webhook referencia variavel undefined
- **Arquivo:** `supabase/functions/source-webhook/index.ts:14`
- **Problema:** Usa `url` em vez de `reqUrl` - funcao crasha
- **Correcao:** Trocar `url` por `reqUrl`

#### M5. Hierarquia de roles apenas no frontend
- **Arquivo:** `src/hooks/use-roles.ts`
- **Problema:** Admin > Manager > Seller e implementado apenas no hook. Banco nao tem awareness da hierarquia
- **Correcao:** Implementar funcao de hierarquia no banco para RLS usar

---

### 🟢 BAIXO (3 achados)

#### B1. Rate limiting nao implementado em webhooks
- **Arquivos:** source-webhook, zapi-webhook, instagram-webhook
- **Problema:** Aceitam requests ilimitados
- **Correcao:** Implementar rate limiting por company

#### B2. DiceBear avatar API recebe seeds com dados do usuario
- **Arquivo:** `src/lib/avatar.ts:2`
- **Problema:** Email/nome enviados a servico terceiro para gerar avatar
- **Correcao:** Usar hash do seed antes de enviar

#### B3. Sem HMAC validation em webhooks
- **Arquivos:** Todos webhooks
- **Problema:** Nao validam assinatura do remetente
- **Correcao:** Implementar verificacao HMAC

---

## Inventario

### Arquivos de Auth
| Arquivo | Funcao |
|---------|--------|
| `src/services/auth.service.ts` | signUp, signIn, signOut, resetPassword, updatePassword |
| `src/services/roles.service.ts` | getUserRoles, hasRole, isAdmin, isSuperAdmin |
| `src/hooks/use-auth.ts` | Interface de auth para componentes |
| `src/hooks/use-auth-init.ts` | Inicializacao de sessao + onAuthStateChange |
| `src/hooks/use-roles.ts` | Role hierarchy + permission checks (client-side) |
| `src/stores/auth.store.ts` | Zustand store (user, company, roles, profile) |
| `src/components/auth/protected-route.tsx` | Guard de rota (auth + role) |
| `src/components/auth/login-form.tsx` | Formulario de login |
| `src/components/auth/register-form.tsx` | Formulario de cadastro |
| `src/pages/auth.tsx` | Pagina de auth (login/register) |
| `src/pages/update-password.tsx` | Reset de senha |

### Tabelas com dados sensiveis
| Tabela | Dado sensivel | Protecao atual |
|--------|---------------|----------------|
| user_roles | Roles dos usuarios | RLS por admin |
| whatsapp_configs | Tokens Z-API | RLS por company, plaintext |
| instagram_connections | Access token Facebook | RLS por company, plaintext |
| payment_configs | API keys de pagamento | RLS por company, plaintext |
| system_settings (sdr_config) | API key OpenAI | RLS por company, plaintext |
| company_invites | Emails de convite | RLS USING(true) - VAZANDO |

### Edge Functions
| Funcao | Auth | CORS | Risco |
|--------|------|------|-------|
| distribute-queue | Service Role | * | Rate limit |
| instagram-oauth | **NENHUMA** | * | **CRITICO** |
| instagram-send | Service Role | * | No user validation |
| instagram-webhook | Webhook pattern | * | Aceitavel |
| run-automations | Service Role | * | OK |
| sdr-ai | Service Role | * | Prompt injection |
| source-webhook | Webhook pattern | * | Bug variavel undefined |
| whatsapp-manager | Bearer token | * | OK |
| zapi-send | Bearer token | * | OK |
| zapi-webhook | Webhook pattern | * | Aceitavel |

---

## Plano de Ataque (Priorizado)

### Fase 1 - Bloqueios criticos (ANTES de qualquer demo/producao)

1. **Proteger rotas admin** (C1) - Adicionar `requireRole` no App.tsx
2. **Corrigir RLS company_invites** (C2) - Migration para trocar USING(true)
3. **Corrigir RLS support_tickets** (C3) - Migration para adicionar company_id filter
4. **Adicionar auth no instagram-oauth** (C4) - Validar Bearer token
5. **Restringir CORS** (C5) - Trocar `*` pelo dominio real
6. **Fortalecer password policy** (C7) - Minimo 8 chars com complexidade
7. **Corrigir enum representative** (C8) - Alinhar TS com banco

### Fase 2 - Seguranca de dados

8. **Encriptar credenciais no banco** (C6) - Usar Supabase Vault
9. **Mascarar API keys na UI** (A5) - Mostrar apenas ultimos 4 chars
10. **Corrigir precedencia de RLS policies** (A1, A2) - Adicionar parenteses
11. **Corrigir source-webhook** (M4) - Trocar variavel undefined

### Fase 3 - Hardening

12. **Adicionar session timeout** (M1)
13. **Adicionar DELETE policies** (M3)
14. **Adicionar error state no auth** (M2)
15. **Implementar rate limiting** (B1)
16. **Implementar HMAC em webhooks** (B3)

---

## O que esta BOM

- Supabase Auth gerencia tokens automaticamente (sem localStorage manual)
- `onAuthStateChange` sincroniza logout entre tabs
- `ProtectedRoute` ja suporta `requireRole` - so nao esta sendo usado
- Todas tabelas tem RLS habilitado
- Todas funcoes SECURITY DEFINER tem `SET search_path`
- Sem XSS: nenhum `dangerouslySetInnerHTML` ou `innerHTML` encontrado
- Sem `eval()` ou execucao dinamica de codigo
- `.gitignore` lista `.env` corretamente
- Auth state limpo no logout (store.clear + Supabase signOut)
