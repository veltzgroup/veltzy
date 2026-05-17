# Fase 2 — Extração

## Objetivo

Identificar todas as strings hardcoded em uma feature e substituí-las por chamadas `t('chave')` apropriadas, criando o arquivo JSON de tradução correspondente em PT.

## Princípio central

> Faça uma feature de cada vez, não o app inteiro.

Tentar extrair strings do app inteiro de uma vez gera caos. Pegue uma feature (autenticação, dashboard, onboarding), termine ela completamente, vá pra próxima.

## Processo

### 1. Inventariar strings da feature

Antes de mexer, listar todos os arquivos da feature e identificar:

- Texto visível em JSX (`<button>Salvar</button>`)
- Atributos com texto (`placeholder="Digite seu email"`)
- Strings em props (`title="Confirmar exclusão"`)
- Mensagens em `toast.success(...)`, `alert(...)`, etc.
- Mensagens de validação (`"Campo obrigatório"`)
- Strings em variáveis e constantes

Não esquecer:
- Mensagens de erro vindas de catch
- Textos em arrays de configuração
- Aria labels e textos de acessibilidade
- Textos em tooltips e popovers

### 2. Definir convenção de nomenclatura

Chaves devem seguir o padrão:

```
<feature>.<contexto>.<elemento>
```

Exemplos:
```
auth.login.title
auth.login.submit
auth.login.errors.invalidCredentials
auth.signup.title
auth.signup.fields.email
auth.signup.fields.password
auth.signup.fields.passwordHint
dashboard.welcome.greeting
dashboard.metrics.totalLeads
dashboard.metrics.qualifiedLeads
```

Regras de nomenclatura:
- camelCase para chaves
- Prefixo da feature sempre presente
- Agrupar por contexto (login, signup, errors, fields, actions)
- Reusar chaves de `common.json` para coisas genéricas

### 3. Criar arquivo JSON da feature em PT

Para a feature de autenticação:

`src/locales/pt/auth.json`:
```json
{
  "login": {
    "title": "Entrar na sua conta",
    "subtitle": "Acesse o painel da sua empresa",
    "fields": {
      "email": "E-mail",
      "password": "Senha",
      "rememberMe": "Lembrar de mim"
    },
    "submit": "Entrar",
    "forgotPassword": "Esqueci minha senha",
    "noAccount": "Não tem conta?",
    "signupLink": "Cadastre-se",
    "errors": {
      "invalidCredentials": "E-mail ou senha incorretos",
      "tooManyAttempts": "Muitas tentativas. Aguarde alguns minutos.",
      "networkError": "Erro de conexão. Verifique sua internet."
    }
  },
  "signup": {
    "title": "Criar conta",
    "fields": {
      "name": "Nome completo",
      "email": "E-mail profissional",
      "password": "Senha",
      "passwordHint": "Mínimo 8 caracteres, com letras e números"
    },
    "submit": "Criar conta",
    "hasAccount": "Já tem conta?",
    "loginLink": "Entrar",
    "errors": {
      "emailInUse": "Este e-mail já está cadastrado",
      "weakPassword": "Senha muito fraca"
    }
  }
}
```

### 4. Registrar o namespace no i18n.ts

`src/lib/i18n.ts`:
```typescript
import ptCommon from '../locales/pt/common.json';
import ptAuth from '../locales/pt/auth.json';
// ... imports en e es

i18n.init({
  resources: {
    pt: { common: ptCommon, auth: ptAuth },
    en: { common: enCommon, auth: enAuth },
    es: { common: esCommon, auth: esAuth },
  },
  ns: ['common', 'auth'],
  defaultNS: 'common',
  // ... resto da config
});
```

### 5. Substituir strings nos componentes

Padrão de substituição:

