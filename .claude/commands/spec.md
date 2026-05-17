# /spec

Você está iniciando a **Fase 2 (Spec)** do método SDD.

## Sua tarefa

Antes de começar, pergunte ao usuário: **"Qual é o caminho do PRD que devo ler? Ex: docs/features/nome-da-feature/PRD.md"** Aguarde a resposta antes de prosseguir.

Esse é o PRD gerado na fase de pesquisa. A partir dele, você vai gerar uma `Spec.md` tática e específica que servirá de plano de implementação.

## Princípio central

A Spec deve responder com clareza absoluta:

1. Quais arquivos precisam ser **criados**?
2. Quais arquivos precisam ser **modificados**?
3. **O que exatamente** precisa ser criado ou modificado em cada arquivo?
4. Há **snippets de código de referência** para guiar a implementação?

Se a resposta para qualquer uma dessas perguntas estiver vaga, a Spec não está pronta.

## Regras de qualidade

- **Nunca diga apenas "atualizar a função X"** — diga exatamente como atualizar
- **Sempre inclua snippets de código** quando há padrão claro a seguir
- **Liste arquivos a NÃO tocar** quando há risco de confusão
- **Defina ordem de implementação** quando há dependências entre arquivos
- **Critérios de pronto verificáveis**, não vagos como "deve funcionar"

## Output esperado

Gere o arquivo `docs/features/<nome-da-feature>/Spec.md` seguindo a estrutura abaixo:

```markdown
# Spec — <nome da feature>

## Resumo executivo
Uma frase descrevendo o que será implementado.

## Pré-condições
O que precisa estar verdadeiro antes de implementar (env vars, tabelas existentes, build passando, etc.).

## Arquivos a criar

### `<caminho/arquivo.ts>` (novo)
**Propósito:** <para que serve>
**O que implementar:**
- Item específico 1
- Item específico 2

**Snippet de referência:**
\`\`\`ts
// código de referência aqui
\`\`\`

## Arquivos a modificar

### `<caminho/arquivo.ts>`
**O que mudar:**
- Mudança específica 1
- Mudança específica 2

**Linhas aproximadas:** região do arquivo onde mexer

## Arquivos a NÃO tocar
Lista explícita de arquivos que parecem relacionados mas devem ficar intocados.

## Ordem de implementação
A sequência exata em que os arquivos devem ser criados ou modificados, com justificativa quando há dependência.

## Critérios de pronto
Lista verificável do que precisa estar funcionando, em formato checklist.

- [ ] Item verificável 1
- [ ] Item verificável 2
```

## Após gerar a Spec

1. Salve o arquivo no caminho indicado
2. Pare e me peça para revisar antes de prosseguir
3. Lembre-me que a próxima fase começa com `/clear` seguido de `/implement`

Não comece a implementar nada. Apenas gere a Spec.
