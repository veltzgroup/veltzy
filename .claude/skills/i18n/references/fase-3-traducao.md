# Fase 3 — Tradução

## Objetivo

Preencher os arquivos JSON em EN, ES (e outros idiomas) com traduções de qualidade para uma feature já extraída.

## Princípio central

> Tradução automática gera primeira versão. Revisão humana garante qualidade.

A skill suporta dois modos: tradução manual e tradução assistida por IA. Comece com o que faz sentido pro volume e estágio do produto.

## Quando usar tradução manual

Tradução manual é melhor quando:

- Volume baixo (até ~50 chaves por idioma)
- Conteúdo de marketing ou copy de alta importância
- Termos de domínio específicos do seu negócio (ex.: "SDR IA", "valuation múltiplos")
- Tom de voz único da marca
- Você ou alguém do time domina os idiomas alvo

## Quando usar tradução assistida por IA

Tradução assistida funciona bem quando:

- Volume alto (centenas ou milhares de chaves)
- Conteúdo funcional padrão (botões, labels, mensagens de sistema)
- Você precisa de primeira versão rápida pra revisar
- Você revisa cada output antes de subir

**Importante:** mesmo com IA, sempre revisar. Termos do seu domínio, jargão de produto e nuances culturais não são automatizados com qualidade total.

## Modo 1: Tradução manual

### Processo

1. Abrir `src/locales/pt/<feature>.json` lado a lado com `src/locales/en/<feature>.json`
2. Para cada chave em PT, preencher a versão EN
3. Repetir para ES
4. Salvar e testar trocando idiomas no app

### Boas práticas

**Mantenha a estrutura idêntica entre idiomas.** Se em PT você tem:
```json
{ "auth": { "login": { "title": "..." } } }
```

Em EN também precisa ser:
```json
{ "auth": { "login": { "title": "..." } } }
```

Adicionar novas chaves em um idioma e esquecer no outro causa fallback silencioso.

**Considere o comprimento do texto.** Algumas traduções são muito mais longas que o original:

- Português → Inglês: geralmente 10-20% mais curto
- Português → Espanhol: comprimento similar
- Português → Alemão: 30-40% mais longo

Strings que ficam apertadas em botões podem quebrar layout em outros idiomas. Sempre testar visualmente.

**Use transcriação para marketing.** Tradução literal de copy de marketing fica fraca. Em vez disso, recrie a mensagem no idioma alvo mantendo intenção e tom:

- ❌ Tradução literal: "Discover the maximum potential of your business"
- ✅ Transcriação: "Unlock your business's full potential"

**Cuidado com placeholders e interpolações.** As variáveis precisam aparecer na tradução:

PT:
```json
{ "welcome": "Olá, {{name}}!" }
```

EN correto:
```json
{ "welcome": "Hello, {{name}}!" }
```

EN errado (variável esquecida):
```json
{ "welcome": "Hello!" }
```

## Modo 2: Tradução assistida por IA

### Como funciona

O script `assets/scripts/translate-with-claude.ts` lê um arquivo JSON em PT, manda para a Anthropic API, e gera versões em EN e ES.

### Pré-requisito

API key da Anthropic configurada:

```bash
# .env.local (não versionar)
ANTHROPIC_API_KEY=sk-ant-...
```

### Uso

```bash
# Traduzir um arquivo específico
npx tsx scripts/translate-with-claude.ts src/locales/pt/auth.json en es

# Output: cria src/locales/en/auth.json e src/locales/es/auth.json
```

### O que o script faz

1. Lê o JSON em PT
2. Constrói prompt para Claude com contexto do produto
3. Pede tradução de cada string mantendo:
   - Estrutura JSON exata
   - Placeholders ({{name}}, {{count}}) intactos
   - Tom e formalidade
4. Recebe JSON traduzido e salva no caminho correspondente
5. Reporta strings traduzidas e potenciais avisos

### Configuração de contexto

O script usa um prompt template em `assets/prompts/translation-context.md` que você pode customizar com:

