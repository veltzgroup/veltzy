# /i18n-extract

Você está executando a **Fase 2 (Extração)** da skill `multilanguage-setup`.

## Sua tarefa

Antes de começar, pergunte ao usuário: **"Qual feature você quer extrair strings? Ex: auth, dashboard, landing, onboarding"** Aguarde a resposta antes de prosseguir.

E substituí-las por chamadas `t('chave')` apropriadas, criando o arquivo JSON de tradução em PT.

## Pré-requisitos

- A Fase 1 (`/i18n-setup`) já foi executada
- `src/lib/i18n.ts` está configurado
- O componente `LanguageToggle` está funcionando

Se algum desses não estiver pronto, pare e oriente o usuário a rodar `/i18n-setup` primeiro.

## Antes de começar

Leia `references/fase-2-extracao.md` da skill para entender o processo completo, convenções de nomenclatura e casos especiais.

## Passos a executar

### 1. Inventariar arquivos da feature

Identifique todos os arquivos da feature dada. Por exemplo, para "auth":
- `src/components/auth/*`
- `src/pages/login.tsx`
- `src/pages/signup.tsx`
- `src/hooks/useAuth.ts` (se tiver mensagens)
- `src/lib/auth/*` (se tiver mensagens)

Se a feature dada for ambígua, pergunte ao usuário antes de prosseguir.

### 2. Listar todas as strings encontradas

Para cada arquivo, liste:
- Texto JSX (`<button>Salvar</button>`)
- Atributos (`placeholder="..."`, `title="..."`, `aria-label="..."`)
- Strings em variáveis (`const message = "..."`)
- Mensagens de erro (`throw new Error("...")`)
- Toasts e alerts
- Strings de validação

Apresente a lista para o usuário antes de modificar arquivos.

### 3. Definir nomenclatura das chaves

Seguindo a convenção da skill: `<feature>.<contexto>.<elemento>`.

Exemplos para feature "auth":
- `auth.login.title`
- `auth.login.fields.email`
- `auth.login.errors.invalidCredentials`
- `auth.signup.title`

Apresente a estrutura proposta ao usuário antes de criar o JSON.

### 4. Criar arquivo JSON em PT

Criar `src/locales/pt/<feature>.json` com todas as chaves identificadas.

Cuidados:
- Estrutura aninhada por contexto
- camelCase nas chaves
- Sem conflitos com `common.json`
- Variáveis com sintaxe `{{variavel}}`

### 5. Registrar namespace no i18n.ts

Editar `src/lib/i18n.ts` para incluir o novo namespace:

```typescript
import pt<Feature> from '../locales/pt/<feature>.json';
// ... outros imports

i18n.init({
  resources: {
    pt: { common: ptCommon, <feature>: pt<Feature> },
    en: { common: enCommon, <feature>: en<Feature> },
    es: { common: esCommon, <feature>: es<Feature> },
  },
  ns: ['common', '<feature>'],
  // resto da config
});
```

### 6. Substituir strings nos componentes

Para cada arquivo, mostrar diff antes de aplicar:

```tsx
// Antes
function LoginForm() {
  return <button>Entrar</button>;
}

// Depois
import { useTranslation } from 'react-i18next';

function LoginForm() {
  const { t } = useTranslation('<feature>');
  return <button>{t('login.submit')}</button>;
}
```

Cuidados especiais:
- Strings com variáveis → interpolação `t('key', { name: 'João' })`
- Strings com formatação → componente `<Trans>`
- Pluralização → chaves `_one` e `_other`
- Mensagens de toast → garantir que toast aceita string
- Aria labels → não esquecer

### 7. Criar arquivos placeholder em EN e ES

Criar `src/locales/en/<feature>.json` e `src/locales/es/<feature>.json` com a **mesma estrutura** em PT, com valores temporários (pode copiar PT, ou colocar versões inglês/espanhol simples).

A tradução real virá em `/i18n-translate`.

## Aplicar PVO ao final

### Nível 1 — Arquivos
Mostre `git status` e `git diff --stat`.

Confirme:
- `src/locales/pt/<feature>.json` criado
- `src/locales/en/<feature>.json` e `src/locales/es/<feature>.json` criados
- `src/lib/i18n.ts` atualizado
- Arquivos da feature modificados (lista esperada vs lista real)

### Nível 2 — Build
Rodar `npm run build`. Apontar erros de chave faltante ou import quebrado.

### Nível 3 — Verificação visual
Instruir:

```
1. Rode `npm run dev`
2. Navegue até as telas da feature <feature>
3. Verifique que tudo aparece em PT corretamente
4. Troque para EN no toggle
5. Verifique que aparece o placeholder em EN (estrutura presente, pode estar em PT temporário)
6. Verifique que NENHUM texto aparece como [object Object] ou chave em vez de tradução
7. Abra o console e confirme que não há warnings de "key not found" ou similar
```

### Nível 4 — Cenários
- Cenário A: usuário em PT vê tudo correto na feature
- Cenário B: usuário troca para EN, todos os textos da feature mudam (ainda que para placeholder)
- Cenário C: usuário recarrega, idioma persiste

## Linguagem que você deve usar

Nunca:
- "Extração completa!"
- "Tudo traduzido."

Sempre:
- "Extração aplicada. <N> strings foram extraídas. Por favor verifique o Nível 3 antes de prosseguir."
- "Os arquivos EN e ES estão com placeholder. A tradução real virá com `/i18n-translate`."

## Após a extração

Lembrar o usuário:

> Extração concluída. Estrutura PT pronta com <N> chaves. Próximo passo: gerar traduções em EN e ES com `/i18n-translate <feature> en es`. Você pode escolher fazer manual ou usar tradução assistida por IA.

Não traduzir nesta sessão. Extração é extração.

## Sinais de extração mal feita

Se identificar qualquer um destes ao final, refaça:
- Strings hardcoded ainda restantes na feature
- Chaves duplicadas com `common.json`
- Chaves muito genéricas (`text1`, `label`, `msg`)
- Mensagens de catch ainda em português
- Aria labels esquecidos
- Strings concatenadas sem interpolação
