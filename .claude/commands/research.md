# /research

Você está iniciando a **Fase 1 (Pesquisa)** do método SDD (Spec-Driven Development).

## Sua tarefa

Antes de começar, pergunte ao usuário: **"O que você precisa implementar? Descreva a feature ou funcionalidade."** Aguarde a resposta antes de prosseguir.

Antes de qualquer linha de código, você vai fazer uma pesquisa abrangente em três frentes e gerar um arquivo `PRD.md` que servirá de input para a próxima fase.

## Frente 1 — Base de código existente

Analise a base de código atual e identifique:

1. Quais arquivos serão afetados por essa implementação (criados ou modificados)
2. Quais padrões similares já existem no projeto e podem ser reaproveitados
3. Quais componentes, hooks, utilitários ou tipos já existem que devem ser reutilizados (e NÃO recriados)

Abra os arquivos relevantes e leia o conteúdo. Não basta listar nomes.

## Frente 2 — Documentação externa

Para cada biblioteca, framework ou serviço externo envolvido (Supabase, Vercel, Resend, Stripe, Z-API, Anthropic API, etc.):

1. Identifique a doc oficial mais atualizada
2. Use WebFetch para buscar os trechos relevantes da implementação que vamos fazer
3. Copie literalmente os snippets de código oficiais que servirão de referência

**Regra crítica:** não confie em conhecimento de treinamento para detalhes de implementação. Sempre busque a doc atual.

## Frente 3 — Padrões de implementação comprovados

Busque exemplos de implementação que comprovadamente funcionam:

- Trechos da própria doc oficial da biblioteca
- Exemplos de projetos sérios no GitHub usando a mesma stack
- Discussões no Stack Overflow para problemas específicos
- Templates oficiais (Vercel, Supabase, etc.)

Quando encontrar um padrão útil, copie o snippet relevante para o PRD com link da fonte.

## Output esperado

Gere o arquivo `docs/features/<nome-da-feature>/PRD.md` seguindo a estrutura abaixo. Seja **enxuto**, não exaustivo. Inclua apenas o que será efetivamente útil para a fase de Spec.

```markdown
# PRD — <nome da feature>

## Objetivo
Uma a duas frases descrevendo o que será implementado e por quê.

## Arquivos afetados
Lista dos arquivos da base de código que serão lidos, modificados ou referenciados, com uma frase de contexto para cada.

## Documentação relevante
Links e resumos curtos. Trechos críticos da doc copiados literalmente em blocos de código, com URL da fonte.

## Padrões de implementação a seguir
Snippets de código que devem ser usados como referência. Sempre indicar a fonte.

## Decisões técnicas
Qualquer escolha de arquitetura que a fase de Spec precisa respeitar.

## Fora de escopo
O que explicitamente NÃO será feito agora, mesmo que pareça relacionado.
```

## Após gerar o PRD

1. Salve o arquivo no caminho indicado
2. Pare e me peça para revisar antes de prosseguir
3. Lembre-me que a próxima fase começa com `/clear` seguido de `/spec`

Não comece a implementar nada. Não gere Spec ainda. Apenas pesquise e produza o PRD.
