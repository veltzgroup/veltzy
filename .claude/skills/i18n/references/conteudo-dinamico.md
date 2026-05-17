# Conteúdo dinâmico — traduzir dados do banco

## O problema

`react-i18next` resolve strings estáticas do código. Mas e quando o conteúdo vem do banco de dados? Nomes de produtos, descrições, posts, categorias, mensagens de templates — esses são dinâmicos e precisam de estratégia separada.

## Três padrões para escolher

A escolha depende do volume e fluxo de criação do conteúdo.

### Padrão 1: Colunas multilíngues na tabela

**Quando usar:** poucos idiomas (até 3), conteúdo controlado por administradores, lista pequena de campos traduzíveis.

**Exemplo:** Veltzy com produtos de M&A em PT, EN, ES.

#### Schema

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_pt TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  description_pt TEXT,
  description_en TEXT,
  description_es TEXT,
  price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Hook para uso

```typescript
import { useTranslation } from 'react-i18next';

type Product = {
  id: string;
  slug: string;
  name_pt: string;
  name_en?: string;
  name_es?: string;
  description_pt?: string;
  description_en?: string;
  description_es?: string;
};

export function useLocalizedProduct(product: Product) {
  const { i18n } = useTranslation();
  const lang = i18n.language as 'pt' | 'en' | 'es';

  return {
    ...product,
    name: product[`name_${lang}`] || product.name_pt,
    description: product[`description_${lang}`] || product.description_pt,
  };
}
```

#### Vantagens
- Simples de implementar
- Query rápida (uma linha por registro)
- Fácil de editar em painel admin

#### Desvantagens
- Ficar adicionando colunas pra cada idioma novo
- Tabelas com muitos campos traduzíveis ficam largas
- Migrations toda vez que adiciona idioma

### Padrão 2: Tabela `translations` separada

**Quando usar:** muitos idiomas, muitos campos por entidade, conteúdo gerado por usuários.

**Exemplo:** plataforma de cursos com aulas em vários idiomas, ou sistema de blog multilíngue.

#### Schema

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('pt', 'en', 'es')),
  name TEXT NOT NULL,
  description TEXT,
  UNIQUE (product_id, locale)
);

CREATE INDEX idx_product_translations_lookup
ON product_translations(product_id, locale);
```

#### Query típica

```typescript
const { data } = await supabase
  .from('products')
  .select(`
    id,
    slug,
    price,
    translations:product_translations!inner (
      locale,
      name,
      description
    )
  `)
  .eq('product_translations.locale', i18n.language);
```

#### Vantagens
- Adicionar idioma é só inserir registros (sem migration)
- Tabela principal fica enxuta
- Suporta n idiomas com mesmo schema

#### Desvantagens
- Queries mais complexas (joins)
- Precisa de fallback em código se idioma não tem registro
- Painel admin mais elaborado para editar

### Padrão 3: Tradução em runtime via API

**Quando usar:** conteúdo gerado por usuários em volume alto, como mensagens, comentários, descrições livres.

**Exemplo:** chat multilíngue, plataforma social, marketplace.

#### Funcionamento

1. Conteúdo é salvo no idioma original (uma só coluna)
2. Quando exibido para usuário em outro idioma, traduz on-the-fly
3. Cache do resultado pra não traduzir novamente

#### Implementação

```typescript
// Edge Function: translate-content
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

async function translate(text: string, fromLocale: string, toLocale: string) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Traduza o texto abaixo de ${fromLocale} para ${toLocale}. Mantenha o tom e o significado. Retorne apenas a tradução, sem explicações.\n\nTexto: ${text}`,
    }],
  });

  return message.content[0].type === 'text' ? message.content[0].text : '';
}
```

#### Cache

Salvar traduções em uma tabela:

```sql
CREATE TABLE translation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text_hash TEXT NOT NULL,
  source_locale TEXT NOT NULL,
  target_locale TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (source_text_hash, source_locale, target_locale)
);
```

Antes de chamar API:
1. Hash do texto original
2. Buscar na cache
3. Se existe, usar
4. Se não, traduzir, salvar na cache, retornar

#### Vantagens
- Suporta qualquer volume de conteúdo
- Não precisa esforço humano de tradução
- Funciona pra n idiomas

#### Desvantagens
- Custo de API (tem que monitorar)
- Latência (cache resolve recorrente)
- Qualidade variável (revisar para conteúdo crítico)
- Não usar pra marketing ou copy de produto

## Combinação dos padrões

Em projetos reais, é comum combinar:

- **Padrão 1** para entidades de admin (produtos, categorias, planos)
- **Padrão 2** para conteúdo editorial (artigos, posts, FAQs)
- **Padrão 3** para conteúdo de usuário (comentários, mensagens, descrições livres)

## Recomendação para Veltzy

Considerando que Veltzy é SaaS B2B com conteúdo controlado:

- **Páginas de marketing** → arquivos JSON da skill (estrutura de `react-i18next`)
- **Produtos e planos** → Padrão 1 (colunas multilíngues)
- **Templates de mensagens (WhatsApp, e-mail)** → Padrão 2 (tabela separada)
- **Mensagens geradas pelo SDR IA** → Padrão 3 (runtime, com cache)

## Fallback é obrigatório

Em todos os padrões, sempre ter fallback. Se a tradução em EN não existe, mostra PT. Se PT não existe, mostra string vazia ou placeholder. Nunca mostrar erro pro usuário.

```typescript
const localizedName = product[`name_${lang}`]
  || product.name_pt
  || 'Sem nome'; // último fallback
```

## Verificação

Para qualquer padrão escolhido:

- [ ] Schema definido e aplicado no Supabase
- [ ] RLS apropriada (admins editam, usuários leem)
- [ ] Tipos atualizados em `src/types/database.ts`
- [ ] Hook ou função de localização implementado
- [ ] Fallback para idioma não disponível
- [ ] Cache se for runtime
- [ ] Painel admin pra editar (se aplicável)
- [ ] Teste com idioma faltando confirma que fallback funciona
