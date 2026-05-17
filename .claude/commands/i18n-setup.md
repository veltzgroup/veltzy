# /i18n-setup

Você está executando a **Fase 1 (Setup)** da skill `multilanguage-setup`.

## Sua tarefa

Configurar `react-i18next` no projeto atual (Vite + React + TypeScript), seguindo o padrão definido na skill.

## Antes de começar

Leia o arquivo `references/fase-1-setup.md` da skill para conhecer todos os passos detalhados.

## Passos a executar

Execute na ordem, mostrando o progresso a cada etapa:

### 1. Validar pré-requisitos
- [ ] Confirme que o projeto é Vite + React + TypeScript
- [ ] Confirme que o build local passa antes de começar (`npm run build`)
- [ ] Identifique o entry point (geralmente `src/main.tsx`)
- [ ] Identifique o componente do header (para adicionar o toggle)

### 2. Instalar dependências

```bash
npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend
```

### 3. Criar estrutura de pastas

```bash
mkdir -p src/locales/pt src/locales/en src/locales/es
mkdir -p src/lib src/hooks src/types
```

### 4. Criar arquivos JSON iniciais

Para cada idioma (pt, en, es), criar `common.json` com strings genéricas. Use o conteúdo definido em `references/fase-1-setup.md` como base, mas adapte ao tom do projeto se necessário.

### 5. Criar configuração do i18n

Criar `src/lib/i18n.ts` exportando:
- Configuração inicializada
- Constante `SUPPORTED_LANGUAGES`
- Tipo `SupportedLanguage`
- Constante `LANGUAGE_LABELS`

Use o template de `references/fase-1-setup.md`.

### 6. Adicionar import no entry point

Adicionar `import './lib/i18n';` no topo de `src/main.tsx`, antes de outros imports.

### 7. Criar componente LanguageToggle

Criar `src/components/LanguageToggle.tsx` seguindo o padrão da skill. Adaptar estilo ao design system do projeto (shadcn/ui, classes Tailwind existentes, etc.).

### 8. Adicionar toggle ao header

Identificar o componente do header e inserir `<LanguageToggle />` em local apropriado.

### 9. Atualizar atributo lang do HTML

No `src/App.tsx` ou layout principal, adicionar useEffect que atualiza `document.documentElement.lang` quando o idioma muda.

### 10. Criar tipos TypeScript

Criar `src/types/i18n.d.ts` com a declaração de módulo do i18next para autocomplete de chaves.

## Aplicar PVO ao final

Aplicar o **Protocolo de Verificação Obrigatório** (da skill `claude-code-sdd`):

### Nível 1 — Arquivos
Mostre `git status` e `git diff --stat`.

### Nível 2 — Build
Rodar `npm run build` e mostrar saída completa.

### Nível 3 — Verificação visual local
Instruir o usuário:

```
1. Rode `npm run dev`
2. Abra http://localhost:<porta>
3. Verifique que o app carrega sem erros no console
4. Localize o LanguageToggle no header
5. Troque entre PT, EN e ES
6. Confirme que ao trocar para EN os botões com textos comuns mudam
7. Recarregue a página e confirme que o idioma escolhido persistiu
8. Inspecione o `<html>` e confirme que o atributo `lang` reflete o idioma
```

### Nível 4 — Cenários
Listar:
- Cenário A: usuário entra pela primeira vez → idioma do navegador é detectado
- Cenário B: usuário troca para EN no toggle → idioma muda imediatamente
- Cenário C: usuário recarrega página → idioma EN persiste

## Linguagem que você deve usar

Nunca:
- "Pronto!"
- "Setup completo."

Sempre:
- "Setup aplicado. Por favor verifique o Nível 3 antes de prosseguir."

## Após o setup

Lembre o usuário:

> Setup concluído. Próximo passo: extrair strings de uma feature específica usando `/i18n-extract <nome-da-feature>`. Recomendo começar pela tela mais visível ou pela landing page principal.

Não começar a extrair strings nesta sessão. Setup é setup.
