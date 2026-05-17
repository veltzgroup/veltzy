---
name: multilanguage-setup
description: Implementa internacionalização (i18n) completa em apps React + Vite, com suporte a múltiplos idiomas, detecção automática do idioma do navegador, toggle manual e estrutura escalável de traduções. Use esta skill SEMPRE que o usuário quiser adicionar suporte a múltiplos idiomas em um projeto, traduzir um app existente, ou preparar um produto para mercados internacionais. Acione esta skill quando o usuário disser coisas como "multilanguage", "internacionalizar", "i18n", "traduzir o app", "suportar inglês e espanhol", "adicionar tradução", "preparar pra mercado externo", "vender lá fora". Esta skill cobre setup inicial, extração de strings, organização de traduções, persistência de preferência do usuário e fluxo opcional de tradução assistida por IA.
---

# Multilanguage Setup

Skill para implementar internacionalização (i18n) em apps React + Vite seguindo um padrão escalável e testado. Stack escolhida: `react-i18next` + detecção automática + organização modular por feature.

## Quando usar

Use esta skill em três cenários:

1. **Projeto novo** — adicionar suporte multilíngue desde o começo
2. **Projeto existente em PT** — extrair strings hardcoded e adicionar EN, ES, etc.
3. **Adicionar idioma novo** — projeto já tem i18n, falta acrescentar mais um

## Princípio central

> i18n não é só traduzir strings. É arquitetar o produto pra crescer em mercados.

Implementação ruim de i18n vira dívida técnica imediata: strings hardcoded misturadas com chaves traduzidas, idiomas que ficam desatualizados, formatos de data/número que não respeitam o locale. Esta skill estabelece um padrão que evita esses problemas desde o início.

## Stack e decisões arquiteturais

### Biblioteca: `react-i18next`

Escolha justificada:
- Ecossistema maduro, ampla documentação
- Wrapper oficial do `i18next` core
- Suporte nativo a detecção de idioma, lazy loading, pluralização
- Funciona com React + Vite sem configuração complexa

Alternativas consideradas e descartadas:
- `next-intl` → específico para Next.js, não é o caso aqui
- `formatjs/react-intl` → mais verboso, sintaxe ICU é overkill para a maioria dos casos
- Solução custom → reinventa a roda

### Detecção de idioma

Estratégia em três níveis, na ordem:

1. **Preferência salva** do usuário (localStorage)
2. **Idioma do navegador** (`navigator.language`)
3. **Fallback** para PT (idioma padrão do produto)

Toggle visível no header permite override manual a qualquer momento.

### Estrutura de traduções

Organização **por feature**, não por idioma:

```
src/locales/
├── pt/
│   ├── common.json       ← strings genéricas (botões, labels, mensagens comuns)
│   ├── auth.json         ← strings de login, cadastro, recuperação
│   ├── dashboard.json    ← strings do dashboard
│   └── <feature>.json
├── en/
│   ├── common.json
│   └── ...
└── es/
    ├── common.json
    └── ...
```

**Por que por feature:** quando você adiciona uma feature nova, só cria um arquivo novo. Quando refatora uma feature, só mexe nos arquivos dela. Evita arquivos gigantes e conflitos em PRs.

### Idiomas iniciais

- **PT** (português brasileiro) — `pt-BR`, idioma padrão
- **EN** (inglês) — `en-US`, mercado internacional
- **ES** (espanhol) — `es-ES`, mercado latam (Argentina, México, Chile, Colômbia, Espanha)

