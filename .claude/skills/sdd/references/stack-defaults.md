# Stack Defaults — Claude Code, Supabase, Vercel, GitHub

Convenções padrão e armadilhas conhecidas para a stack de referência. Quando o projeto exigir ferramentas adicionais, aplicar a mesma lógica: buscar doc oficial, identificar armadilhas comuns, documentar.

## Claude Code

### Convenções

- Todo projeto tem `CLAUDE.md` na raiz (ver template)
- Slash commands customizados ficam em `.claude/commands/` (copiar de `assets/prompts/`)
- Histórico de PRDs e Specs versionado em `docs/features/<nome>/`

### Armadilhas conhecidas

**Janela de contexto cheia degrada qualidade.** Manter abaixo de 50%. Usar `/clear` agressivamente entre fases.

**Self-audit não substitui verificação real.** A IA lendo os próprios arquivos e declarando OK não prova nada. Sempre verificar com `git status`, `npm run build` e teste no navegador.

**Documentação desatualizada no treinamento.** Para qualquer biblioteca, sempre buscar doc oficial atual antes de implementar. O conhecimento de treinamento é referência, não fonte de verdade.

## Supabase

### Convenções

- Project ref no `CLAUDE.md` do projeto, nunca no código versionado
- Variáveis de ambiente sempre prefixadas (`NEXT_PUBLIC_SUPABASE_URL`, etc.)
- Migrations em `supabase/migrations/` com timestamp
- Tipos gerados em `src/types/database.ts` via `supabase gen types`
- RLS habilitado em todas as tabelas que contêm dados de usuário

### Armadilhas conhecidas

**Edge Functions e JWT verification.** Quando uma Edge Function recebe webhooks externos (Z-API, Stripe, etc.), deploy com `--no-verify-jwt`. Sem isso, o webhook bate na função, é rejeitado por falta de JWT, e o erro fica silencioso.

```bash
supabase functions deploy <nome> --no-verify-jwt
```

**`pg_net` e EarlyDrop.** Erros tipo `EarlyDrop` ao chamar HTTP de dentro do Postgres geralmente são timeout silencioso. Usar `net.http_post` com timeout explícito e tratar resposta.

**`moddatetime()` em migrations.** Função `moddatetime()` para `updated_at` automático precisa da extensão habilitada antes:

```sql
CREATE EXTENSION IF NOT EXISTS moddatetime;
```

Sem isso, a migration falha sem mensagem clara.

**RLS pode bloquear Edge Functions.** Edge Functions usando service role key bypassa RLS, mas usando anon key respeita. Confundir os dois leva a "consigo na função, não consigo no app" ou vice-versa.

**Tipos desatualizados após migration.** Toda vez que uma migration é aplicada, regenerar tipos:

```bash
npx supabase gen types typescript --project-id <ref> > src/types/database.ts
```

Esquecer disso causa erros de TypeScript bizarros depois.

## Vercel

### Convenções

- Branch `main` é a branch de produção
- Branches de feature geram preview deployments automáticos
- Variáveis de ambiente configuradas via dashboard, separadas por ambiente (Production, Preview, Development)
- Domínios customizados em `vercel.com/<projeto>/settings/domains`

### Armadilhas conhecidas

**Variáveis de ambiente não atualizam sem redeploy.** Mudar uma env var no dashboard não afeta o deploy atual. É preciso fazer um novo deploy (push de qualquer commit) ou usar "Redeploy" no painel.

**Build local vs build Vercel.** O Vercel pode falhar mesmo com build local passando, geralmente por:
- Variável de ambiente faltando
- Dependência só em devDependencies sendo importada em produção
- Path case-sensitive (Mac case-insensitive, Vercel Linux case-sensitive)

**Server Actions e cookies em Edge Runtime.** Algumas APIs do Next.js não funcionam em Edge Runtime. Verificar `runtime` declarado em cada rota.

**Cache do Vercel.** Headers de cache agressivos podem fazer parecer que o deploy não pegou. Forçar refresh com Cmd+Shift+R, ou abrir aba anônima para confirmar.

## GitHub

### Convenções

- Repositório privado para projetos de produção
- Branch protection em `main`
- Commits seguem Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Pull Requests para mudanças significativas (mesmo solo, ajuda na revisão)
- Issues para tracking de features e bugs

### Armadilhas conhecidas

**Secrets em commits.** Antes de cada `git push`, conferir que `.env*` está no `.gitignore` e que nenhum API key vazou em código. Ferramentas como `git-secrets` ajudam.

**Push force destrói histórico.** Nunca `git push --force` em main. Em branches de feature individual, ok.

**Submodules e dependências privadas.** Se o projeto usa pacote privado, configurar token de acesso no Vercel também, não só localmente.

## Ferramentas adicionais conhecidas

Para ferramentas usadas em projetos anteriores (referência):

### Z-API (WhatsApp)

- Status de conexão retorna string específica que precisa ser verificada literalmente
- Webhooks devem ser HTTPS e responder 200 rapidamente
- Edge Function recebendo Z-API → `--no-verify-jwt` no deploy

### Resend (Email)

- API key separada por ambiente
- Domain verification antes de enviar de domínio próprio
- Template HTML inline ou via React Email

### Anthropic API

- Modelo de referência: ver doc oficial de "Models" para nome atual exato
- Streaming requer handling diferente de não-streaming
- Tool use tem schema específico de parâmetros

### Stripe

- Webhooks precisam de signature verification
- Test mode vs live mode com keys separadas
- Customer Portal precisa configuração no dashboard antes do código

## Quando uma ferramenta nova entra no projeto

Antes de implementar qualquer integração com ferramenta nova:

1. Buscar doc oficial atualizada
2. Identificar quickstart/getting started
3. Identificar 2 ou 3 armadilhas comuns (issues no GitHub, Stack Overflow)
4. Documentar no PRD da feature que usa essa ferramenta
5. Adicionar este arquivo (`stack-defaults.md`) com a aprendizagem após o primeiro uso bem-sucedido

Esse loop mantém a skill viva e cada vez mais útil.
