# Persistência da preferência de idioma

## Objetivo

Sincronizar a preferência de idioma do usuário entre localStorage (sempre) e Supabase (quando autenticado), garantindo experiência consistente entre dispositivos.

## Estratégia em camadas

```
┌─────────────────────────────────────────────────────┐
│ 1. localStorage (sempre disponível)                  │
│    - Funciona para usuários não logados              │
│    - Escrita imediata ao trocar idioma               │
└─────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────┐
│ 2. Supabase profiles.preferred_language (logado)     │
│    - Sincroniza entre dispositivos                   │
│    - Atualiza ao trocar idioma logado                │
│    - Lê e aplica ao logar                            │
└─────────────────────────────────────────────────────┘
```

## Migration no Supabase

### Adicionar coluna na tabela profiles

```sql
ALTER TABLE profiles
ADD COLUMN preferred_language TEXT DEFAULT 'pt'
CHECK (preferred_language IN ('pt', 'en', 'es'));

-- Índice opcional se você for filtrar usuários por idioma
CREATE INDEX idx_profiles_preferred_language
ON profiles(preferred_language);
```

### Atualizar política de RLS

Garantir que o usuário pode atualizar a própria preferência:

```sql
CREATE POLICY "Users can update own preferred_language"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

### Regenerar tipos

```bash
npx supabase gen types typescript --project-id <ref> > src/types/database.ts
```

## Implementação no frontend

### Hook customizado

`src/hooks/useLanguagePreference.ts`:
```typescript
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { SupportedLanguage } from '@/lib/i18n';

export function useLanguagePreference() {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  // Ao logar, ler preferência do banco e aplicar
  useEffect(() => {
    if (!user) return;

    const loadPreference = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao carregar preferência de idioma:', error);
        return;
      }

      if (data?.preferred_language && data.preferred_language !== i18n.language) {
        i18n.changeLanguage(data.preferred_language);
      }
    };

    loadPreference();
  }, [user, i18n]);

  // Função para trocar e persistir idioma
  const changeLanguage = async (lang: SupportedLanguage) => {
    // 1. Aplicar imediatamente (atualiza localStorage automaticamente)
    await i18n.changeLanguage(lang);
    document.documentElement.lang = lang;

    // 2. Persistir no Supabase se logado
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: lang })
        .eq('id', user.id);

      if (error) {
        console.error('Erro ao salvar preferência de idioma:', error);
        // Não reverter UI — a preferência local já está aplicada
      }
    }
  };

  return { changeLanguage, currentLanguage: i18n.language as SupportedLanguage };
}
```

### Atualizar componente de toggle

`src/components/LanguageToggle.tsx`:
```typescript
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type SupportedLanguage } from '@/lib/i18n';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';

export function LanguageToggle() {
  const { changeLanguage, currentLanguage } = useLanguagePreference();

  return (
    <select
      value={currentLanguage}
      onChange={(e) => changeLanguage(e.target.value as SupportedLanguage)}
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

## Fluxos cobertos

### Usuário não logado entra no app

1. Sem preferência salva → detecta idioma do navegador → aplica
2. Com preferência em localStorage → aplica automaticamente
3. Toggle altera localStorage imediatamente

### Usuário logado entra no app

1. Hook lê `preferred_language` do Supabase
2. Compara com idioma atual
3. Se diferente, troca para o salvo no banco
4. Toggle altera ambos: localStorage + Supabase

### Usuário troca de dispositivo

1. Logou no segundo dispositivo
2. Hook lê preferência do banco
3. Aplica automaticamente
4. Experiência consistente

### Usuário desloga

1. localStorage mantém última preferência
2. Próxima sessão (mesmo sem login) abre no mesmo idioma

## Tratamento de e-mails e notificações

A preferência salva no banco também serve para:

- Enviar e-mails transacionais no idioma certo
- Mensagens de WhatsApp via Z-API no idioma certo
- Templates de notificação adaptados

Edge Functions que mandam comunicação devem ler `preferred_language` do destinatário antes de escolher o template:

```typescript
// Em uma Edge Function que envia email
const { data: profile } = await supabase
  .from('profiles')
  .select('preferred_language')
  .eq('id', userId)
  .single();

const lang = profile?.preferred_language || 'pt';
const template = emailTemplates[lang]['welcome'];
await resend.emails.send({ ... template });
```

## Verificação

- [ ] Migration aplicada no Supabase
- [ ] Coluna `preferred_language` existe em `profiles`
- [ ] Tipos regenerados em `src/types/database.ts`
- [ ] Hook `useLanguagePreference` funcionando
- [ ] Toggle salva no banco quando logado
- [ ] Login em outro dispositivo aplica preferência
- [ ] Logout mantém localStorage
- [ ] Edge Functions de notificação respeitam o idioma do usuário

## Troubleshooting

### "Idioma volta para PT após reload mesmo logado"

- Verificar se hook está sendo chamado em algum componente que sempre renderiza (App.tsx ou layout principal)
- Verificar se RLS permite SELECT em profiles
- Verificar logs do console pra erro silencioso

### "Não consigo trocar idioma quando logado"

- Verificar se RLS permite UPDATE em profiles
- Verificar se `preferred_language` aceita o valor sendo enviado (CHECK constraint)
- Verificar console pra erro de constraint

### "E-mail chegou no idioma errado"

- Confirmar que Edge Function está lendo `preferred_language` do destinatário, não do remetente
- Confirmar que template existe para todos os idiomas suportados
- Adicionar fallback para PT se idioma não tiver template
