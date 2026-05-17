# Protocolo de Verificação Obrigatório (PVO)

## Por que esse protocolo existe

O problema mais sério observado em sessões com Claude Code é a **discrepância entre o que o terminal diz e o que aparece na tela**. Páginas declaradas como criadas mas que não existem. Configurações que faltam opções. Design system aplicado de forma incompleta. Botões que estão visualmente lá mas não funcionam.

A causa raiz é simples: a IA conclui a tarefa quando o código foi escrito, sem verificar se o código produz o efeito desejado. O PVO existe para corrigir isso.

## Princípio central

**Nada é considerado pronto sem prova material.** Não basta a IA dizer "feito". É preciso evidência verificável.

## Os cinco níveis de verificação

Toda implementação deve passar por estes cinco níveis, na ordem. Pular qualquer um aumenta o risco de declarar pronto algo que não está.

### Nível 1 — Verificação de arquivos

A IA deve apresentar:

```bash
git status
git diff --stat
```

E confirmar explicitamente:
- Quais arquivos foram criados (devem ter status `??` ou `A`)
- Quais arquivos foram modificados (status `M`)
- Quais arquivos NÃO foram tocados, apesar de estarem na Spec (justificar)

Se a Spec previa modificar `AuthForm.tsx` e o `git status` não mostra esse arquivo como modificado, **a feature não está pronta**, independentemente do que a IA disse.

### Nível 2 — Verificação de build

```bash
npm run build
```

Deve passar sem erros. Erros de TypeScript, imports quebrados, variáveis indefinidas, qualquer coisa que falhe aqui significa código que não vai funcionar em produção.

A IA deve mostrar a saída do build, não apenas dizer "passou".

### Nível 3 — Verificação visual local

A IA deve fornecer instruções específicas para o usuário verificar visualmente:

```
1. Rode `npm run dev`
2. Abra http://localhost:3000/<rota-específica>
3. Verifique se você vê:
   - <elemento específico 1>
   - <elemento específico 2>
4. Clique em <elemento> e verifique se acontece <comportamento esperado>
5. Abra DevTools (Console) e confirme que não há erros vermelhos
```

Não vale "verifique se está funcionando". Tem que ser específico, com URL exata, elementos esperados e ações testáveis.

### Nível 4 — Verificação de comportamento

Para features com lógica de negócio, a IA deve listar os cenários a testar:

```
Cenário 1: Cadastro com email novo
- Preencher formulário com email <X>
- Submeter
- Esperado: receber email em até 30 segundos
- Esperado: tabela `email_verifications` ter novo registro
- Verificar no Supabase Dashboard

Cenário 2: Token inválido
- Acessar /api/auth/verify?token=invalido
- Esperado: redirecionamento para /error?reason=invalid_token
- Esperado: nada modificado no banco
```

Se um cenário falha, a feature não está pronta.

### Nível 5 — Verificação em produção

Após push para main e deploy do Vercel:

1. Acompanhar o build no painel do Vercel até ficar verde
2. Abrir a URL de produção (não localhost)
3. Repetir os cenários do Nível 4
4. Confirmar que tudo funciona idêntico ao local

Só após o Nível 5 passar a feature é considerada concluída.

## Linguagem que a IA deve usar

A IA deve **nunca** usar linguagem que afirma conclusão sem prova:

❌ "Feito!"
❌ "Implementação completa."
❌ "Tudo funcionando."
❌ "Pronto para uso."

A IA deve **sempre** usar linguagem que solicita verificação:

✅ "Implementação aplicada. Por favor verifique o Nível 3 antes de considerar pronto."
✅ "Build passou. Aguardando sua verificação visual."
✅ "Deploy concluído no Vercel. Você pode confirmar na URL <X>?"

## Quando o usuário reporta divergência

Se o usuário diz "isso não está aparecendo", a IA deve:

1. **Não defender** o que foi feito. A percepção do usuário é a verdade.
2. Pedir informações específicas:
   - URL exata onde testou
   - Screenshot ou descrição do que vê
   - Console do navegador (erros em vermelho)
   - Network tab (requests que falharam)
3. Investigar com base nos dados, não em hipóteses
4. Reaplicar o PVO após a correção

## Auto-auditoria não substitui verificação real

Um anti-padrão comum: a IA "audita o próprio trabalho" lendo os arquivos e declara que está correto. Isso não é verificação real. Ler o código não prova que ele funciona. Apenas a execução real prova.

A regra é: **só o usuário pode validar o Nível 3 e acima**, porque só o usuário tem acesso ao navegador, ao DevTools, ao app rodando.

## Resumo do PVO

| Nível | O que verifica | Quem executa |
|-------|----------------|--------------|
| 1 | Arquivos certos foram tocados | Claude Code (com `git status`) |
| 2 | Build passa sem erros | Claude Code (com `npm run build`) |
| 3 | Visual local correto | Usuário (no navegador) |
| 4 | Comportamento correto | Usuário (testando cenários) |
| 5 | Funciona em produção | Usuário (na URL do Vercel) |

Sem os cinco níveis, a feature **não está pronta**, mesmo que pareça pronta.