**Antes:**
```tsx
function LoginForm() {
  return (
    <form>
      <h1>Entrar na sua conta</h1>
      <p>Acesse o painel da sua empresa</p>
      <label>E-mail</label>
      <input type="email" placeholder="seu@email.com" />
      <label>Senha</label>
      <input type="password" />
      <button type="submit">Entrar</button>
      <a href="/forgot">Esqueci minha senha</a>
    </form>
  );
}
```

**Depois:**
```tsx
import { useTranslation } from 'react-i18next';

function LoginForm() {
  const { t } = useTranslation('auth');
  return (
    <form>
      <h1>{t('login.title')}</h1>
      <p>{t('login.subtitle')}</p>
      <label>{t('login.fields.email')}</label>
      <input type="email" placeholder={t('login.fields.email')} />
      <label>{t('login.fields.password')}</label>
      <input type="password" />
      <button type="submit">{t('login.submit')}</button>
      <a href="/forgot">{t('login.forgotPassword')}</a>
    </form>
  );
}
```

### 6. Casos especiais

#### Strings com variáveis (interpolação)

JSON:
```json
{
  "welcome": "Bem-vindo, {{name}}!"
}
```

Uso:
```tsx
<h1>{t('welcome', { name: user.name })}</h1>
```

#### Strings com formatação rica (negrito, links)

Use o componente `<Trans>`:

JSON:
```json
{
  "tos": "Ao continuar, você aceita os <strong>termos de serviço</strong>."
}
```

Uso:
```tsx
import { Trans } from 'react-i18next';

<Trans i18nKey="tos" components={{ strong: <strong /> }} />
```

Para links:
```json
{
  "agreement": "Concordo com os <link>termos</link>."
}
```

```tsx
<Trans
  i18nKey="agreement"
  components={{
    link: <a href="/terms" className="underline" />
  }}
/>
```

#### Pluralização

JSON:
```json
{
  "leadsCount_one": "{{count}} lead",
  "leadsCount_other": "{{count}} leads"
}
```

Uso:
```tsx
<p>{t('leadsCount', { count: leadsTotal })}</p>
```

A i18next escolhe a forma certa automaticamente baseada no número e idioma.

#### Mensagens de toast

```tsx
import { toast } from 'sonner'; // ou outra lib
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('auth');

  const handleSave = async () => {
    try {
      await saveData();
      toast.success(t('common:messages.success'));
    } catch (error) {
      toast.error(t('login.errors.networkError'));
    }
  };
}
```

Note o `common:messages.success` — sintaxe pra acessar outro namespace.

### 7. Manter EN e ES vazios temporariamente

Não traduzir manualmente nesta fase. Criar `src/locales/en/auth.json` e `src/locales/es/auth.json` com a **mesma estrutura** mas com valores em inglês ou espanhol simples (ou até cópias do PT como placeholder). A Fase 3 cuida da tradução real.

Estrutura mínima válida:
```json
{
  "login": {
    "title": "Sign in to your account",
    "subtitle": "Access your company panel"
  }
}
```

## Verificação após extração

- [ ] Nenhuma string hardcoded resta na feature (busca por texto literal não acha mais)
- [ ] Todas as chaves usadas em `t(...)` existem no JSON
- [ ] Nenhuma chave duplicada entre `common` e a feature
- [ ] Build passa sem erros de TypeScript
- [ ] App roda e exibe textos corretamente em PT
- [ ] Trocando para EN/ES, os textos placeholder aparecem (não erro de chave faltando)
- [ ] Estados de erro, loading e empty também foram traduzidos

## Sinais de extração mal feita

- Strings hardcoded escondidas em condicionais ou ternários
- Chaves muito genéricas tipo `t('text1')` ou `t('label')`
- Mensagens de erro de catch ainda em português
- Aria labels esquecidos
- Strings concatenadas (`"Olá " + name + ", bem-vindo"`) — usar interpolação
- Pluralização feita manualmente com if/else

## Próxima fase

Com a estrutura PT pronta e as chaves usadas, partir para Fase 3 (Tradução) usando `/i18n-translate <feature> <idiomas>`.
