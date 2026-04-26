# Auditoria: Sidebar e Layout
**Data:** 2026-04-26
**Area:** AppSidebar, MainLayout, ThemeToggle, NotificationCenter, ErrorReportButton, App.tsx (rotas)
**Escopo:** Navegacao principal, layout shell, controles globais, routing, responsividade

---

## Semaforo Geral: 🟢 VERDE

| Dimensao | Status | Gaps |
|----------|--------|------|
| 1. Funcional | 🟢 Verde | 2 gaps (1 medio, 1 baixo) |
| 2. Dados | 🟢 Verde | 0 gaps |
| 3. Integracoes | 🟢 Verde | 0 gaps |
| 4. UX/Visual | 🟡 Amarelo | 3 gaps (1 alto, 1 medio, 1 baixo) |
| 5. Comercial | 🟢 Verde | 1 gap (baixo) |

**Total: 6 gaps** (0 criticos, 1 alto, 2 medios, 3 baixos)

---

## Inventario

### Layout Shell
| Componente | Arquivo | Linhas | Descricao |
|-----------|---------|--------|-----------|
| MainLayout | src/components/layout/main-layout.tsx | 17 | Flex container: sidebar + main outlet |
| AppSidebar | src/components/layout/app-sidebar.tsx | 199 | Sidebar completa com nav, users online, perfil |
| ThemeToggle | src/components/layout/theme-toggle.tsx | 31 | Cicla entre light/dark/sand |

### Controles Globais
| Componente | Arquivo | Linhas | Descricao |
|-----------|---------|--------|-----------|
| NotificationCenter | src/components/shared/notification-center.tsx | 106 | Dropdown de notificacoes com badge, mark as read |
| ErrorReportButton | src/components/shared/error-report-button.tsx | 94 | FAB para reportar bugs (admin only) |
| PageLoadingSkeleton | src/components/shared/page-loading-skeleton.tsx | — | Fallback do Suspense |
| ErrorBoundary | src/components/shared/error-boundary.tsx | — | Catch de erros React |

### Router (App.tsx)
| Rota | Pagina | Protecao |
|------|--------|----------|
| / | Dashboard | Autenticado + empresa |
| /pipeline | Pipeline | Autenticado + empresa |
| /inbox | Inbox | Autenticado + empresa |
| /deals | Deals | Autenticado + empresa |
| /gestao | Gestao | manager, admin, super_admin |
| /admin | Admin | admin, super_admin |
| /super-admin | SuperAdmin | super_admin |
| /minha-conta | MinhaConta | Autenticado + empresa |
| /auth | Auth | Publico |
| /onboarding | Onboarding | Autenticado (sem empresa) |
| /update-password | UpdatePassword | Autenticado (sem empresa) |
| /sellers | Redirect → /gestao?tab=vendedores | — |
| /settings | Redirect → /minha-conta | — |
| /company | Redirect → /admin?tab=empresa | — |

### Sidebar Sections
1. **Logo + Empresa** — "V" badge + nome da empresa
2. **Navegacao** — 7 items (4 fixos + 3 condicionais por role)
3. **Usuarios online** — visivel para admin/manager, lista membros is_available
4. **Controles** — ThemeToggle + NotificationCenter
5. **Perfil** — Avatar + nome + email + dropdown (Minha conta, Sair) + toggle disponibilidade

---

## Achados por Dimensao

### Dimensao 1: FUNCIONAL

#### 🟡 SF-01: NotificationCenter chama useNotifications() duas vezes
- **Severidade:** Medio
- **Arquivo:** `src/components/shared/notification-center.tsx:55,60`
- **Detalhe:** Linha 55 chama `useNotifications()` sem usar retorno, linha 60 chama de novo com `const { data: notifications }`. Isso cria 2 subscriptions identicas. Nao causa bug visivel (React Query deduplica), mas e codigo confuso e desnecessario.
- **Acao:** Remover a chamada da linha 55 e manter apenas a da linha 60.

#### 🟢 SF-02: Redirect /sellers e /settings usam Navigate sem fallback
- **Severidade:** Baixo
- **Arquivo:** `src/App.tsx:85-86`
- **Detalhe:** Redirects funcionam corretamente. Nota: `/settings` redireciona para `/minha-conta` que e correto. `/company` redireciona para `/admin?tab=empresa`. Tudo funcional.
- **Acao:** Nenhuma acao necessaria — apenas documentar que esses redirects existem para URLs legadas.

---

### Dimensao 2: DADOS

**Nenhum gap encontrado.**

Pontos positivos:
- ✅ useTeamMembers() filtra por company_id
- ✅ useNotifications() filtra por user_id e company_id
- ✅ useToggleAvailability() atualiza profiles com company_id
- ✅ Auth store gerencia user, profile, company, roles
- ✅ signOut limpa store e redireciona
- ✅ ProtectedRoute verifica auth, empresa e roles

---

### Dimensao 3: INTEGRACOES

**Nenhum gap encontrado.**

Pontos positivos:
- ✅ NotificationCenter com realtime (useNotifications subscreve mudancas)
- ✅ Toggle disponibilidade sincroniza com seller-performance e distribuicao
- ✅ NavLinks usam React Router (client-side navigation, sem reload)
- ✅ Lazy loading com Suspense em todas as paginas
- ✅ ErrorBoundary no nivel do App
- ✅ QueryClient com defaults sensatos (staleTime 5min, retry 1, refetchOnWindowFocus)