## As três fases da implementação

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 1. SETUP     │ →  │ 2. EXTRAÇÃO  │ →  │ 3. TRADUÇÃO  │
│              │    │              │    │              │
│ Instalar e   │    │ Identificar  │    │ Preencher    │
│ configurar   │    │ strings e    │    │ EN, ES e     │
│ react-i18next│    │ substituir   │    │ outros       │
│              │    │ por t('key') │    │ idiomas      │
└──────────────┘    └──────────────┘    └──────────────┘
```

Detalhe de cada fase em:
- `references/fase-1-setup.md`
- `references/fase-2-extracao.md`
- `references/fase-3-traducao.md`

## Comandos

A skill traz três slash commands:

- `/i18n-setup` — Fase 1: configura `react-i18next` no projeto
- `/i18n-extract <feature>` — Fase 2: extrai strings de uma feature e substitui por chaves
- `/i18n-translate <feature> <idiomas>` — Fase 3: gera traduções para os idiomas alvo

Os prompts canônicos estão em `assets/prompts/`.

## Estratégia de tradução

### Comece manual

Para o conteúdo inicial (telas principais, marketing, copy de produto), traduzir manualmente garante qualidade. Tradução automática em copy de marketing fica com "cara de Google Translate" e prejudica posicionamento, especialmente em B2B.

### Evolua para tradução assistida por IA

Quando o volume cresce, use o script em `assets/scripts/translate-with-claude.ts` que usa a Anthropic API para gerar primeiras versões em EN e ES a partir do PT. Você revisa o output e ajusta.

**Importante:** mesmo com IA, sempre revisar antes de subir. Termos técnicos do seu domínio, jargão de produto, e tom de voz não são traduzidos automaticamente com qualidade.

## Persistência da escolha do usuário

A preferência de idioma escolhida pelo usuário fica salva em duas camadas:

1. **localStorage** — para usuários não autenticados
2. **Coluna `preferred_language`** na tabela `profiles` do Supabase — para usuários autenticados

Sincronização: ao logar, lê do banco. Ao trocar idioma logado, escreve no banco. Ao deslogar, mantém localStorage.

Veja `references/persistencia.md` para o esquema completo.

## Cuidados específicos

### Formatos sensíveis a locale

Não basta traduzir strings. Estes precisam de tratamento separado:

- **Datas** — `25/04/2026` (PT) vs `04/25/2026` (EN-US) vs `25/04/2026` (ES)
- **Números** — `1.000,50` (PT) vs `1,000.50` (EN) vs `1.000,50` (ES)
- **Moedas** — `R$ 1.000,00` (BRL) vs `$1,000.00` (USD) vs `1.000,00 €` (EUR)
- **Pluralização** — regras diferentes por idioma (`1 lead` vs `2 leads`)

A skill usa `Intl.DateTimeFormat`, `Intl.NumberFormat` e a API de pluralização do `i18next`.

### Conteúdo dinâmico

Mensagens vindas do banco (descrições de produtos, posts, etc.) precisam de estratégia separada:

- **Tabela bilíngue** com colunas `name_pt`, `name_en`, `name_es`
- Ou tabela relacionada `translations` com FK + locale
- Ou serviço de tradução em runtime para conteúdo livre

Veja `references/conteudo-dinamico.md` para padrões e exemplos.

### SEO multilíngue

Para landing pages e marketing pages:

- Tags `hreflang` para indicar versões traduzidas
- URLs separadas por idioma (`/pt/sobre`, `/en/about`)
- Meta tags traduzidas (title, description)
- `lang` attribute no `<html>` atualizado dinamicamente

Veja `references/seo-multilingue.md`.

## Anti-padrões a evitar

1. **Strings hardcoded em componentes** — sempre `t('chave')`, nunca string literal
2. **Chaves vagas** — `t('button1')` é ruim, `t('auth.login.submit')` é bom
3. **Tradução literal de marketing** — copy de marketing pede transcriação, não tradução
4. **Esquecer locales nos formatos** — datas, números e moedas precisam respeitar o idioma
5. **Não testar com strings longas** — alemão é 30% mais longo que português, layout pode quebrar
6. **Misturar idiomas em um arquivo** — sempre um arquivo por idioma
7. **Carregar todos os idiomas de uma vez** — usar lazy loading, principalmente quando há muitos idiomas

## Estrutura final de arquivos

Após aplicar a skill completamente, o projeto terá:

```
src/
├── locales/                ← traduções por idioma e feature
│   ├── pt/
│   ├── en/
│   └── es/
├── lib/
│   └── i18n.ts             ← configuração do react-i18next
├── hooks/
│   └── useLocaleFormat.ts  ← hook para formatar datas, números, moedas
├── components/
│   └── LanguageToggle.tsx  ← componente de troca de idioma
└── types/
    └── i18n.d.ts           ← tipos TypeScript das chaves de tradução
```

## Referências

- `references/fase-1-setup.md` → instalação e configuração inicial
- `references/fase-2-extracao.md` → como extrair strings hardcoded
- `references/fase-3-traducao.md` → estratégias de tradução
- `references/persistencia.md` → sincronizar preferência usuário ↔ Supabase
- `references/conteudo-dinamico.md` → traduzir dados vindos do banco
- `references/seo-multilingue.md` → SEO para apps multilíngues
- `references/formatos-locale.md` → datas, números, moedas, pluralização
- `assets/prompts/` → os três prompts canônicos
- `assets/scripts/translate-with-claude.ts` → tradução assistida por IA
- `assets/templates/` → templates de configuração e arquivos JSON
