# Fase 2 — Spec

## Objetivo

Transformar o PRD em um plano tático de implementação, arquivo por arquivo. A Spec funciona como o briefing definitivo que a fase de implementação irá seguir. Quanto mais específica a Spec, menos liberdade a IA tem de "implementar do jeito dela", e mais previsível o resultado.

## Princípio central

A Spec deve responder com clareza absoluta:

1. **Quais arquivos precisam ser criados?**
2. **Quais arquivos precisam ser modificados?**
3. **O que exatamente precisa ser criado ou modificado em cada arquivo?**
4. **Há snippets de código de referência para guiar a implementação?**

Se a resposta para qualquer uma dessas perguntas for vaga, a Spec não está pronta.

## Como começar a Fase 2

A janela de contexto deve estar limpa (`/clear` foi feito ao final da Fase 1). O primeiro prompt referencia o PRD gerado:

> "Leia `docs/features/<nome>/PRD.md` e gere uma Spec detalhada seguindo o padrão definido na skill claude-code-sdd."

A IA recebe o PRD com toda a pesquisa já filtrada e produz a Spec.

## Estrutura recomendada da Spec.md

```markdown
# Spec — <nome da feature>

## Resumo executivo
Uma frase descrevendo o que será implementado.

## Pré-condições
O que precisa estar verdadeiro antes de implementar.

- Variável `RESEND_API_KEY` configurada no `.env.local`
- Tabela `profiles` existente no Supabase
- Build passando antes de começar

## Arquivos a criar

### `src/app/api/auth/verify/route.ts` (novo)
**Propósito:** endpoint de verificação de email
**O que implementar:**
- Função `GET` que recebe `token` via query string
- Validar token contra tabela `email_verifications`
- Atualizar coluna `email_verified` em `profiles`
- Redirecionar para `/dashboard?verified=true` ou `/error?reason=invalid_token`

**Snippet de referência:**
```ts
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  // ...
}
```

## Arquivos a modificar

### `src/components/AuthForm.tsx`
**O que mudar:**
- Adicionar prop `onVerificationNeeded?: () => void`
- Após `signUp` bem sucedido, chamar `onVerificationNeeded` se fornecida
- NÃO redirecionar automaticamente, deixar que o componente pai decida

**Linhas aproximadas:** próximo da função `handleSubmit`, linha ~45

### `src/lib/supabase/migrations/<timestamp>_add_email_verification.sql`
**O que adicionar:**
```sql
ALTER TABLE profiles ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
CREATE TABLE email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
```

## Arquivos a NÃO tocar
Lista explícita de arquivos que parecem relacionados mas devem ficar intocados.

- `src/components/LoginForm.tsx` — não confundir com `AuthForm`
- `src/lib/auth/legacy.ts` — em deprecação, não reutilizar nem mexer

## Ordem de implementação
A sequência exata em que os arquivos devem ser criados ou modificados.

1. Migration SQL primeiro (rodar no Supabase antes de prosseguir)
2. Tipos atualizados (`npm run gen-types`)
3. Endpoint de verificação
4. Modificação no `AuthForm`
5. Página de erro `/error`
6. Build local e teste manual

## Critérios de pronto
Lista verificável do que precisa estar funcionando.

- [ ] Migration aplicada no Supabase (verificar via dashboard)
- [ ] `npm run build` passa sem erros
- [ ] Cadastro de novo usuário envia email
- [ ] Clique no link do email leva ao endpoint correto
- [ ] Coluna `email_verified` é atualizada no banco
- [ ] Usuário verificado é redirecionado para dashboard
- [ ] Token inválido leva à página de erro
```

## Regras de qualidade da Spec

1. **Nunca apenas "atualizar a função X"** — sempre dizer exatamente como atualizar
2. **Sempre incluir snippets de código quando há padrão claro a seguir**
3. **Listar arquivos a NÃO tocar** quando há risco de confusão
4. **Definir ordem de implementação** quando há dependências entre arquivos
5. **Critérios de pronto verificáveis**, não vagos como "deve funcionar"

## Ritual ao final da Fase 2

1. Salvar a Spec em `docs/features/<nome-da-feature>/Spec.md`
2. Revisar manualmente: a Spec descreve com precisão o que você quer?
3. Se algum arquivo crítico foi omitido, ajustar antes de prosseguir
4. `/clear`
5. Iniciar Fase 3

## Sinais de que a Spec foi mal feita

- Frases genéricas como "criar o componente de autenticação"
- Falta indicação de QUAL arquivo modificar para uma mudança
- Critérios de pronto vagos ou ausentes
- Nenhum snippet de código de referência

Se algum desses for verdadeiro, refazer ou pedir refinamento antes de implementar.
