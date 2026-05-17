# Fase 1 — Setup

## Objetivo

Instalar e configurar `react-i18next` no projeto Vite + React, com detecção automática de idioma, persistência em localStorage e estrutura de pastas pronta pra evoluir.

## Pré-requisitos

- Projeto Vite + React + TypeScript funcionando
- `package.json` saudável (build local passando)
- Supabase configurado se for usar persistência por usuário

## Passos

### 1. Instalar dependências

```bash
npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend
```

**O que cada pacote faz:**

- `i18next` — core do sistema de traduções
- `react-i18next` — bindings para React (hooks `useTranslation`, componente `Trans`)
- `i18next-browser-languagedetector` — detecta idioma do navegador automaticamente
- `i18next-http-backend` — carrega arquivos JSON de tradução sob demanda (lazy loading)

### 2. Criar estrutura de pastas

```bash
mkdir -p src/locales/pt src/locales/en src/locales/es
mkdir -p src/lib src/hooks
```

### 3. Criar arquivos JSON iniciais

Para cada idioma, criar pelo menos `common.json`:

`src/locales/pt/common.json`:
```json
{
  "actions": {
    "save": "Salvar",
    "cancel": "Cancelar",
    "delete": "Excluir",
    "edit": "Editar",
    "confirm": "Confirmar",
    "back": "Voltar",
    "next": "Próximo",
    "loading": "Carregando..."
  },
  "messages": {
    "success": "Operação realizada com sucesso",
    "error": "Algo deu errado. Tente novamente.",
    "empty": "Nenhum item encontrado",
    "required": "Campo obrigatório"
  }
}
```

`src/locales/en/common.json`:
```json
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "loading": "Loading..."
  },
  "messages": {
    "success": "Operation completed successfully",
    "error": "Something went wrong. Please try again.",
    "empty": "No items found",
    "required": "Required field"
  }
}
```

`src/locales/es/common.json`:
```json
{
  "actions": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "confirm": "Confirmar",
    "back": "Volver",
    "next": "Siguiente",
    "loading": "Cargando..."
  },
  "messages": {
    "success": "Operación realizada con éxito",
    "error": "Algo salió mal. Inténtalo de nuevo.",
    "empty": "No se encontraron elementos",
    "required": "Campo obligatorio"
  }
}
```

### 4. Criar configuração do i18n

`src/lib/i18n.ts`:
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptCommon from '../locales/pt/common.json';
import enCommon from '../locales/en/common.json';
import esCommon from '../locales/es/common.json';

export const SUPPORTED_LANGUAGES = ['pt', 'en', 'es'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { common: ptCommon },
      en: { common: enCommon },
      es: { common: esCommon },
    },
    fallbackLng: 'pt',
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'app-language',
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
```

### 5. Importar no entry point

`src/main.tsx`:
```typescript
import './lib/i18n'; // adicionar esta linha antes do render
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

### 6. Criar componente de toggle

`src/components/LanguageToggle.tsx`:
```typescript
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type SupportedLanguage } from '@/lib/i18n';

export function LanguageToggle() {
  const { i18n } = useTranslation();

  const handleChange = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  };

  return (
    <select
      value={i18n.language}
      onChange={(e) => handleChange(e.target.value as SupportedLanguage)}
      className="px-3 py-1 rounded border bg-background text-foreground"
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang} value={lang}>
          {LANGUAGE_LABELS[lang]}
        </option>
      ))}
    </select>
  );
}
```

Adicionar este componente no header do app.

### 7. Atualizar lang no <html>

`src/App.tsx`, dentro de um useEffect:
```typescript
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // resto do app
}
```

### 8. Criar tipos para autocomplete

`src/types/i18n.d.ts`:
```typescript
import 'i18next';
import common from '../locales/pt/common.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
    };
  }
}
```

Isso dá autocomplete para `t('actions.save')` no editor.

## Verificação

Após o setup:

1. `npm run build` — deve passar sem erros
2. `npm run dev` — abrir o app
3. Testar em um componente:
   ```tsx
   import { useTranslation } from 'react-i18next';

   function TestComponent() {
     const { t } = useTranslation();
     return <button>{t('actions.save')}</button>;
   }
   ```
4. Trocar idioma no toggle e verificar mudança
5. Recarregar a página e verificar que o idioma escolhido persistiu
6. Inspecionar o `<html>` e ver que o atributo `lang` reflete o idioma atual

## Critérios de pronto

- [ ] Dependências instaladas
- [ ] Pastas `src/locales/pt|en|es/` criadas
- [ ] Arquivo `common.json` criado nos 3 idiomas
- [ ] Configuração `src/lib/i18n.ts` criada
- [ ] Import adicionado em `main.tsx`
- [ ] Componente `LanguageToggle` criado e adicionado no header
- [ ] Build passa
- [ ] Toggle funciona e persiste após reload
- [ ] Atributo `lang` no `<html>` é atualizado

## Próxima fase

Após o setup, partir para a Fase 2 (Extração de strings) usando `/i18n-extract <feature>`.
