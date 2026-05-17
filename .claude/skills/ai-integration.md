---
name: ai-integration
description: >
  Padrão de ecossistema para embedar IA de forma financeiramente otimizada nos produtos SaaS multitenants
  do Veltz Group (Veltzy, Leadbaze, PowerV). Use esta skill SEMPRE que o trabalho envolver: criação ou
  edição de Edge Functions com chamadas a APIs de IA (OpenAI, Anthropic, Gemini), implementação ou
  expansão do módulo SDR AI do Veltzy, design de tabelas de log de uso de IA, decisão de qual modelo
  usar por tarefa, configuração de rate limiting ou limites por tenant, qualquer feature "AI-powered"
  em qualquer produto do ecossistema, ou migração de chaves de IA entre configurações. Não espere o
  usuário dizer "ai-integration" — use quando o contexto indicar IA + qualquer produto do ecossistema Veltz Group.
---

# AI Integration — Padrão de Ecossistema Veltz Group

Padrão obrigatório para qualquer integração de IA nos produtos do Veltz Group: **Veltzy** (CRM + SDR AI),
**Leadbaze** (automação de marketing) e **PowerV** (governança corporativa). O objetivo é entregar
features de IA com custo controlado, observabilidade por tenant, e código previsível e reutilizável
em toda a stack.

Preços verificados: abril 2026.

---

## 0. Contexto do Ecossistema

### Produtos e status de IA

| Produto | Supabase | IA atual | Status |
|---|---|---|---|
| **Veltzy** | Central `zxefzegggntfjlfsdgvw` (us-east-1) | SDR AI via `sdr-ai` Edge Function | Em produção — migrar para OpenAI |
| **Leadbaze** | Central `zxefzegggntfjlfsdgvw` | A implementar | Em desenvolvimento |
| **PowerV** | Central `zxefzegggntfjlfsdgvw` | A implementar | Planejado |

### Modelo de autenticação multi-tenant
- Todo request chega com JWT do Supabase Auth
- `company_id` é extraído via `get_current_company_id()` RPC
- RLS isola dados por `company_id` em todas as tabelas com policy padrão:
  `company_id = get_current_company_id() OR is_super_admin()`
- Feature flags controlam acesso por tenant: `companies.features.ai_sdr_enabled`
- Roles disponíveis: `super_admin | admin | manager | seller` (tabela `user_roles`, nunca em `profiles`)

### Schemas do banco
- Dados compartilhados: schema `public` (companies, profiles, user_roles, subscriptions, tenant_ai_config, ai_usage, ai_model_config)
- Dados do Veltzy: schema `veltzy`
- Dados do Leadbaze: schema `leadbaze`
- Dados do PowerV: schema `powerv`
- **Nunca misturar dados de produto no schema `public`**
- **ai_usage e tenant_ai_config ficam em `public`** para agregação centralizada no Hub

---

## 1. Filosofia de Custo

O Veltz Group absorve o custo de IA. O cliente final não paga por token. Por isso:

- **Estimar antes de implementar**: calcule o custo esperado por interação antes de escrever código
- **Modelo mínimo viável**: use sempre o modelo mais barato que atende a qualidade exigida
- **Prompt caching**: aplique onde disponível para reduzir custo em tokens de input repetidos
- **Monitoramento por tenant**: logar tokens e custo estimado por `company_id` em todas as chamadas
- **Provider configurável**: nunca hardcodar provider no código — sempre consultar `ai_model_config`

### Segurança e privacidade dos dados
- Dados dos clientes são processados via API com contrato de não uso para treinamento (OpenAI, Anthropic, Google)
- Nenhum dado de um tenant é enviado em chamadas de outro tenant
- Logs de uso auditáveis por empresa via `public.ai_usage`
- RLS garante isolamento no nível do banco

---

## 2. Seleção de Modelo por Tarefa

### Provider atual: OpenAI (principal — abril 2026)

| Camada | Modelo | Input/1M | Output/1M | Casos de uso no ecossistema |
|---|---|---|---|---|
| Triagem | `gpt-4.1-nano` | $0.10 | $0.40 | Score de lead, classificação de temperatura, triagem de inbox, roteamento |
| Atendimento | `gpt-4.1-mini` | $0.40 | $1.60 | SDR, respostas ao lead, qualificação contextual, automações |
| Premium (desabilitado) | `gpt-4.1` | $2.00 | $8.00 | Reservado para uso futuro via Hub |