---

### Dimensao 4: UX/VISUAL

#### 🟠 SU-01: Sidebar nao e responsiva — w-64 fixo, sem mobile
- **Severidade:** Alto
- **Arquivo:** `src/components/layout/app-sidebar.tsx:70`, `src/components/layout/main-layout.tsx:7`
- **Detalhe:** Sidebar tem `w-64` fixo (256px). MainLayout e `flex h-screen`. Em telas < 768px, sidebar ocupa ~33% da tela e o conteudo fica espremido. Nao ha hamburger menu, drawer ou colapse. Em mobile, o app e inutilizavel.
- **Acao:** Implementar sidebar colapsavel: hamburger menu em mobile que abre drawer overlay. Em desktop, manter w-64 fixo.

#### 🟡 SU-02: Logo "V" e hardcoded — nao usa branding da empresa
- **Severidade:** Medio
- **Arquivo:** `src/components/layout/app-sidebar.tsx:72-74`
- **Detalhe:** Logo e um `<div>` com letra "V" fixa. ThemeCustomizer permite personalizar cores, mas nao o logo. Para white-label, o cliente esperaria ver seu logo ou ao menos a inicial da empresa.
- **Acao:** Usar primeira letra de `company.name` em vez de "V" hardcoded, ou integrar com campo de logo no ThemeCustomizer.

#### 🟢 SU-03: ThemeToggle sem label — usuario nao sabe qual tema atual
- **Severidade:** Baixo
- **Arquivo:** `src/components/layout/theme-toggle.tsx:24`
- **Detalhe:** Botao tem `title={Tema: ${current}}` que so aparece no hover. Icone muda (Sun/Moon/Palette) mas sem tooltip persistente. Menor — funciona via icone visual.
- **Acao:** Opcional — adicionar Tooltip com nome do tema.

**Pontos positivos:**
- ✅ NavLink com isActive highlight (bg-sidebar-accent)
- ✅ Itens condicionais por role (Gestao, Admin, SuperAdmin)
- ✅ Usuarios online com avatar e dot verde (admin/manager)
- ✅ Perfil no footer com dropdown (Minha conta, Sair)
- ✅ Toggle disponibilidade com dot verde/vermelho e tooltip
- ✅ NotificationCenter com badge animado (pulse) e contagem
- ✅ ErrorReportButton como FAB fixo (admin only)
- ✅ Scrollbar minimal na nav e usuarios online
- ✅ Truncate em nomes longos de empresa e perfil
- ✅ Design tokens semanticos (sidebar-border, sidebar-accent, sidebar-primary)
- ✅ Dark mode completo (3 temas: light, dark, sand)
- ✅ Separadores visuais entre secoes

---

### Dimensao 5: COMERCIAL

#### 🟢 SC-01: Branding "Veltzy" hardcoded
- **Severidade:** Baixo
- **Detalhe:** `<span className="text-sm font-semibold text-primary">Veltzy</span>` na sidebar. Para white-label, deveria mostrar o nome da plataforma do cliente ou ser configuravel. Nao bloqueia demo (o produto E Veltzy), mas limita white-label.
- **Acao:** Fase futura — tornar nome e logo configuraveis via ThemeCustomizer ou company settings.

**Pontos positivos:**
- ✅ Sidebar e profissional e completa — primeira impressao forte em demo
- ✅ Toggle disponibilidade no footer — funcionalidade unica e util
- ✅ Notificacoes em tempo real com badge — mostra sistema vivo
- ✅ Usuarios online visivel para gestores — controle de equipe integrado
- ✅ 3 temas (light/dark/sand) impressionam em demo
- ✅ ErrorReportButton mostra suporte integrado
- ✅ Navegacao limpa e logica (Dashboard → Pipeline → Inbox → Deals → Gestao → Admin)

**Pergunta-chave: "Se eu mostrar isso pro cliente amanha, ele assina hoje?"**
> Sim. A sidebar e o layout sao o primeiro contato visual e estao solidos. Navegacao logica, controles uteis (tema, notificacoes, disponibilidade), branding limpo. O unico gap real e a falta de responsividade mobile, mas para demo desktop e perfeito.

---

## Plano de Ataque (ordem priorizada)

### Sprint 1 — Antes de producao
| # | Gap | Severidade | Esforco |
|---|-----|-----------|---------|
| 1 | SU-01: Sidebar responsiva (mobile drawer) | 🟠 Alto | Alto |
| 2 | SF-01: Remover useNotifications duplicado | 🟡 Medio | Minimo |
| 3 | SU-02: Logo dinamico (inicial da empresa) | 🟡 Medio | Minimo |

### Backlog
| # | Gap | Severidade | Esforco |
|---|-----|-----------|---------|
| 4 | SU-03: Tooltip no ThemeToggle | 🟢 Baixo | Minimo |
| 5 | SC-01: Branding configuravel | 🟢 Baixo | Medio |
| 6 | SF-02: Documentar redirects legados | 🟢 Baixo | Minimo |
