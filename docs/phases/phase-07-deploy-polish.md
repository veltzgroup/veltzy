# Phase 07 - Deploy, Polish e Ajustes Finais

## OBJETIVO
Preparar o Veltzy para produção: deploy no Netlify, configuração de domínio, secrets das Edge Functions, seed de dados de demonstração, correções críticas de UX, otimizações de performance e documentação final. Ao final desta fase, o Veltzy está rodando em produção e pronto para os primeiros clientes.

## PRÉ-REQUISITOS
- Fases 1 a 6 concluídas
- Conta Netlify
- Domínio disponível (ex: veltzy.com.br ou subdomínio)
- Conta Supabase em produção
- Repositório no GitHub

## 1. LIMPEZA E AUDITORIA

### 1.1 Remover código morto
- Buscar e remover `console.log` de debug
- Remover comentários obsoletos
- Remover imports não utilizados
- Remover arquivos de teste/placeholder criados durante desenvolvimento

### 1.2 Verificar TypeScript strict
Rodar `npx tsc --noEmit` e corrigir qualquer erro.

### 1.3 Lint
Rodar `npm run lint` e corrigir warnings críticos.

### 1.4 Bundle analysis
```bash
npm run build
```
Verificar tamanho do bundle. Se algum chunk passar de 500kb, avaliar code splitting com React.lazy.

### 1.5 Auditoria de segurança
Rodar no banco (query de auditoria):
```sql
-- Verificar tabelas sem RLS
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND rowsecurity = true
);

-- Verificar policies em tabelas críticas
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

## 2. OTIMIZAÇÕES DE PERFORMANCE

### 2.1 Code splitting de rotas
Converter imports de páginas para lazy loading em `App.tsx`:
```tsx
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/dashboard'))
const Pipeline = lazy(() => import('./pages/pipeline'))
const Inbox = lazy(() => import('./pages/inbox'))
// ... demais páginas

// Envolver Routes com Suspense
<Suspense fallback={<PageLoadingSkeleton />}>
    <Routes>{/* ... */}</Routes>
