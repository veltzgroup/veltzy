# /audit

Você está executando uma **auditoria de completude de feature** seguindo a skill `feature-completeness-audit`.

## Sua tarefa

Antes de começar, pergunte ao usuário: **"Qual área ou feature você quer auditar? Ex: dashboard, pagina-pipeline, fluxo-onboarding, demo-completa"** Aguarde a resposta antes de prosseguir.

Você vai executar uma varredura sistemática em cinco dimensões e produzir um relatório acionável em `docs/audits/<area>-<data-yyyy-mm-dd>.md`.

## Regras de execução

### 1. Subir o ambiente local
Antes de qualquer auditoria, garanta que o app está rodando localmente. Audit sem app rodando é exercício de imaginação, não auditoria.

### 2. Não confiar em auto-audit
Você não vai apenas ler arquivos e declarar OK. Você vai usar ferramentas reais: `git status`, `npm run build`, abrir páginas no navegador (via instruções para o usuário), checar o Supabase Dashboard, conferir logs.

### 3. Auditar uma área de cada vez
Se a área dada for muito ampla, peça pro usuário restringir. Auditoria boa é profunda, não larga.

### 4. Cada gap precisa de evidência
Não vale "parece que está faltando X". Vale "abri a rota Y e o botão Z não fez nada, console mostrou erro W".

## As cinco dimensões

Para cada uma, leia o reference correspondente da skill e aplique o checklist:

1. **Funcional** → `references/dim-1-funcional.md`
2. **Dados** → `references/dim-2-dados.md`
3. **Integrações** → `references/dim-3-integracoes.md`
4. **UX/Visual** → `references/dim-4-ux-visual.md`
5. **Comercial** → `references/dim-5-comercial.md`

## Estrutura do relatório

Salve em `docs/audits/<area>-<yyyy-mm-dd>.md` seguindo o template em `assets/templates/audit-report.template.md`.

A estrutura mínima é:

```markdown
# Auditoria — <área> — <data>

## Sumário executivo
- Status geral: 🔴 / 🟠 / 🟡 / 🟢
- Gaps críticos: <n>
- Gaps altos: <n>
- Gaps médios: <n>
- Gaps baixos: <n>
- Pode mostrar pra cliente? Sim / Não / Com ressalvas
- Pode entrar em produção? Sim / Não / Com ressalvas

## Inventário
Lista do que foi auditado: rotas, tabelas, integrações, telas.

## Achados por dimensão

### Dimensão 1 — Funcional
- 🔴 [Crítico] <descrição do gap>
  - Arquivo: <path>
  - Reprodução: <passos>
  - Ação recomendada: <o que fazer>
- 🟠 [Alto] ...
- 🟡 [Médio] ...

### Dimensão 2 — Dados
...

### Dimensão 3 — Integrações
...

### Dimensão 4 — UX/Visual
...

### Dimensão 5 — Comercial
...

## Plano de ataque sugerido
Ordem priorizada de correção, agrupando gaps relacionados.

1. <gap crítico ou bloco de gaps>
2. <próximo>
3. ...

## Resposta à pergunta final
"Em uma frase, qual é o motivo pelo qual o cliente vai pagar por isso?"
<resposta>
```

## Severidades

- 🔴 **Crítico** — impede uso ou demonstração; corrigir antes de qualquer outra coisa
- 🟠 **Alto** — funciona mas com fricção visível; cliente vai notar
- 🟡 **Médio** — gap real mas tolerável a curto prazo; corrigir antes de produção
- 🟢 **Baixo** — polish; pode entrar em backlog

## Linguagem que você deve usar

❌ NUNCA: "tudo certo", "funciona perfeitamente", "não vejo problemas"

✅ SEMPRE: "verifiquei e encontrei <X>", "o gap mais sério é <Y>", "o que está bom é <Z>"

Honestidade brutal sobre gaps é o valor desta skill. Auditoria que vira tapinha nas costas é inútil.

## Quando o usuário interage

O usuário vai precisar:
1. Confirmar que o ambiente local está rodando
2. Abrir páginas específicas que você indicar e reportar o que vê
3. Confirmar dados no Supabase Dashboard
4. Compartilhar logs quando relevante

Não execute a auditoria pulando essas confirmações. Você precisa dos dados reais que só o usuário tem acesso.

## Após gerar o relatório

1. Salve em `docs/audits/<area>-<data>.md`
2. Apresente o sumário executivo no chat
3. Pergunte se o usuário quer entrar em qualquer gap específico em mais detalhe
4. Sugira o próximo passo (corrigir os críticos primeiro? gerar Specs para correção?)

Não tente corrigir os gaps na mesma sessão da auditoria. O propósito da skill é diagnóstico. Correção é outra fase, com `/spec` e `/implement` se necessário.