Cache read OpenAI: 75% de desconto no input.
Batch API OpenAI: 50% de desconto em input e output (usar para pipelines não urgentes).

### Provider secundário: Anthropic (camada premium futura)

| Modelo | Input/1M | Output/1M | Casos de uso |
|---|---|---|---|
| `claude-sonnet-4-6` | $3.00 | $15.00 | Propostas, vendas consultivas, análise estratégica |
| `claude-haiku-4-5-20251001` | $1.00 | $5.00 | Volume médio se OpenAI indisponível |

Prompt caching Anthropic: 90% de desconto no cache hit.
Atenção: Haiku 3 foi encerrado em abril 2026. Nunca referenciar modelos descontinuados.

### Provider secundário: Google Gemini (futuro — RAG e contexto longo)

| Modelo | Input/1M | Output/1M | Casos de uso |
|---|---|---|---|
| `gemini-2.5-flash` | $0.30 | $2.50 | Agentes rápidos, contexto 1M flat |
| `gemini-flash-lite` | $0.10 | $0.40 | Grande escala, triagem |
| `gemini-2.5-pro` | $1.25 | $10.00 | RAG com documentos extensos (dobra acima de 200K tokens) |

**Regra de ouro**: Comece sempre com `gpt-4.1-nano`. Promova para `gpt-4.1-mini` apenas se a qualidade
for insuficiente. Camada premium só quando estritamente justificado.

### Simulação de custo — 10.000 conversas/mês
Base: 2.000 tokens input + 1.000 tokens output por conversa.

| Modelo | Total/mês |
|---|---|
| GPT-4.1 Nano | $6 |
| GPT-4.1 Mini | $24 |
| Haiku 4.5 | $70 |
| Claude Sonnet 4.6 | $210 |

---

## 3. Configuração de Provider por Feature (ai_model_config)

O provider e modelo de cada feature são configurados em banco, não no código.
A Edge Function consulta `public.ai_model_config` antes de cada chamada.
Para trocar de provider ou modelo: atualizar uma linha no Supabase, sem deploy.

### Configuração atual do Veltzy

| product | feature | provider | model |
|---|---|---|---|
| veltzy | sdr-scoring | openai | gpt-4.1-nano |
| veltzy | sdr-reply | openai | gpt-4.1-mini |
| veltzy | lead-analysis | openai | gpt-4.1-mini |
| leadbaze | campaign-copy | openai | gpt-4.1-mini |
| leadbaze | send-time-optimization | openai | gpt-4.1-nano |

---

## 4. Fluxo Obrigatório de Toda Edge Function com IA

```
1. Validar JWT e extrair company_id
2. Checar feature flag (companies.features.ai_sdr_enabled ou equivalente)
3. Consultar public.ai_model_config para obter provider + modelo da feature
4. Checar limite de uso do tenant (public.tenant_ai_config)
5. Montar prompt
6. Chamar API do provider com timeout explícito (AbortController, 30s)
7. Calcular custo estimado com preços do provider usado
8. Salvar log em public.ai_usage com todos os campos obrigatórios
9. Chamar increment_ai_spend para atualizar custo acumulado do tenant
10. Retornar resposta (com fallback gracioso em caso de erro)
```

---

## 5. Código Base — Edge Function com OpenAI

