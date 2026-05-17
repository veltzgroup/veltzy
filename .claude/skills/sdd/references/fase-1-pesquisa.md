# Fase 1 — Pesquisa

## Objetivo

Reunir todo o contexto necessário para a IA fazer uma implementação correta, e filtrar para que apenas o relevante chegue à fase seguinte. A pesquisa pode trazer informação inútil, isso é esperado. O filtro acontece no momento de gerar o PRD.

## O que pesquisar

A fase de pesquisa tem três frentes obrigatórias:

### 1. Arquivos da base de código existente

Identificar:
- Quais arquivos serão afetados pela implementação
- Quais padrões de implementação semelhantes já existem no projeto e podem ser reaproveitados
- Quais componentes, hooks, utilitários ou tipos já existem e devem ser reutilizados em vez de duplicados

A IA deve abrir os arquivos e ler o conteúdo, não apenas listar nomes.

### 2. Documentações externas

Para qualquer biblioteca, framework ou serviço externo envolvido (Supabase, Vercel, GitHub Actions, Resend, Stripe, Z-API, Anthropic API, etc.), buscar a documentação oficial atualizada.

A regra crítica: **nunca confiar no conhecimento de treinamento da IA para detalhes de implementação de bibliotecas**. APIs mudam, parâmetros mudam, padrões de uso mudam. Sempre buscar a doc oficial atual via WebFetch ou MCP equivalente.

### 3. Padrões de implementação comprovados

Buscar exemplos de implementação que funcionam:
- Trechos da própria documentação oficial da biblioteca
- Exemplos no GitHub de projetos sérios usando a mesma stack
- Discussões no Stack Overflow para problemas específicos
- Templates oficiais da Vercel ou Supabase

Quando encontrar um padrão útil, copiar o snippet relevante para o PRD.

## Output: PRD.md

O PRD deve ser **enxuto, não exaustivo**. Inclui apenas o que será efetivamente útil para a fase de Spec. O objetivo é minimizar consumo de janela de contexto na fase seguinte.

### Estrutura recomendada do PRD

```markdown
# PRD — <nome da feature>

## Objetivo
Uma a duas frases descrevendo o que será implementado e por quê.

## Arquivos afetados
Lista dos arquivos da base de código que serão lidos, modificados ou referenciados,
com uma frase de contexto para cada.

- `src/lib/supabase/client.ts` — cliente Supabase já configurado, será reutilizado
- `src/components/AuthForm.tsx` — formulário existente que precisará de campo novo
- `src/types/database.ts` — tipos gerados do Supabase, podem precisar ser regenerados

## Documentação relevante
Links e resumos curtos. Se houver trechos críticos da doc, copiar literalmente
em blocos de código.

- Supabase Auth — confirmação por email
  https://supabase.com/docs/guides/auth/auth-email
  Trecho relevante: ...

## Padrões de implementação a seguir
Snippets de código que devem ser usados como referência. Sempre indicar a fonte.

```ts
// Fonte: doc oficial Supabase
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { emailRedirectTo: '<URL>' }
})
```

## Decisões técnicas
Qualquer escolha de arquitetura que a fase de Spec precisa respeitar.

- Email transacional via Resend, não SendGrid
- Tabela de profiles separada de auth.users
- RLS habilitado em todas as tabelas novas

## Fora de escopo
O que explicitamente NÃO será feito agora, mesmo que pareça relacionado.

- Login com Google (deixar para depois)
- Recuperação de senha (já existe, não tocar)
```

## Ritual ao final da Fase 1

1. Salvar o PRD em `docs/features/<nome-da-feature>/PRD.md`
2. Revisar pessoalmente o PRD antes de seguir
3. Se algo crítico está faltando, refazer a pesquisa antes de avançar
4. `/clear` para limpar a janela de contexto
5. Iniciar Fase 2

## Sinais de que a pesquisa foi mal feita

- O PRD tem mais de 500 linhas (provavelmente está cheio de ruído)
- O PRD não cita arquivos específicos do projeto, só conceitos genéricos
- Não há documentação oficial referenciada para nenhuma biblioteca externa
- Não há nenhum snippet de código de referência

Se algum desses for verdadeiro, vale refazer.
