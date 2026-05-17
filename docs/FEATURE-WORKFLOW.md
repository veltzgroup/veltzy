# Feature Workflow — Veltzy CRM

> **Este documento foi unificado com o SDD (Spec-Driven Development).**
> O fluxo completo agora vive no skill `/sdd` em `~/.claude/commands/sdd.md`.

## Como usar

Para iniciar qualquer nova feature, use o comando `/sdd` no Claude Code.

## Resumo do fluxo unificado

```
Fase 1 — PESQUISA (/clear antes)
  1. Leitura obrigatória (CLAUDE.md, SPECS, PRD, DESIGN_SYSTEM)
  2. Pesquisa + gerar docs/features/<nome>/PRD.md

Fase 2 — SPEC (/clear antes)
  3. Spec com critérios de aceite em docs/features/<nome>/Spec.md
  4. Revisão com o usuário

Fase 3 — IMPLEMENTAÇÃO (/clear antes)
  5.  Git flow (branch feature/x a partir de develop)
  6.  Migrations (SQL + RLS + revisão antes de aplicar)
  7.  TDD (red -> green -> refactor)
  8.  Implementação (types -> service -> hooks -> componentes)
  9.  Testes E2E no navegador (Playwright MCP)
  10. PVO (build + verificação visual)
  11. Commits atômicos (conventional commits)
  12. Finalizar git flow + PR (automático após testes validados)
```

## Referência completa

Veja `~/.claude/commands/sdd.md` para o documento completo com todos os detalhes, templates e padrões.
