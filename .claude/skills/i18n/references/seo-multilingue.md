# SEO multilíngue

## O problema

Tradução só funciona para usuários se o Google e outros buscadores conseguirem encontrar e indexar as versões em cada idioma. SEO multilíngue exige cuidados específicos que vão além de traduzir strings.

## Quando aplicar

Aplicar este reference quando o projeto tem:

- Landing pages públicas (não atrás de login)
- Marketing pages, blog, páginas institucionais
- Conteúdo que precisa ser encontrado via busca orgânica

Para o app autenticado (dashboard, painel), SEO não é prioridade. Mas pra Veltzy ter presença internacional, landing pages multilíngue é crítico.

## Estratégia de URLs

### Opção recomendada: subpath por idioma

```
veltzy.com/pt/sobre
veltzy.com/en/about
veltzy.com/es/sobre-nosotros
```

**Vantagens:**
- Um só domínio (autoridade SEO concentrada)
- URLs explicitamente diferentes para cada idioma
- Funciona com Vercel sem configuração extra

**Como implementar:**

`src/App.tsx` com React Router:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/pt" replace />} />

        <Route path="/pt/*" element={<LocalizedRoutes locale="pt" />} />
        <Route path="/en/*" element={<LocalizedRoutes locale="en" />} />
        <Route path="/es/*" element={<LocalizedRoutes locale="es" />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function LocalizedRoutes({ locale }: { locale: string }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="sobre" element={<About />} />
      <Route path="precos" element={<Pricing />} />
      {/* outras rotas */}
    </Routes>
  );
}
```

### Opção alternativa: query string

```
veltzy.com/sobre?lang=pt
veltzy.com/sobre?lang=en
```

**Não recomendado** — Google trata como mesma página, dilui SEO.

### Opção alternativa: subdomínio

```
pt.veltzy.com
en.veltzy.com
```

**Funciona, mas mais complexo.** Cada subdomínio é tratado como site separado, autoridade não compartilha.

## Tags hreflang

Indicam para o Google que existem versões alternativas da página em outros idiomas. Sem isso, o Google pode mostrar versão errada para usuário errado.

### Implementação

Componente `src/components/Hreflang.tsx`:
```tsx
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

export function Hreflang() {
  const { pathname } = useLocation();
  const baseUrl = 'https://veltzy.com';

  // Remove o prefixo de idioma atual da rota
  const pathWithoutLocale = pathname.replace(/^\/(pt|en|es)/, '');

  return (
    <Helmet>
      <link rel="alternate" hrefLang="pt" href={`${baseUrl}/pt${pathWithoutLocale}`} />
      <link rel="alternate" hrefLang="en" href={`${baseUrl}/en${pathWithoutLocale}`} />
      <link rel="alternate" hrefLang="es" href={`${baseUrl}/es${pathWithoutLocale}`} />
      <link rel="alternate" hrefLang="x-default" href={`${baseUrl}/pt${pathWithoutLocale}`} />
    </Helmet>
  );
}
```

Adicionar `<Hreflang />` no layout principal.

`x-default` indica qual versão mostrar quando o idioma do usuário não está disponível.

### Sintaxe correta

- `pt` → genérico para português
- `pt-BR` → específico para Brasil
- `pt-PT` → específico para Portugal
- `en` → genérico para inglês
- `en-US` → específico para EUA
- `en-GB` → específico para Reino Unido

Usar genérico (`pt`, `en`, `es`) é suficiente na maioria dos casos. Específico só quando você tem versões realmente diferentes.

## Meta tags traduzidas

Title e description precisam estar no idioma da página. Traduzir manualmente — esses campos são SEO crítico.

### Implementação

`src/locales/pt/seo.json`:
```json
{
  "home": {
    "title": "Veltzy — SDR IA para empresas que querem vender mais",
    "description": "Plataforma de SDR com IA que qualifica leads e agenda reuniões automaticamente. Para PMEs que querem escalar vendas sem aumentar equipe."
  },
  "pricing": {
    "title": "Planos e preços — Veltzy",
    "description": "Conheça os planos do Veltzy. Comece grátis e escale conforme seu negócio cresce."
  }
}
```

`src/locales/en/seo.json`:
```json
{
  "home": {
    "title": "Veltzy — AI SDR for businesses that want to sell more",
    "description": "AI-powered SDR platform that qualifies leads and books meetings automatically. For SMBs that want to scale sales without growing headcount."
  },
  "pricing": {
    "title": "Plans and pricing — Veltzy",
    "description": "Explore Veltzy plans. Start free and scale as your business grows."
  }
}
```

### Componente Helmet por página

```tsx
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