- Domínio do produto (ex.: "SaaS B2B para PMEs", "plataforma de governança corporativa")
- Tom desejado (formal, informal, técnico, comercial)
- Termos que NÃO devem ser traduzidos (nomes próprios, marcas)
- Glossário de termos do seu domínio com tradução fixa

Quanto melhor o contexto, melhor a tradução.

### Sempre revisar

Mesmo com IA boa, revisar:

1. Termos técnicos do seu domínio
2. Tom de voz consistente
3. Plurais e gêneros gramaticais
4. Mensagens de erro (precisão é crítica)
5. CTAs (chamadas pra ação) — copy importante demais

Marcar com `<!-- REVISAR -->` ao lado de strings duvidosas e voltar nelas.

## Workflow recomendado

Para uma feature nova:

1. Extrair strings em PT (Fase 2)
2. Rodar tradução assistida via script
3. Revisar EN e ES, ajustar termos do domínio
4. Testar visualmente trocando idiomas no app
5. Validar layout em strings mais longas
6. Commit e deploy

Para uma string nova adicionada em uma feature já traduzida:

1. Adicionar em `pt/<feature>.json`
2. Adicionar manualmente em `en/<feature>.json` e `es/<feature>.json`
3. (Opcional) Rodar script só para essa chave

## Manter idiomas em sincronia

Quando uma string PT muda, as traduções precisam ser atualizadas. Estratégias:

### Estratégia 1: Marcar como desatualizado

Adicionar prefixo `[OUTDATED]` nas strings traduzidas que precisam revisão:

```json
{
  "title": "[OUTDATED] Sign in to your account"
}
```

Buscar por `[OUTDATED]` antes de cada release.

### Estratégia 2: Script de validação

Rodar script que compara estrutura entre idiomas:

```bash
npx tsx scripts/validate-translations.ts
```

Reporta:
- Chaves presentes em PT mas faltando em EN ou ES
- Chaves presentes em EN/ES mas não em PT (provavelmente lixo)
- Diferenças estruturais

Veja `assets/scripts/validate-translations.ts`.

### Estratégia 3: i18n-ally (extensão VS Code)

A extensão `i18n-ally` no VS Code mostra todas as chaves traduzidas, marca chaves faltantes em vermelho, permite editar lado a lado. Recomendado.

## Casos especiais por idioma

### Inglês
- "Você" não existe — usar "you" para tudo
- Datas: `MM/DD/YYYY` (US), `DD/MM/YYYY` (UK)
- Moeda: `$1,000.00`
- Pluralização simples: 1 vs 2+

### Espanhol
- Distinção `tú` (informal) vs `usted` (formal). Para B2B, usar `usted` é mais seguro.
- Datas: `DD/MM/YYYY`
- Moeda: depende do país (`€` Espanha, `$` México/Argentina, etc.)
- Gênero gramatical: muitas palavras mudam de masculino/feminino

### Português brasileiro vs Português europeu
Não confundir. PT-BR usa gerúndios diferentes ("estou fazendo" vs "estou a fazer"), vocabulário diferente ("celular" vs "telemóvel"). Para Veltzy, focar em PT-BR.

## Verificação após tradução

- [ ] Estrutura JSON idêntica entre os 3 idiomas
- [ ] Nenhuma chave com placeholder esquecido
- [ ] Build passa
- [ ] App roda e exibe textos corretamente nos 3 idiomas
- [ ] Layout não quebra em strings mais longas
- [ ] CTAs e copy de marketing foram revisados (não literal)
- [ ] Termos do domínio do produto estão consistentes

## Quando adicionar um quarto idioma depois

Para adicionar francês, alemão ou outro idioma futuramente:

1. Criar pasta `src/locales/<codigo>/`
2. Adicionar ao `SUPPORTED_LANGUAGES` em `src/lib/i18n.ts`
3. Adicionar ao `LANGUAGE_LABELS`
4. Importar e registrar no `i18n.init()` resources
5. Rodar tradução assistida ou manual para todos os arquivos da pasta `pt/`

A skill é desenhada pra isso ser tranquilo.
