# /i18n-translate

Você está executando a **Fase 3 (Tradução)** da skill `multilanguage-setup`.

## Sua tarefa

Antes de começar, pergunte ao usuário: **"Qual feature traduzir e para quais idiomas? Ex: auth en es — ou dashboard en"** Aguarde a resposta antes de prosseguir.

## Pré-requisitos

- A Fase 2 (`/i18n-extract`) já foi executada para esta feature
- `src/locales/pt/<feature>.json` existe e está completo
- Arquivos placeholder em EN/ES já existem com estrutura

Se algum desses não estiver pronto, pare e oriente.

## Antes de começar

Leia `references/fase-3-traducao.md` da skill para conhecer estratégias e cuidados.

## Pergunta inicial ao usuário

Pergunte qual modo prefere:

```
Modo de tradução:
1. Manual — você traduz, eu te ajudo com sugestões
2. Assistida por IA — uso a Anthropic API para gerar primeiras versões
3. Híbrido — IA gera primeira versão, você revisa e ajusta antes de salvar
```

Se o usuário não tiver `ANTHROPIC_API_KEY` configurada e escolher 2 ou 3, oriente a configurar antes.

## Modo 1: Manual

### Processo

Para cada idioma alvo:

1. Abrir `src/locales/pt/<feature>.json` como referência
2. Abrir `src/locales/<idioma>/<feature>.json` para preencher
3. Para cada chave, perguntar ao usuário a tradução desejada
4. Sugerir uma tradução baseada no contexto, mas deixar usuário decidir

Cuidados a aplicar:
- Manter estrutura JSON idêntica ao PT
- Variáveis `{{var}}` aparecem na tradução
- Pluralização `_one`/`_other` consistente
- Marcar copy de marketing para revisão especial (pede transcriação, não tradução)

## Modo 2 e 3: Assistida por IA

### Setup da chave

Confirmar que `ANTHROPIC_API_KEY` está em `.env.local`. Se não estiver, orientar:

```bash
# Adicionar em .env.local
ANTHROPIC_API_KEY=sk-ant-...
```

E garantir que está em `.gitignore`.

### Configurar contexto do produto

Antes de chamar a API, perguntar ao usuário:

```
Para tradução de qualidade, preciso de contexto:
1. Que tipo de produto é este? (ex: "SaaS B2B de SDR com IA para PMEs")
2. Qual é o tom desejado? (ex: formal/informal, técnico/comercial)
3. Há termos que NÃO devem ser traduzidos? (nomes de marca, termos técnicos)
4. Há um glossário de termos do domínio com tradução fixa?
```

Salvar as respostas em `src/locales/.translation-context.md` para reuso futuro.

### Executar tradução

Para cada idioma alvo:

1. Ler PT
2. Construir prompt para Claude com:
   - Contexto do produto
   - Glossário se houver
   - Instrução de manter estrutura JSON, placeholders, e formato
   - JSON em PT como input
3. Chamar Anthropic API (modelo Sonnet 4 ou superior)
4. Receber JSON traduzido
5. Validar:
   - Estrutura JSON é válida
   - Todas as chaves do PT estão presentes
   - Placeholders `{{var}}` foram preservados
6. Salvar em `src/locales/<idioma>/<feature>.json`

Se for modo 3 (Híbrido), apresentar a tradução ao usuário antes de salvar e permitir ajustes.

### Script de referência

Existe um script em `assets/scripts/translate-with-claude.ts` da skill. Você pode usá-lo como base ou implementar inline.

## Validações pós-tradução

Independente do modo, executar:

### Estrutura

Comparar chaves entre PT e idioma traduzido:
```typescript
function getKeys(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null
      ? getKeys(value, fullKey)
      : [fullKey];
  });
}

const ptKeys = getKeys(pt);
const enKeys = getKeys(en);
const missing = ptKeys.filter(k => !enKeys.includes(k));
```

Reportar chaves faltantes ou extras.

### Placeholders

Para cada string, verificar que todos os `{{var}}` do PT aparecem na tradução. Se faltar, alertar.

### Comprimento

Avisar quando uma tradução é muito mais longa que o PT (potencial problema de layout):
- EN > PT * 1.5 → atenção
- ES > PT * 1.3 → atenção

## Aplicar PVO ao final

### Nível 1 — Arquivos
`git status` e `git diff` dos arquivos JSON.

### Nível 2 — Build
`npm run build`.

### Nível 3 — Verificação visual
Instruir:

```
1. Rode `npm run dev`
2. Para cada idioma traduzido (<idiomas>):
   a. Troque para o idioma no toggle
   b. Navegue por todas as telas da feature <feature>
   c. Verifique que NENHUM texto está em PT
   d. Verifique que botões e CTAs cabem nos seus containers
   e. Verifique que strings com variáveis (ex: "Olá, João") funcionam
3. Em particular, teste fluxos completos (não só telas estáticas)
```

### Nível 4 — Cenários por idioma
Para cada idioma traduzido, listar 3 cenários a testar:
- Cenário A: tela principal da feature
- Cenário B: estado de erro / validação
- Cenário C: estado de sucesso / após ação

## Linguagem que você deve usar

Nunca:
- "Tradução completa!"
- "Tudo pronto."

Sempre:
- "Tradução aplicada para <N> idiomas. Recomendo revisar especialmente o copy de marketing antes de publicar."
- "Por favor verifique o Nível 3 e me retorne se encontrar layout quebrado em algum idioma."

## Após a tradução

Lembrar o usuário:

> Tradução concluída. Próximos passos sugeridos:
> 1. Revisão humana do copy de marketing (especialmente CTAs)
> 2. Teste visual em mobile (idiomas mais longos podem quebrar layout)
> 3. Se há SEO envolvido, atualizar `src/locales/<idioma>/seo.json` também
> 4. Repetir o processo para próxima feature: `/i18n-extract <outra-feature>`

## Para Veltzy especificamente

Considerando que Veltzy é SaaS B2B em PT-BR com expansão para EN e ES:

- ES → priorizar `usted` (formal) ao invés de `tú` (informal)
- EN → tom direto e profissional, evitar gírias
- Termos do domínio (SDR, IA, Lead, Pipeline) → manter em inglês mesmo em PT, são termos consagrados
- Veltzy → nunca traduzir, é nome da marca