</Suspense>
```

### 2.2 React Query defaults globais
Ajustar em `main.tsx`:
```tsx
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: true,
            retry: 1,
        },
    },
})
```

### 2.3 Imagens otimizadas
- Logo Veltzy em WebP + SVG fallback
- Avatares com lazy loading (`loading="lazy"`)
- Compressão no upload de imagens do chat (usar `canvas` antes de enviar)

### 2.4 Índices de banco
Verificar e adicionar índices faltantes:
```sql
-- Índices críticos para performance
CREATE INDEX IF NOT EXISTS idx_leads_company_stage ON public.leads(company_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_assigned ON public.leads(company_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_company_temperature ON public.leads(company_id, temperature);
CREATE INDEX IF NOT EXISTS idx_leads_company_updated ON public.leads(company_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_lead_created ON public.messages(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_company_available ON public.profiles(company_id, is_available);
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_created ON public.activity_logs(company_id, created_at DESC);
```

## 3. VARIÁVEIS DE AMBIENTE

### 3.1 `.env.example` atualizado
Criar na raiz do projeto:
```
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# App
VITE_APP_URL=https://app.veltzy.com.br
VITE_APP_NAME=Veltzy
```

### 3.2 Secrets das Edge Functions (Supabase Dashboard)
Configurar em Settings > Edge Functions > Secrets:
```
# Obrigatórias
SUPABASE_URL=                    # Auto-populada
SUPABASE_SERVICE_ROLE_KEY=       # Auto-populada
SUPABASE_ANON_KEY=               # Auto-populada

# IA (opcional - apenas se usar fallback da Daxen Labs)
OPENAI_API_KEY=
GEMINI_API_KEY=

# Email (para convites)
RESEND_API_KEY=                  # Ou SMTP se preferir

# Instagram OAuth (opcional)
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URL=https://app.veltzy.com.br/auth/instagram/callback
```

### 3.3 `.gitignore` garantido
Confirmar que contém:
```
.env
.env.local
.env.production
node_modules
dist
.DS_Store
*.log
.supabase
```

## 4. DEPLOY — NETLIFY

### 4.1 `netlify.toml` na raiz
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 4.2 Passo a passo do deploy
1. Push do repositório para GitHub
2. No Netlify: New site from Git → conectar GitHub → selecionar repo
3. Build settings (Netlify detecta automaticamente com o netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Environment variables: adicionar as do `.env.example` com valores reais
5. Deploy

### 4.3 Domínio customizado
1. Domain settings → Add custom domain → `app.veltzy.com.br`
2. Configurar DNS no registrador:
   - Tipo: CNAME
   - Nome: app
   - Valor: `{site-name}.netlify.app`
3. Aguardar propagação e SSL (Netlify provisiona automaticamente via Let's Encrypt)

### 4.4 Alias para deploy manual
Adicionar no `.zshrc` ou `.bashrc`:
```bash
alias vzpush='git add . && git commit -m "deploy $(date +%Y-%m-%d-%H:%M)" && git push'
```

## 5. CONFIGURAÇÃO DO SUPABASE EM PRODUÇÃO

### 5.1 URL Configuration (Auth)
Dashboard > Authentication > URL Configuration:
- Site URL: `https://app.veltzy.com.br`
- Redirect URLs:
  - `https://app.veltzy.com.br/**`
  - `http://localhost:5173/**` (para dev)

### 5.2 Email templates personalizados
Dashboard > Authentication > Email Templates:
- Confirm signup
- Magic link
- Change email
- Reset password

Todos com branding Veltzy (cores, logo, tom pt-BR).

### 5.3 Rate limiting
Dashboard > Authentication > Rate Limits:
- Ajustar conforme plano do Supabase
- Recomendado: 30 requests/hora por IP para signup

### 5.4 Storage buckets
Verificar buckets criados:
- `chat-attachments` (privado, com RLS)
- `company-assets` (público para logos, privado para outros)

## 6. SEED DE DADOS DE DEMONSTRAÇÃO

Criar `supabase/seed.sql` (apenas para desenvolvimento):
```sql
-- Dados de demonstração para testes
-- ATENÇÃO: Não rodar em produção

DO $$
DECLARE
    _company_id UUID;
    _user_id UUID;
    _profile_id UUID;
    _stage_new UUID;
    _stage_qualifying UUID;
    _stage_open UUID;
    _source_whatsapp UUID;
BEGIN
    -- Assume que já existe uma empresa com um admin
    SELECT id INTO _company_id FROM companies LIMIT 1;

    IF _company_id IS NULL THEN
        RAISE NOTICE 'Crie uma empresa primeiro via onboarding';
        RETURN;
    END IF;

    SELECT user_id INTO _user_id FROM profiles WHERE company_id = _company_id LIMIT 1;
    SELECT id INTO _profile_id FROM profiles WHERE company_id = _company_id LIMIT 1;

    SELECT id INTO _stage_new FROM pipeline_stages WHERE company_id = _company_id AND slug = 'novo-lead';
    SELECT id INTO _stage_qualifying FROM pipeline_stages WHERE company_id = _company_id AND slug = 'qualificando';
    SELECT id INTO _stage_open FROM pipeline_stages WHERE company_id = _company_id AND slug = 'em-negociacao';
    SELECT id INTO _source_whatsapp FROM lead_sources WHERE company_id = _company_id AND slug = 'whatsapp';

    -- Criar 15 leads de exemplo
    INSERT INTO leads (company_id, name, phone, stage_id, source_id, status, temperature, ai_score, deal_value, assigned_to) VALUES
        (_company_id, 'Mariana Silva',       '+5511987654321', _stage_new,        _source_whatsapp, 'new',        'warm', 65, 3500,  _profile_id),
        (_company_id, 'Carlos Rodrigues',    '+5511987654322', _stage_qualifying, _source_whatsapp, 'qualifying', 'hot',  82, 8900,  _profile_id),
        (_company_id, 'Juliana Costa',       '+5511987654323', _stage_open,       _source_whatsapp, 'open',       'fire', 94, 15000, _profile_id),
        (_company_id, 'Pedro Almeida',       '+5511987654324', _stage_new,        _source_whatsapp, 'new',        'cold', 32, 2000,  _profile_id),
        (_company_id, 'Fernanda Lima',       '+5511987654325', _stage_qualifying, _source_whatsapp, 'qualifying', 'warm', 58, 4500,  _profile_id),
        (_company_id, 'Roberto Santos',      '+5511987654326', _stage_open,       _source_whatsapp, 'open',       'hot',  75, 12000, _profile_id),
        (_company_id, 'Larissa Pereira',     '+5511987654327', _stage_qualifying, _source_whatsapp, 'qualifying', 'fire', 89, 18500, _profile_id),
        (_company_id, 'Gustavo Martins',     '+5511987654328', _stage_new,        _source_whatsapp, 'new',        'warm', 45, 3200,  _profile_id),
        (_company_id, 'Bianca Oliveira',     '+5511987654329', _stage_open,       _source_whatsapp, 'open',       'hot',  78, 9800,  _profile_id),
        (_company_id, 'Rafael Souza',        '+5511987654330', _stage_new,        _source_whatsapp, 'new',        'cold', 28, 1800,  _profile_id);

    RAISE NOTICE 'Seed concluído: 10 leads criados para empresa %', _company_id;
END $$;
```

## 7. POLISH CRÍTICO DE UX

### 7.1 Loading states
Garantir skeleton em todas as páginas principais enquanto React Query carrega:
- Dashboard: `DashboardSkeleton`
- Pipeline: `PipelineSkeleton`
- Inbox: `InboxSkeleton` (lista + chat vazio)
- Sellers: `SellersSkeleton`

### 7.2 Empty states
Adicionar mensagem amigável + ilustração quando:
- Pipeline sem leads: "Nenhum lead ainda. Crie o primeiro ou aguarde um webhook"
- Inbox sem conversas: "Nenhuma conversa ativa"
- Dashboard sem dados: "Aguardando seus primeiros leads para gerar métricas"

### 7.3 Error boundaries
Criar `src/components/shared/error-boundary.tsx`:
- Captura erros React
- Exibe fallback amigável com botão "Recarregar"
- Dispara `ErrorReportDialog` se admin

### 7.4 Confirmações destrutivas
Revisar todas as ações destrutivas e garantir modal de confirmação:
- Deletar lead
- Remover membro da empresa
- Cancelar convite
- Desativar origem
- Desconectar WhatsApp/Instagram
- Deletar fase do pipeline

### 7.5 Toasts consistentes
Padrão de toasts (usando sonner):
- Sucesso: toast.success('Lead criado com sucesso')
- Erro: toast.error('Erro ao criar lead', { description: error.message })
- Info: toast.info('Processando...')
- Loading: toast.loading('Enviando mensagem...')

### 7.6 Formatação pt-BR
Verificar em todo o app:
- Datas: `date-fns` com locale `ptBR`
- Moeda: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- Números: separador de milhar com ponto, decimal com vírgula
- Telefones: mask `+55 (11) 98765-4321`

### 7.7 Responsividade mobile
Testar e ajustar em viewport 375px:
- Sidebar colapsa em menu hamburguer
- Pipeline: scroll horizontal funciona
- Inbox: painéis empilham (lista full width → chat full width)
- Dashboard: KPIs em coluna única, gráficos reduzem

## 8. SEO E META TAGS

Atualizar `index.html`:
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#042f1f" />

    <title>Veltzy — CRM com IA para vendas via WhatsApp</title>
    <meta name="description" content="CRM multi-tenant com IA SDR, pipeline drag & drop e atendimento multicanal via WhatsApp, Instagram e LinkedIn" />

    <!-- OpenGraph -->
    <meta property="og:title" content="Veltzy" />
    <meta property="og:description" content="CRM com IA para vendas via WhatsApp" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://app.veltzy.com.br" />
    <meta property="og:image" content="https://app.veltzy.com.br/og-image.png" />

    <!-- Icons -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
</head>
```

Criar assets em `public/`:
- `favicon.svg`
- `apple-touch-icon.png` (180x180)
- `og-image.png` (1200x630)

## 9. README FINAL

Substituir `README.md` por:
```markdown
# Veltzy

CRM multi-tenant com IA SDR, pipeline drag & drop e atendimento multicanal.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Database, Realtime, Storage, Edge Functions)
- TanStack React Query + Zustand
- Recharts, dnd-kit, react-hook-form + zod

## Desenvolvimento

```bash
npm install
cp .env.example .env
# Preencher variáveis
npm run dev
```

## Deploy

- Frontend: Netlify (auto-deploy via GitHub)
- Backend: Supabase (migrations via CLI)

## Arquitetura

Ver `docs/SPECS.md` e `docs/PRD.md`.

## License

Proprietário — Daxen Labs.
```

## 10. CHECKLIST FINAL DE DEPLOY

### Pré-deploy
- [ ] `npm run build` executa sem erros
- [ ] `npx tsc --noEmit` passa sem erros
- [ ] `npm run lint` sem warnings críticos
- [ ] `.env` NÃO commitado
- [ ] `.env.example` atualizado
- [ ] Migrations aplicadas em produção
- [ ] Edge Functions deployadas em produção
- [ ] Secrets configurados no Supabase
- [ ] Buckets de Storage criados com RLS

### Deploy
- [ ] Repositório no GitHub (privado)
- [ ] Site conectado no Netlify
- [ ] Variáveis de ambiente configuradas no Netlify
- [ ] Domínio customizado configurado
- [ ] SSL ativo (https)
- [ ] Redirect rules funcionando (SPA fallback)

### Pós-deploy — smoke tests
- [ ] Cadastro de nova conta funciona
- [ ] Onboarding cria empresa e redireciona
- [ ] Dashboard carrega dados
- [ ] Pipeline renderiza com drag & drop
- [ ] Criar lead manual funciona
- [ ] Inbox abre conversas
- [ ] Enviar mensagem funciona (se Z-API configurado)
- [ ] Edge Function zapi-webhook responde (teste com curl)
- [ ] Notificações em tempo real funcionam
- [ ] Logout e login funcionam
- [ ] Reset de senha funciona
- [ ] Convite de membro por email funciona
- [ ] Tema dark/light/sand funciona
- [ ] Mobile responsivo OK

### Monitoramento pós-launch
- [ ] Configurar alertas no Supabase (free tier tem limites)
- [ ] Configurar Netlify analytics (opcional)
- [ ] Testar em navegadores diferentes (Chrome, Safari, Firefox)
- [ ] Testar em dispositivos reais (iOS, Android)

## 11. DOCUMENTAÇÃO ADICIONAL

Criar `docs/DEPLOY.md` com:
- Passo a passo completo de deploy
- Como rodar migrations em produção
- Como deployar Edge Functions
- Troubleshooting comum

Criar `docs/API.md` com:
- Endpoints das Edge Functions públicas (webhooks)
- Payload esperado
- Exemplos com curl

## CRITÉRIOS DE CONCLUSÃO

- [ ] Build de produção sem erros
- [ ] Deploy no Netlify funcionando
- [ ] Domínio customizado com SSL
- [ ] Supabase em produção configurado
- [ ] Edge Functions com secrets corretos
- [ ] Seed de dados opcional disponível
- [ ] Skeleton e empty states implementados
- [ ] Error boundaries em rotas principais
- [ ] Formatação pt-BR consistente
- [ ] Responsivo mobile funcionando
- [ ] SEO e meta tags configurados
- [ ] README final escrito
- [ ] Documentação de deploy criada
- [ ] Smoke tests pós-deploy passam