```typescript
// supabase/functions/[feature-name]/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TIMEOUT_MS = 30_000;
const FEATURE_NAME = "nome-da-feature"; // ex: "sdr-scoring", "sdr-reply", "lead-analysis"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Preços por modelo — atualizar se mudar (verificado abril 2026)
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "gpt-4.1-nano":  { input: 0.10 / 1_000_000, output: 0.40 / 1_000_000 },
  "gpt-4.1-mini":  { input: 0.40 / 1_000_000, output: 1.60 / 1_000_000 },
  "gpt-4.1":       { input: 2.00 / 1_000_000, output: 8.00 / 1_000_000 },
  "claude-sonnet-4-6":          { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  "claude-haiku-4-5-20251001":  { input: 1.00 / 1_000_000, output: 5.00 / 1_000_000 },
  "gemini-2.5-flash":  { input: 0.30 / 1_000_000, output: 2.50 / 1_000_000 },
  "gemini-flash-lite": { input: 0.10 / 1_000_000, output: 0.40 / 1_000_000 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // 1. Validar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    // 2. Obter company_id e checar feature flag
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    const companyId = profile?.company_id;
    if (!companyId) throw new Error("Company not found");

    const { data: company } = await supabase
      .from("companies")
      .select("features")
      .eq("id", companyId)
      .single();

    if (!company?.features?.ai_sdr_enabled) {
      return new Response(
        JSON.stringify({ error: "IA não habilitada para este tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Consultar provider e modelo configurados para esta feature
    const { data: modelConfig } = await supabase
      .from("ai_model_config")
      .select("provider, model")
      .eq("product", "veltzy") // trocar pelo produto correto em cada função
      .eq("feature", FEATURE_NAME)
      .eq("is_active", true)
      .single();

    if (!modelConfig) throw new Error("Model config not found for feature: " + FEATURE_NAME);

    const { provider, model } = modelConfig;

    // 4. Checar limite de uso do tenant
    const { data: aiConfig } = await supabase
      .from("tenant_ai_config")
      .select("monthly_limit_usd, current_month_spend_usd, is_ai_enabled")
      .eq("company_id", companyId)
      .single();

    if (aiConfig && !aiConfig.is_ai_enabled) {
      return new Response(
        JSON.stringify({ error: "IA desabilitada para este tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (aiConfig && aiConfig.current_month_spend_usd >= aiConfig.monthly_limit_usd) {
      return new Response(
        JSON.stringify({ error: "Limite mensal de IA atingido" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Parse do body
    const body = await req.json();

    // 6. Chamar provider com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let tokensInput = 0;
    let tokensOutput = 0;
    let resultText = "";

    try {
      if (provider === "openai") {
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: body.systemPrompt ?? "" },
              { role: "user", content: body.userMessage },
            ],
            temperature: 0.3,
          }),
          signal: controller.signal,
        });

        const openaiData = await openaiRes.json();
        tokensInput = openaiData.usage?.prompt_tokens ?? 0;
        tokensOutput = openaiData.usage?.completion_tokens ?? 0;
        resultText = openaiData.choices?.[0]?.message?.content ?? "";

      } else if (provider === "anthropic") {
        const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 1024,
            system: body.systemPrompt ?? "",
            messages: [{ role: "user", content: body.userMessage }],
          }),
          signal: controller.signal,
        });

        const anthropicData = await anthropicRes.json();
        tokensInput = anthropicData.usage?.input_tokens ?? 0;
        tokensOutput = anthropicData.usage?.output_tokens ?? 0;
        resultText = anthropicData.content?.[0]?.text ?? "";

      } else if (provider === "gemini") {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${Deno.env.get("GEMINI_API_KEY")}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: body.userMessage }] }],
              systemInstruction: body.systemPrompt ? { parts: [{ text: body.systemPrompt }] } : undefined,
            }),
            signal: controller.signal,
          }
        );

        const geminiData = await geminiRes.json();
        tokensInput = geminiData.usageMetadata?.promptTokenCount ?? 0;
        tokensOutput = geminiData.usageMetadata?.candidatesTokenCount ?? 0;
        resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      }
    } finally {
      clearTimeout(timeoutId);
    }

    // 7. Calcular custo estimado
    const prices = MODEL_PRICES[model] ?? { input: 0, output: 0 };
    const custoUsd = tokensInput * prices.input + tokensOutput * prices.output;

    // 8. Salvar log em public.ai_usage
    await supabase.from("ai_usage").insert({
      company_id: companyId,
      product: "veltzy", // trocar pelo produto correto em cada função
      provider,
      model,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      tokens_cached: 0,
      custo_estimado_usd: custoUsd,
      feature: FEATURE_NAME,
      metadata: {}, // adicionar contexto: { lead_id, message_id, campaign_id... }
    });

    // 9. Atualizar spend do tenant
    await supabase.rpc("increment_ai_spend", {
      p_company_id: companyId,
      p_custo: custoUsd,
    });

    return new Response(
      JSON.stringify({ result: resultText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${FEATURE_NAME}] Erro:`, error);
    return new Response(
      JSON.stringify({ error: "Serviço de IA temporariamente indisponível", fallback: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 6. SDR AI do Veltzy — Padrão Específico

### Configuração atual (após migração)
- Modelo de triagem: `gpt-4.1-nano` via `ai_model_config`
- Modelo de resposta: `gpt-4.1-mini` via `ai_model_config`
- Chave: `OPENAI_API_KEY` do ambiente (Veltz Group — não do cliente)
- Feature flag: `companies.features.ai_sdr_enabled`

### O que o SDR AI faz
- Qualificação automática: `ai_score` (0-100) + `temperature` (`cold/warm/hot/fire`)
- Auto-reply: geração de resposta para o lead quando ninguém está online
- Fluxo: chamado por `zapi-webhook` antes da distribuição de leads
- Campos impactados em `leads`: `ai_score`, `temperature`, `is_ai_active`, `is_queued`

### Fluxo completo do webhook com SDR
```
zapi-webhook recebe mensagem WhatsApp
  |-- IA SDR habilitada? -> chama sdr-ai
  |   |-- sdr-ai consulta ai_model_config -> gpt-4.1-nano para scoring
  |   |-- Atualiza leads.ai_score e leads.temperature
  |   |-- Auto-reply configurado? -> gpt-4.1-mini gera resposta -> chama zapi-send
  |-- Distribui lead (round robin -> manager -> fallback -> fila)
  |-- distribute-queue heartbeat (2 min) reprocessa is_queued=true
```

### System prompt base para SDR (OpenAI)
```typescript
const SDR_SYSTEM_PROMPT = `Você é um SDR (Sales Development Representative) automatizado.
Analise a mensagem recebida e o histórico da conversa para qualificar o lead.

Retorne APENAS JSON válido, sem texto adicional:
{
  "score": number,        // 0-100: probabilidade de conversão
  "temperature": string,  // "cold" (0-30) | "warm" (31-60) | "hot" (61-85) | "fire" (86-100)
  "reply": string | null, // resposta em português BR (null se auto-reply desabilitado)
  "reasoning": string     // justificativa curta da qualificação
}`;
```

### Contexto relevante das tabelas
- `leads`: `ai_score`, `temperature`, `is_ai_active`, `conversation_status`, `ad_context`
- `messages`: `sender_type` (ai/human/lead), `message_type`, histórico por `lead_id`
- `system_settings.sdr_config`: prompt customizável por empresa via admin
- `system_settings.auto_reply_config`: janela de horário, dias da semana

---

## 7. Schema de Banco de Dados

### Tabela `public.ai_usage`

```sql
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product text not null check (product in ('veltzy', 'leadbaze', 'powerv')),
  provider text not null check (provider in ('openai', 'anthropic', 'gemini')),
  model text not null,
  tokens_input integer not null default 0,
  tokens_output integer not null default 0,
  tokens_cached integer not null default 0,
  custo_estimado_usd numeric(10, 8) not null default 0,
  feature text not null,
  -- Exemplos de feature por produto:
  -- Veltzy: 'sdr-scoring', 'sdr-reply', 'lead-analysis'
  -- Leadbaze: 'campaign-copy', 'send-time-optimization'
  -- PowerV: 'governance-analysis', 'okr-suggestions'
  metadata jsonb default '{}',
  -- Veltzy: {"lead_id": "...", "message_id": "..."}
  -- Leadbaze: {"campaign_id": "...", "contact_id": "..."}
  created_at timestamptz not null default now()
);

create index ai_usage_company_id_idx on public.ai_usage(company_id);
create index ai_usage_created_at_idx on public.ai_usage(created_at);
create index ai_usage_product_idx on public.ai_usage(product);
create index ai_usage_feature_idx on public.ai_usage(feature);

alter table public.ai_usage enable row level security;
create policy "tenant_isolation" on public.ai_usage
  for all using (company_id = get_current_company_id() OR is_super_admin());
```

### Tabela `public.tenant_ai_config`

```sql
create table public.tenant_ai_config (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  is_ai_enabled boolean not null default true,
  monthly_limit_usd numeric(10, 2) not null default 10.00,
  current_month_spend_usd numeric(10, 6) not null default 0,
  last_reset_at timestamptz not null default date_trunc('month', now()),
  updated_at timestamptz default now()
);

alter table public.tenant_ai_config enable row level security;
create policy "tenant_isolation" on public.tenant_ai_config
  for all using (company_id = get_current_company_id() OR is_super_admin());

-- Acumula gasto após cada uso de IA
create or replace function public.increment_ai_spend(p_company_id uuid, p_custo numeric)
returns void language plpgsql security definer
set search_path = public as $$
begin
  insert into public.tenant_ai_config (company_id, current_month_spend_usd)
  values (p_company_id, p_custo)
  on conflict (company_id) do update
  set current_month_spend_usd = tenant_ai_config.current_month_spend_usd + p_custo,
      updated_at = now();
end;
$$;

-- Zera spend mensal (agendar via pg_cron no primeiro dia do mês)
create or replace function public.reset_monthly_ai_spend()
returns void language plpgsql security definer
set search_path = public as $$
begin
  update public.tenant_ai_config
  set current_month_spend_usd = 0,
      last_reset_at = date_trunc('month', now())
  where last_reset_at < date_trunc('month', now());
end;
$$;
```

### Tabela `public.ai_model_config`

```sql
create table public.ai_model_config (
  id uuid primary key default gen_random_uuid(),
  product text not null check (product in ('veltzy', 'leadbaze', 'powerv')),
  feature text not null,
  provider text not null check (provider in ('openai', 'anthropic', 'gemini')),
  model text not null,
  is_active boolean not null default true,
  updated_at timestamptz default now(),
  unique (product, feature)
);

-- Sem RLS — leitura pública para Edge Functions via service role
-- Gerenciado pelo super admin via Hub

-- Seed inicial
insert into public.ai_model_config (product, feature, provider, model) values
  ('veltzy',   'sdr-scoring',            'openai', 'gpt-4.1-nano'),
  ('veltzy',   'sdr-reply',              'openai', 'gpt-4.1-mini'),
  ('veltzy',   'lead-analysis',          'openai', 'gpt-4.1-mini'),
  ('leadbaze', 'campaign-copy',          'openai', 'gpt-4.1-mini'),
  ('leadbaze', 'send-time-optimization', 'openai', 'gpt-4.1-nano');
```

---

## 8. Variáveis de Ambiente (Supabase Central)

```
OPENAI_API_KEY=sk-...         # Veltz Group — conta própria
ANTHROPIC_API_KEY=sk-ant-...  # Reservado para camada premium futura
GEMINI_API_KEY=...             # Reservado para RAG futuro
SUPABASE_URL=https://zxefzegggntfjlfsdgvw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

Configurar em: Supabase Dashboard > Settings > Edge Functions > Secrets.

---

## 9. Checklist de Implementação

Ao criar qualquer Edge Function com IA no ecossistema:

- [ ] Validação de JWT e extração de `company_id`
- [ ] Checagem de feature flag em `companies.features`
- [ ] Consulta a `public.ai_model_config` para obter provider + modelo
- [ ] Checagem de limite via `public.tenant_ai_config`
- [ ] `AbortController` com `TIMEOUT_MS = 30_000`
- [ ] Cálculo de custo com `MODEL_PRICES` (tabela mantida na Edge Function)
- [ ] Insert em `public.ai_usage` com todos os campos incluindo `product` e `metadata`
- [ ] Chamada a `increment_ai_spend` após o insert
- [ ] Fallback gracioso no `catch` sem expor stack trace ao cliente
- [ ] Constante `FEATURE_NAME` definida (snake-case descritivo)
- [ ] Campo `product` correto para o produto da função
- [ ] RLS com `company_id = get_current_company_id() OR is_super_admin()`

---

## 10. Roadmap de IA do Ecossistema

```
1. Infra base (public.ai_usage + tenant_ai_config + ai_model_config)  <- AGORA
2. Migrar sdr-ai do Veltzy para OpenAI + infra de log               <- PRÓXIMO
3. Expandir features de IA no Veltzy (lead-analysis, follow-up)
4. IA no Leadbaze (campaign-copy, personalização)
5. Knowledge Base por empresa (RAG com pgvector) via Hub
6. Painel de controle de IA no Hub (custos, limites, troca de provider)
7. IA no PowerV (governança, OKRs)
8. IA cross-produto (Leadbaze captura + Veltzy atende com contexto compartilhado)
```

---

## Notas de Evolução

- `ai_model_config` permite trocar provider e modelo por feature sem deploy. Gerenciar via Hub.
- `tenant_ai_config` pode ser expandido com `plan_tier` para limites por plano (starter/pro/enterprise).
- Batch API (OpenAI, Anthropic, Google) oferece 50% de desconto para processamento assíncrono. Usar em pipelines não urgentes como análise de pipeline e relatórios.
- RAG via pgvector (Supabase nativo): quando implementado, Gemini 2.5 Pro ou GPT-4.1 com contexto 1M são os candidatos naturais pela janela grande e preço competitivo.
- Haiku 3 foi encerrado em abril 2026. Nunca referenciar modelos descontinuados.
