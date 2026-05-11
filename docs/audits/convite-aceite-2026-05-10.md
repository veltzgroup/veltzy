# Auditoria: Fluxo de Aceite de Convite

**Data:** 2026-05-10
**Area:** Convite de membros (Hub → Veltzy)
**Semaforo geral:** 🟡 AMARELO

---

## Sumario Executivo

| Dimensao | Gaps | Severidade max |
|----------|------|----------------|
| 1. Funcional | 3 | 🟠 Alto |
| 2. Dados | 1 | 🟡 Medio |
| 3. Integracao | 1 | 🟡 Medio |
| 4. UX/Visual | 2 | 🟡 Medio |
| 5. Comercial | 1 | 🟡 Medio |

**Total:** 8 gaps (0 criticos, 2 altos, 5 medios, 1 baixo)

---

## Inventario

### Componentes envolvidos

| Arquivo | Projeto | Funcao |
|---------|---------|--------|
| `supabase/functions/invite-member/index.ts` | Hub | Edge Function que envia convite |
| `src/hooks/use-companies.ts` | Hub | Hook que chama invite apos criar empresa |
| `src/services/invitations.service.ts` | Hub | Service que invoca Edge Function |
| `src/pages/aceitar-convite.tsx` | Veltzy | Pagina de aceite (3 fluxos) |
| `src/stores/auth.store.ts` | Veltzy | Detecta convite pendente no loadUserData |
| `src/components/auth/protected-route.tsx` | Veltzy | Evita redirect para onboarding |
| `src/pages/onboarding.tsx` | Veltzy | Mostra convite pendente antes de criar empresa |
| `supabase/migrations/20260508000001_*` | Hub | RPC accept_invitation (preserva super_admin) |

### Fluxos mapeados

1. **Hub cria empresa → dispara convite** (Edge Function)
2. **Email chega → usuario clica → Supabase verifica → redirect com hash**
3. **aceitar-convite.tsx lê hash → setSession → busca invite → aceita via RPC**
4. **aceitar-convite.tsx lê ?token → valida → login/register → aceita via RPC**
5. **auth.store detecta usuario sem empresa → redireciona para aceitar-convite**

---

## Achados por Dimensao

### 1. FUNCIONAL

#### F1-01 🟠 Alto — Race condition entre useAuthInit e handleSupabaseInviteRedirect

**Arquivo:** `src/pages/aceitar-convite.tsx:85` + `src/hooks/use-auth-init.ts:10`

**Problema:** O `useAuthInit` (App.tsx) chama `supabase.auth.getSession()` e escuta `onAuthStateChange`. Quando o hash contem tokens, o Supabase client automaticamente processa o hash e dispara `onAuthStateChange` com evento `SIGNED_IN`. Isso faz o `loadUserData` rodar em paralelo com `handleSupabaseInviteRedirect`.

Se `loadUserData` roda primeiro e nao encontra empresa → pode redirecionar para `/onboarding` antes do `handleSupabaseInviteRedirect` completar.

**Mitigacao existente:** O `auth.store.ts:115` verifica `!window.location.pathname.includes('aceitar-convite')` antes de redirecionar. Isso deve proteger. Porem, se `loadUserData` completa e seta `isLoading: false` com `companies: []`, o `ProtectedRoute` pode redirecionar para `/onboarding` antes do RPC aceitar.

**Acao:** Testar manualmente. Se ocorrer, adicionar check de `sessionStorage.invite_accepted` no `auth.store.ts` para nao redirecionar para onboarding durante aceite.

#### F1-02 🟠 Alto — .single() sem fallback quando multiplos convites pendentes existem

**Arquivo:** `src/pages/aceitar-convite.tsx:117`

**Problema:** A query usa `.limit(1).single()`. O `.single()` retorna erro se houver 0 ou mais de 1 resultado. Com `.limit(1)`, nunca havera mais de 1 resultado retornado, entao `.single()` so falharia se 0 resultados. Isso esta OK, mas semanticamente `.maybeSingle()` seria mais seguro para evitar erro no caso de 0 resultados (retornaria null em vez de erro).

**Impacto:** Se nao houver convite pendente, `inviteError` sera truthy e o fluxo cai em "Convite invalido" — que e o comportamento correto. Gap e apenas de robustez.

**Acao:** Trocar `.single()` por `.maybeSingle()` e checar `!pendingInvite` separadamente do erro.

#### F1-03 🟡 Medio — Convite aceito mas companyName vazio no estado 'accepted'

