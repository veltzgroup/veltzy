# /implement

Você está iniciando a **Fase 3 (Implementação)** do método SDD.

## Sua tarefa

Antes de começar, pergunte ao usuário: **"Qual é o caminho da Spec que devo implementar? Ex: docs/features/nome-da-feature/Spec.md"** Aguarde a resposta antes de prosseguir.

Essa é a Spec gerada na fase anterior. Você vai executar a Spec exatamente como descrita, gerando código de produção. A janela de contexto está dedicada exclusivamente a isso.

## Regras durante a implementação

### 1. Ordem da Spec é lei
Se a Spec define uma ordem de implementação, siga essa ordem. Não pule para a parte mais "interessante" ou "fácil". A ordem geralmente existe por causa de dependências.

### 2. Mostre diffs antes de aplicar
Para cada arquivo, mostre o que será modificado antes de aplicar. Isso permite revisão em tempo real.

### 3. Não invente arquivos não previstos
Se durante a implementação ficar claro que um arquivo não previsto na Spec precisa ser criado ou modificado, **pare e avise**, não crie silenciosamente. Pode ser que a Spec precise refinamento.

### 4. Não faça melhorias não solicitadas
Se notar código adjacente que "poderia ser melhor", deixe para depois. Cada Spec faz uma coisa só.

### 5. Build local antes de declarar feito
Antes de qualquer "implementação concluída":

\`\`\`bash
npm run build
\`\`\`

Se o build falha, a feature não está pronta. Corrija os erros primeiro.

## Protocolo de Verificação Obrigatório (PVO)

Ao terminar a implementação, execute o PVO. Sem PVO, a feature **não é considerada concluída**.

### Nível 1 — Verificação de arquivos
Mostre a saída de:

\`\`\`bash
git status
git diff --stat
\`\`\`

E confirme:
- Quais arquivos foram criados (`??` ou `A`)
- Quais arquivos foram modificados (`M`)
- Se algum arquivo previsto na Spec NÃO aparece, justifique ou corrija

### Nível 2 — Verificação de build
Mostre a saída completa de `npm run build`. Não dizer apenas "passou".

### Nível 3 — Instruções de verificação visual local
Forneça instruções específicas para o usuário, no formato:

\`\`\`
1. Rode \`npm run dev\`
2. Abra http://localhost:3000/<rota-específica>
3. Verifique se você vê:
   - <elemento específico 1>
   - <elemento específico 2>
4. Clique em <elemento> e verifique se acontece <comportamento>
5. Abra DevTools (Console) e confirme que não há erros vermelhos
\`\`\`

Não vale "verifique se está funcionando". Tem que ser específico.

### Nível 4 — Cenários de comportamento a testar
Liste os cenários que o usuário deve testar, com input esperado e output esperado para cada.

### Nível 5 — Verificação em produção
Após push para main e deploy do Vercel, instrua o usuário a:

1. Acompanhar o build no painel do Vercel até ficar verde
2. Abrir a URL de produção (não localhost)
3. Repetir os cenários do Nível 4
4. Confirmar que tudo funciona idêntico ao local

## Linguagem que você deve usar

❌ NUNCA: "Feito!", "Implementação completa.", "Tudo funcionando."

✅ SEMPRE: "Implementação aplicada. Por favor verifique o Nível 3 antes de considerar pronto."

## Quando algo der errado

Se o usuário reportar divergência ("isso não está aparecendo"):

1. Não defenda o que foi feito. A percepção do usuário é a verdade.
2. Peça informações específicas: URL exata, screenshot, console do navegador (erros em vermelho), Network tab (requests que falharam)
3. Investigue com base nos dados reais, não em hipóteses
4. Reaplique o PVO após a correção

## Lembrete

Se a janela de contexto ultrapassar 50% durante a implementação, considere fazer `/clear` e retomar com a Spec como referência. A degradação após esse ponto é real.
