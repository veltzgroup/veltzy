---
name: claude-code-sdd
description: Workflow Spec-Driven Development (SDD) para construir aplicações com Claude Code de forma confiável, sem travar no meio do projeto. Use esta skill SEMPRE que o usuário quiser implementar qualquer funcionalidade nova em um projeto de software, especialmente em projetos com Claude Code, Supabase, Vercel e GitHub. Acione esta skill quando o usuário disser coisas como "implementar", "criar feature", "adicionar funcionalidade", "construir tela", "fazer integração", "começar projeto", ou quando estiver iniciando trabalho de desenvolvimento. Esta skill garante que o que o terminal diz que foi feito corresponde ao que aparece na tela, eliminando o problema de features que existem no código mas não funcionam na prática.
---

# Claude Code SDD — Spec-Driven Development (Unificado)

Workflow completo que combina o SDD original (3 fases com /clear) com o Feature Workflow (TDD, git flow, E2E, PR com evidências). O resultado é um fluxo de 3 fases + 10 passos que garante qualidade de produção.

## Quando usar

Use em **toda implementação de funcionalidade nova**, sem exceção. A tentação de pular o processo "porque é simples" é a principal causa de travamentos.

## Princípio central

> A qualidade do output é diretamente proporcional à qualidade do input.

A janela de contexto deve operar idealmente em **menos de 50% de uso**. Acima disso, a qualidade do código degrada. Por isso o SDD usa `/clear` entre fases.

---

## Visão geral

```
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────────────┐
│  FASE 1 — PESQUISA   │ →  │   FASE 2 — SPEC      │ →  │   FASE 3 — IMPLEMENTAÇÃO     │
│                      │    │                      │    │                              │
│ 1. Leitura base      │    │ 3. Spec + critérios  │    │  5. Git flow                 │
│ 2. Pesquisa/PRD      │    │ 4. Revisão com user  │    │  6. Migrations               │
│                      │    │                      │    │  7. TDD (red→green→refactor)  │
│ Output: PRD.md       │    │ Output: Spec.md      │    │  8. Implementação             │
│                      │    │                      │    │  9. E2E + navegador           │
│ → /clear             │    │ → /clear             │    │ 10. PVO (build + visual)      │
└──────────────────────┘    └──────────────────────┘    │ 11. Commits atômicos          │
                                                        │ 12. Finalizar git flow + PR   │
                                                        │                              │
                                                        │ Output: Código + PR           │
                                                        └──────────────────────────────┘
```

---

## FASE 1 — PESQUISA

**Objetivo:** Entender o problema, o contexto e as ferramentas antes de escrever qualquer spec ou código.

### Passo 1 — Leitura obrigatória

Antes de qualquer coisa, leia:
- `CLAUDE.md` — stack, convenções, estrutura
- `docs/SPECS.md` — arquitetura, schema, padrões
- `docs/PRD.md` — contexto do produto
- `docs/DESIGN_SYSTEM.md` — tokens, componentes visuais

Se a feature envolve IA, leia também `docs/ECOSYSTEM-CLAUDE.md`.

### Passo 2 — Pesquisa e PRD

1. Pesquise padrões existentes no codebase (features similares, abstrações)
2. Se usa lib/API externa, busque documentação oficial atualizada
3. Gere o arquivo `docs/features/<nome-da-feature>/PRD.md` contendo:
   - Descrição do problema que resolve
   - Requisitos funcionais e não funcionais
   - Ferramentas/libs envolvidas
   - Riscos e dependências
   - Trechos relevantes de documentação externa

4. Apresente o PRD ao usuário para revisão
5. Ajuste conforme feedback

**Ao finalizar:** `/clear` para limpar contexto.

---

## FASE 2 — SPEC

**Objetivo:** Definir exatamente O QUE será implementado, arquivo por arquivo, antes de tocar no código.

### Passo 3 — Spec com critérios de aceite

Leia o PRD gerado na fase anterior e gere `docs/features/<nome-da-feature>/Spec.md` contendo:

1. **Arquitetura da feature:**
   - Tabelas/campos novos no banco (com SQL)
   - Services, hooks e componentes a criar
   - Edge Functions (se necessário)
   - Regras de negócio

2. **Lista de arquivos** que serão criados/modificados, com descrição do que cada um faz

3. **Critérios de aceite** (checkboxes):
   ```
   - [ ] Usuário consegue X
   - [ ] Validação de Y funciona
   - [ ] RLS impede acesso cross-tenant
   - [ ] Loading state visível
   - [ ] Error state com retry
   - [ ] Toast de sucesso/erro em mutations
   ```

4. **Referência cruzada:** Atualize `docs/SPECS.md` com link para o Spec da feature

### Passo 4 — Revisão com o usuário

- Apresente o Spec completo
- Aguarde aprovação antes de implementar
- Ajuste conforme feedback

**Ao finalizar:** `/clear` para limpar contexto.

---

## FASE 3 — IMPLEMENTAÇÃO

**Objetivo:** Implementar, testar, verificar e entregar com git flow completo.

