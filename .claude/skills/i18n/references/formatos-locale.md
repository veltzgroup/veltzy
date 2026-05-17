# Formatos sensíveis a locale

## Por que importa

Traduzir strings é só metade do trabalho. Datas, números, moedas e pluralização variam radicalmente entre idiomas. Mostrar `04/25/2026` para um brasileiro ou `1,000.50` para um espanhol gera estranhamento e desconfiança no produto.

## Hook unificado

Centralizar toda formatação em um hook customizado:

`src/hooks/useLocaleFormat.ts`:
```typescript
import { useTranslation } from 'react-i18next';

const LOCALE_MAP = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
} as const;

const CURRENCY_MAP = {
  pt: 'BRL',
  en: 'USD',
  es: 'EUR',
} as const;

export function useLocaleFormat() {
  const { i18n } = useTranslation();
  const lang = i18n.language as 'pt' | 'en' | 'es';
  const locale = LOCALE_MAP[lang] || 'pt-BR';
  const defaultCurrency = CURRENCY_MAP[lang] || 'BRL';

  const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...options,
    }).format(d);
  };

  const formatDateTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const formatRelativeTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const diffMs = d.getTime() - Date.now();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
    if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
    return rtf.format(diffDay, 'day');
  };

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(locale, options).format(value);
  };

  const formatCurrency = (value: number, currency?: string) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || defaultCurrency,
    }).format(value);
  };

  const formatPercent = (value: number, decimals = 0) => {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  return {
    formatDate,
    formatDateTime,
    formatRelativeTime,
    formatNumber,
    formatCurrency,
    formatPercent,
    locale,
    defaultCurrency,
  };
}
```

## Uso nos componentes

```tsx
import { useLocaleFormat } from '@/hooks/useLocaleFormat';

function LeadCard({ lead }: { lead: Lead }) {
  const { formatDate, formatCurrency, formatRelativeTime } = useLocaleFormat();

  return (
    <div>
      <h3>{lead.name}</h3>
      <p>Criado: {formatDate(lead.created_at)}</p>
      <p>Última atividade: {formatRelativeTime(lead.last_activity_at)}</p>
      <p>Valor estimado: {formatCurrency(lead.estimated_value)}</p>
    </div>
  );
}
```

## Comportamento por idioma

### Datas
- **PT (`pt-BR`):** `25/04/2026`
- **EN (`en-US`):** `04/25/2026`
- **ES (`es-ES`):** `25/4/2026`

### Datas extensas
```typescript
formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
```
- **PT:** `sábado, 25 de abril de 2026`
- **EN:** `Saturday, April 25, 2026`
- **ES:** `sábado, 25 de abril de 2026`

### Tempo relativo
- **PT:** `há 5 minutos`, `em 2 dias`
- **EN:** `5 minutes ago`, `in 2 days`
- **ES:** `hace 5 minutos`, `dentro de 2 días`

### Números
```typescript
formatNumber(1234567.89)
```
- **PT:** `1.234.567,89`
- **EN:** `1,234,567.89`
- **ES:** `1.234.567,89`

### Moedas
- **PT (BRL):** `R$ 1.234,56`
- **EN (USD):** `$1,234.56`
- **ES (EUR):** `1.234,56 €`

### Percentuais
- **PT:** `15,5%`
- **EN:** `15.5%`
- **ES:** `15,5 %`

## Pluralização avançada

i18next tem suporte nativo a pluralização baseado no [CLDR](https://cldr.unicode.org/index/cldr-spec/plural-rules).

### Sintaxe básica

`src/locales/pt/dashboard.json`:
```json
{
  "leadsCount_one": "{{count}} lead",
  "leadsCount_other": "{{count}} leads"
}
```

`src/locales/en/dashboard.json`:
```json
{
  "leadsCount_one": "{{count}} lead",
  "leadsCount_other": "{{count}} leads"
}
```

`src/locales/es/dashboard.json`:
```json
{
  "leadsCount_one": "{{count}} lead",
  "leadsCount_other": "{{count}} leads"
}
```

Uso:
```tsx
<p>{t('leadsCount', { count: leads.length })}</p>
```

i18next escolhe automaticamente entre `_one` e `_other` baseado no número e idioma.

### Idiomas com mais formas

Russo, árabe e polonês têm múltiplas formas de plural (zero, one, two, few, many, other). Se o produto suportar esses idiomas, criar todas as formas necessárias.

### Combinando pluralização e interpolação

```json
{
  "messageInbox_zero": "Caixa de entrada vazia",
  "messageInbox_one": "{{count}} mensagem nova",
  "messageInbox_other": "{{count}} mensagens novas"
}
```

```tsx
<p>{t('messageInbox', { count: unreadCount })}</p>
```

## Datas em fuso horário

Ao mostrar datas que vêm do banco em UTC, ajustar para o fuso do usuário:

```typescript
formatDate(date, { timeZone: 'America/Sao_Paulo' })
```

Para detectar fuso do usuário automaticamente:
```typescript
const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
formatDate(date, { timeZone: userTimeZone });
```

Ou salvar fuso preferido na tabela `profiles`:
```sql
ALTER TABLE profiles ADD COLUMN timezone TEXT DEFAULT 'America/Sao_Paulo';
```

## Inputs de data e número

Inputs nativos HTML5 respeitam o locale do navegador automaticamente:

```tsx
<input type="date" />
<input type="number" />
```

Mas para experiência consistente, usar bibliotecas como `react-day-picker` ou `react-aria-components` que aceitam `locale` como prop.

## Validações com mensagens traduzidas

Bibliotecas como Zod podem ser configuradas com mensagens em vários idiomas:

```typescript
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

function useValidations() {
  const { t } = useTranslation();

  return {
    emailSchema: z.string().email(t('validation.invalidEmail')),
    minLength: (min: number) =>
      z.string().min(min, t('validation.minLength', { min })),
    required: z.string().min(1, t('validation.required')),
  };
}
```

## Verificação

- [ ] Hook `useLocaleFormat` criado e testado
- [ ] Todas as datas exibidas usam `formatDate` (não `.toLocaleDateString` direto)
- [ ] Todos os números usam `formatNumber`
- [ ] Moedas respeitam o idioma do usuário
- [ ] Pluralização implementada onde aplicável
- [ ] Fuso horário tratado (se relevante)
- [ ] Validações de formulário com mensagens traduzidas

## Sinais de problemas

- Datas no formato errado (americano em PT, ou vice-versa)
- Vírgula no lugar de ponto (ou vice-versa) em números
- Moeda fixa em R$ mesmo quando idioma muda
- "1 leads" ou "0 lead" (pluralização errada)
- Mensagem de validação em PT em form em EN
- Hora exibida no UTC sem ajuste

Cada um desses prejudica a percepção de qualidade do produto.