function Home() {
  const { t } = useTranslation('seo');

  return (
    <>
      <Helmet>
        <title>{t('home.title')}</title>
        <meta name="description" content={t('home.description')} />
      </Helmet>
      {/* resto da página */}
    </>
  );
}
```

## Atributo lang no `<html>`

Atualizar dinamicamente quando o idioma muda:

```tsx
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

Sem isso, screen readers e ferramentas de SEO consideram o idioma errado.

## Sitemap multilíngue

Gerar sitemap.xml com todas as variantes de idioma:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://veltzy.com/pt/sobre</loc>
    <xhtml:link rel="alternate" hreflang="pt" href="https://veltzy.com/pt/sobre" />
    <xhtml:link rel="alternate" hreflang="en" href="https://veltzy.com/en/about" />
    <xhtml:link rel="alternate" hreflang="es" href="https://veltzy.com/es/sobre-nosotros" />
  </url>
  <!-- repetir para cada página -->
</urlset>
```

Para Vite + React, gerar com script:
```bash
npx tsx scripts/generate-sitemap.ts
```

Submeter o sitemap no Google Search Console.

## Open Graph e Twitter Cards traduzidos

Compartilhamento social em rede precisa de versões traduzidas:

```tsx
<Helmet>
  <meta property="og:title" content={t('home.ogTitle')} />
  <meta property="og:description" content={t('home.ogDescription')} />
  <meta property="og:image" content="/og-image-pt.png" />
  <meta property="og:locale" content="pt_BR" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={t('home.twitterTitle')} />
  <meta name="twitter:description" content={t('home.twitterDescription')} />
</Helmet>
```

Imagens podem ser variadas por idioma se houver texto na imagem.

## Robots.txt

Permitir indexação de todas as variantes:

```
User-agent: *
Allow: /pt/
Allow: /en/
Allow: /es/

Sitemap: https://veltzy.com/sitemap.xml
```

## Verificação

- [ ] URLs com prefix de idioma funcionando (`/pt`, `/en`, `/es`)
- [ ] Tag hreflang correta em todas as páginas
- [ ] x-default apontando para PT
- [ ] Meta title e description traduzidos
- [ ] Atributo lang do `<html>` atualizando dinamicamente
- [ ] Sitemap gerado com variantes
- [ ] Open Graph traduzido
- [ ] Submetido no Google Search Console

## Ferramentas de validação

- **Google Search Console** → Cobertura, Erros de indexação, Sitemap
- **Hreflang Tags Testing Tool** (Aleyda Solis) → Validar hreflang
- **Screaming Frog** → Auditar SEO multilíngue do site inteiro
- **Lighthouse** → Auditoria SEO básica

## Erros clássicos

- Mesma URL servindo conteúdo em idiomas diferentes (Google não consegue indexar)
- hreflang apontando pra URLs erradas ou com 404
- Esquecer de incluir `x-default`
- Atributo `lang` no `<html>` não atualizando
- Title em PT em página EN (descuido comum em components compartilhados)
- Sitemap só com versão PT (Google não descobre as outras)

Cada um desses prejudica gravemente o SEO. Validar todos antes de considerar pronto.
