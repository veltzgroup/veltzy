# Fase 3 — Implementação

## Objetivo

Executar a Spec gerando código de produção. A janela de contexto está limpa e dedicada exclusivamente à implementação. O Spec.md é o único guia.

## Como começar a Fase 3

Janela de contexto limpa (`/clear` ao final da Fase 2). Primeiro prompt:

> "Leia `docs/features/<nome>/Spec.md` e implemente exatamente o que está descrito. Siga a ordem de implementação. Para cada arquivo modificado, mostre o diff antes de aplicar. Ao final, aplique o Protocolo de Verificação Obrigatório."

## Regras durante a implementação

### 1. Ordem da Spec é lei

Se a Spec define uma ordem de implementação, seguir essa ordem. Não pular para a parte mais "interessante" ou "fácil". A ordem geralmente existe por causa de dependências (migration antes de tipos, tipos antes de código que usa os tipos, etc.).

### 2. Mostrar diffs antes de aplicar

Para cada arquivo, mostrar o que será modificado antes de aplicar. Isso permite revisão em tempo real e evita surpresas.

### 3. Não inventar arquivos não previstos

Se durante a implementação ficar claro que um arquivo não previsto na Spec precisa ser criado ou modificado, **parar e avisar**, não criar silenciosamente. Pode ser um sinal de que a Spec precisa ser refinada, ou pode ser uma adição legítima, mas a decisão é do usuário.

### 4. Não fazer melhorias não solicitadas

Se durante a implementação a IA notar código adjacente que "poderia ser melhor", deixar para depois. Misturar refactor com feature nova é a fonte número um de regressões. A regra é: cada Spec faz uma coisa.

### 5. Build local antes de declarar feito

Antes de qualquer "implementação concluída", rodar:

```bash
npm run build
```

Se o build falha, a feature não está pronta. Corrigir os erros primeiro.

### 6. Aplicar o Protocolo de Verificação Obrigatório

Ao terminar a implementação, executar o Protocolo de Verificação Obrigatório (PVO) descrito em `references/protocolo-verificacao.md`. Sem PVO, a feature não é considerada concluída.

## Comandos úteis durante a implementação

```bash
# Ver o que foi modificado
git status
git diff --stat

# Rodar localmente
npm run dev

# Build para garantir que não tem erro de tipo ou import
npm run build

# Tipos do Supabase atualizados (se houve migration)
npx supabase gen types typescript --project-id <ref> > src/types/database.ts
```

## Commit e deploy

Após o PVO passar:

```bash
git add .
git commit -m "feat: <descrição da feature>"
git push origin main
```

O Vercel fará o deploy automático. Acompanhar o build no painel do Vercel até o status ficar verde. Só então abrir a URL de produção e validar.

## O que fazer se algo der errado

### Build falha
1. Ler o erro completo, não só a primeira linha
2. Identificar o arquivo e a linha
3. Corrigir o erro específico
4. Rodar `npm run build` novamente
5. Repetir até passar

### Feature aparece mas não funciona
Esse é o cenário do problema de fidedignidade. Aplicar o PVO retroativamente:

1. Abrir o DevTools do navegador (Console + Network)
2. Reproduzir o erro
3. Capturar a mensagem de erro exata e os requests que falharam
4. Voltar para o Claude Code com essas informações específicas
5. Pedir correção baseada nos erros reais, não em hipóteses

### Algo foi modificado que não deveria
```bash
git diff <arquivo>           # ver o que mudou
git checkout <arquivo>       # reverter um arquivo específico
git restore --staged <arquivo>  # tirar do stage sem reverter
```

## Lembrete final

Se a janela de contexto ultrapassar 50% durante a implementação, considerar fazer `/clear` e retomar com o Spec.md como referência. A degradação de qualidade após esse ponto é real.