### Passo 5 — Git flow

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<nome-da-feature>
```

### Passo 6 — Migrations (se necessário)

Se a feature requer mudanças no banco:
1. Crie `supabase/migrations/<NNN>_<nome>.sql`
2. Mostre o SQL completo para revisão antes de aplicar
3. Aguarde confirmação do usuário
4. Padrões obrigatórios:
   - RLS em todas as tabelas novas
   - Trigger `handle_updated_at()` para `updated_at`
   - Índices em `company_id`, FKs e campos de filtro
   - Policies: `company_isolation + super_admin`

### Passo 7 — TDD (red -> green -> refactor)

Para cada service, hook ou componente novo:

1. **Escreva os testes ANTES do código** em `src/<caminho>/<arquivo>.test.ts`
2. Rode para confirmar que falham (red): `npm run test:run`
3. Padrões mínimos:
   - **Services:** testa mapping, validação, edge cases
   - **Hooks:** estado inicial, loading, success, error
   - **Componentes:** renderiza, loading state, dados, interações

### Passo 8 — Implementação

Ordem obrigatória:
1. Types em `src/types/`
2. Service em `src/services/<feature>.service.ts`
3. Hooks em `src/hooks/use-<feature>.ts`
4. Componentes em `src/components/<feature>/`
5. Página em `src/pages/<feature>.tsx` (se necessário)
6. Rota em `src/App.tsx` (se necessário)
7. Menu em `src/components/layout/app-sidebar.tsx` (se necessário)
8. Edge Functions em `supabase/functions/` (se necessário)

Rode os testes para confirmar que passam (green): `npm run test:run`

Refatore mantendo os testes passando (refactor).

Padrões obrigatórios:
- Services filtram por `company_id`
- Hooks têm error handling com `toast.error`
- Skeleton loading em queries
- Error state com retry
- Optimistic updates em mutations críticas
- Design tokens (nunca cores hardcoded)
- Textos em português com acentos corretos

### Passo 9 — Testes E2E no navegador

1. Escreva testes E2E em `e2e/<feature>.spec.ts`:
   - Happy path completo
   - Validações de formulário
   - Error states
   - Navegação

2. **Teste manualmente no navegador** via Playwright MCP:
   - Navegue pelo fluxo completo
   - Verifique cada critério de aceite visualmente
   - Documente resultados (passou/falhou)

### Passo 10 — PVO (Protocolo de Verificação Obrigatório)

Nenhuma feature é considerada concluída sem:

1. `git diff --stat` — listar arquivos efetivamente modificados
2. `npm run build` — confirmar que o build passa
3. Verificação visual no navegador — critérios de aceite confirmados
4. **Nunca declarar "feito" antes do usuário confirmar visualmente**

### Passo 11 — Commits atômicos

Conventional commits:
- `feat:` nova feature
- `fix:` correção
- `test:` testes
- `chore:` config/deps
- `docs:` documentação
- `refactor:` sem mudança de comportamento

### Passo 12 — Finalizar git flow + PR

**Após todos os testes no navegador validados**, executar automaticamente (sem perguntar):

1. Atualizar Spec — marcar critérios de aceite como `[x]`
2. Merge feature -> develop (no-ff)
3. Push develop
4. Criar PR develop -> main com template:

```markdown
## Summary
<1-3 bullet points do que foi feito>

## Mudanças
- [ ] Migration: supabase/migrations/<NNN>_<nome>.sql
- [ ] Service: src/services/<feature>.service.ts
- [ ] Hook: src/hooks/use-<feature>.ts
- [ ] Componentes: src/components/<feature>/
- [ ] Página: src/pages/<feature>.tsx
- [ ] Edge Functions: supabase/functions/<função>/

## Testes
- [ ] Testes unitários passando (npm run test:run)
- [ ] Testes E2E passando
- [ ] Testado manualmente no navegador

## Critérios de aceite
<Copiar da spec com checkboxes marcados>

## Test plan
<Checklist dos testes realizados no navegador>
```

---

## Estrutura de arquivos por feature

```
docs/features/<nome-da-feature>/
├── PRD.md      <- gerado na Fase 1
├── Spec.md     <- gerado na Fase 2
└── notes.md    <- anotações durante implementação (opcional)
```

## Anti-padrões a combater

1. **Over-engineering** -> pesquise padrões simples antes
2. **Reinventar a roda** -> busque libs e padrões existentes
3. **Doc desatualizada** -> leia doc oficial atual antes de implementar
4. **Repetir código** -> pesquise na base antes
5. **God components** -> Spec define arquivo por arquivo
6. **Declarar feito sem estar feito** -> PVO + testes no navegador

## Ritual antes de começar

Antes de iniciar, confirme:
- [ ] A descrição do que quero está clara em uma frase?
- [ ] Sei quais ferramentas/libs externas estão envolvidas?
- [ ] O CLAUDE.md do projeto está atualizado?
- [ ] A janela de contexto está limpa? (`/clear` se necessário)

## Stack padrão

**Claude Code + Supabase + Vercel + GitHub**

Quando o projeto exigir ferramentas adicionais (Resend, Stripe, Z-API, etc.), busque a documentação oficial mais atual ANTES de implementar.