**Arquivo:** `src/pages/aceitar-convite.tsx:152` + `src/pages/aceitar-convite.tsx:400`

**Problema:** No fluxo hash, `companyName` nunca e setado (o state `setCompanyName` so e chamado em `validateToken`). A tela de "accepted" mostra "Voce agora faz parte de " seguido de nada.

**Impacto:** UX confusa por 1-2 segundos antes do `navigate('/')` executar.

**Acao:** Setar `setCompanyName` a partir do `pendingInvite.companies.name` no `handleSupabaseInviteRedirect`.

### 2. DADOS

#### D2-01 🟡 Medio — RLS pode bloquear query de invitations no fluxo hash

**Arquivo:** `src/pages/aceitar-convite.tsx:109-117`

**Problema:** Apos `setSession`, o usuario esta autenticado mas pode nao ter `company_id` no profile ainda (o convite nao foi aceito). Se a RLS de `invitations` filtra por `company_id = get_current_company_id()`, a query nao retornara nada.

**Mitigacao possivel:** A RPC `accept_invitation` e SECURITY DEFINER, mas a query SELECT anterior usa o client normal (anon/authenticated). Depende da RLS configurada na tabela `invitations`.

**Acao:** Verificar RLS da tabela `invitations`. Se filtra por company_id, precisa de policy que permita leitura por email do usuario autenticado.

### 3. INTEGRACAO

#### I3-01 🟡 Medio — Email template do Supabase Auth ainda em ingles

**Problema:** O `inviteUserByEmail` usa o template "Invite User" do Supabase Auth Dashboard. Se nao foi customizado, o email chega em ingles.

**Acao:** Customizar no Dashboard: Authentication → Email Templates → Invite User. Alterar para pt-BR. Isso e manual, nao via codigo.

### 4. UX/VISUAL

#### U4-01 🟡 Medio — Textos sem acento

**Arquivos:** `src/pages/aceitar-convite.tsx` (multiplas linhas)

**Problema:** Varios textos usam "Voce" em vez de "Você", "Ja" em vez de "Já", "Faca" em vez de "Faça".

**Linhas afetadas:**
- L304: "Voce agora faz parte de"
- L326: "Voce foi convidado para"
- L357: "Voce foi convidado para entrar como"
- L475: "Ja existe uma conta com este email. Faca login para aceitar."

**Acao:** Corrigir acentos.

#### U4-02 🟢 Baixo — Cores hardcoded nos badges de role

**Arquivo:** `src/pages/aceitar-convite.tsx:442-448`

**Problema:** `roleBadgeColors` usa cores diretas (`bg-blue-100`, `bg-purple-100`) em vez de tokens semanticos. Viola convencao do CLAUDE.md do Veltzy.

**Acao:** Baixa prioridade, nao impacta funcionalidade.

### 5. COMERCIAL

#### C5-01 🟡 Medio — Fluxo nao testavel end-to-end sem verificar email real

**Problema:** Para testar o fluxo completo (Hub cria empresa → email chega → usuario aceita), precisa de SMTP configurado e caixa de email real. Nao ha forma de testar em staging sem enviar email de verdade.

**Acao:** Considerar criar rota de debug (apenas em dev) que simula o redirect do Supabase com hash mockado.

---

## Plano de Ataque (priorizado)

| # | Gap | Esforco | Impacto |
|---|-----|---------|---------|
| 1 | D2-01: Verificar RLS de invitations | 5 min | Pode bloquear 100% do fluxo hash |
| 2 | F1-01: Testar race condition auth | 10 min | Pode causar redirect errado |
| 3 | F1-03: Setar companyName no fluxo hash | 2 min | UX |
| 4 | F1-02: Trocar .single() por .maybeSingle() | 2 min | Robustez |
| 5 | U4-01: Corrigir acentos | 5 min | pt-BR |
| 6 | I3-01: Template email pt-BR | 5 min | Manual no Dashboard |
| 7 | U4-02: Cores hardcoded | 5 min | Polish |
| 8 | C5-01: Rota de debug | 15 min | Dev experience |

**Tempo total estimado para gaps 1-6:** ~30 min

---

## Veredicto

O fix principal (leitura do hash) resolve o bloqueio critico. O fluxo agora funciona para o caminho feliz. Os 8 gaps encontrados sao todos corrigiveis rapidamente, sendo os mais urgentes a verificacao de RLS (D2-01) e o teste de race condition (F1-01) — ambos podem impedir o fluxo em cenarios especificos.
