# PRD - SDR AI v2 (Veltzy)

> Feature: `sdr-ai-v2`
> Repo: `tonimeloveltz/veltzy` (com dependências em `veltzgroup/hub`)
> Versão deste PRD: 1.0
> Status: Aprovado para Fase 2 (Spec)

---

## 1. Objetivo

Reconstruir o SDR AI do Veltzy como um agente conversacional autônomo capaz de qualificar leads, agendar reuniões, enviar links de pagamento e executar follow-up híbrido em WhatsApp PT-BR, com personalidade e habilidades configuráveis por pipeline, totalmente conectado ao Hub para controle centralizado de cobrança, uso de tokens e modelo de IA.

O SDR v1 atual qualifica (score + temperatura + resposta livre). O SDR v2 vende: opera um ciclo conversacional completo até agendamento ou cobrança, transfere para humano quando apropriado, e tem seu próprio número WhatsApp por pipeline (não usa o número do vendedor).

A arquitetura segue o padrão canônico convergente de agentes em produção: um while loop que faz tool calls. Não usamos LangGraph, multi-agente ou frameworks pesados. Construímos um harness explícito com componentes nomeados, testáveis e observáveis.

URL alvo (feature embutida): pipeline com `ai_sdr_enabled=true` e `Agent Profile` configurado.

## 2. Visão e posicionamento

### O que o SDR v2 é

Um agente de IA por pipeline com identidade própria, conhecimento do negócio da empresa, e capacidade de executar ações concretas no mundo (criar evento no calendário, gerar cobrança Asaas, atualizar campos do lead, escalar para vendedor humano).

### O que o SDR v2 NÃO é

Não é Lindy clone (Lindy é email/LinkedIn). Não é RetellAI ou Bland (esses são voz). Não é chatbot de FAQ (não responde "qualquer coisa", tem propósito declarado por pipeline). Não é agente único da empresa (cada pipeline tem seu agente, com escopo próprio).

### Nicho que o SDR v2 ocupa

SDR conversacional em WhatsApp, multi-tenant, com agente próprio por funil, monitorado centralmente por empresa, em português brasileiro, integrado a Asaas (pagamento BR) e Google Calendar. Esse nicho não está bem servido pelos players globais (Lindy, Air, RetellAI, Bland), pelos chatbots BR (Take, Zenvia, Botmaker) nem pelas plataformas verticais (CloseBot, Bella, Artisan).

### Princípios de design

A simplicidade vence frameworks. Loop while + tools bem desenhadas + harness explícito é mais robusto em produção do que abstrações pesadas. Esse é o padrão convergente de Claude Code, OpenAI Agents SDK, AWS Strands.

O harness importa mais que o modelo. A diferença entre demo e produção é tudo que cerca o LLM: gerência de loop, registro e dispatch de tools, memória, guardrails, retry, observabilidade. Não o tamanho do modelo.

70-80% das interações são determinísticas. Mensagens triviais (números, "ok", "sim", confirmações) seguem fluxos determinísticos quando possível. LLM é chamado apenas quando agrega valor real. Isso reduz custo em 60-80% comparado a chatbot puro que envia tudo pro LLM.

Budgets em código, não em prompt. Limite de iterações no system prompt é uma sugestão. BudgetEnforcer no código é uma garantia. Vale para tokens, tool calls, e duração da conversa.

Compliance Meta WhatsApp é não-negociável. Cada agente tem `purpose` declarado por pipeline. Não existe modo "fale sobre qualquer coisa". Fora do escopo, agente escala para humano.

## 3. Personas

### Configurador do agente (Admin da empresa)

Quem configura o Agent Profile por pipeline. Faz upload de docs (produtos, preços, FAQs). Define identidade, tom, purpose, habilidades, cadência de follow-up, guardrails. Testa em sandbox antes de liberar para clientes reais.

### Supervisor (Manager da empresa)

Monitora dashboard de métricas SDR v2. Aprova ou ajusta sugestões quando agente está em modo suggest-mode. Recebe escalada quando agente passa a conversa para humano.

### Vendedor humano (Seller)

Recebe leads transferidos pelo agente. Vê resumo da conversa (`leads.transfer_summary`) e contexto. Continua atendimento manual do ponto onde agente parou. Pode interromper agente a qualquer momento mesmo em full-auto.

### Lead (cliente final)

Conversa com agente via WhatsApp. Não sabe (ou pode saber, se empresa configurar) que está falando com IA. Recebe respostas em tom configurado, propostas de horário diretamente na conversa, link de pagamento Asaas quando aplicável, transferência para humano quando agente identifica necessidade.

### Super Admin (Veltz Group)

Monitora uso global no Hub. Pausa SDR de empresa específica ou globalmente em emergência (kill switch). Aplica override de limite manual. Visualiza custo agregado e margem por cliente.

## 4. Estado atual (mapeado nos repos)

### Veltzy (o que já existe)

A primeira camada pronta é a **infraestrutura WhatsApp multi-provider e multi-instância**. `companies.active_whatsapp_provider` decide qual provider usar. A abstração via `WhatsAppProvider` interface está implementada. Cada empresa tem N números WhatsApp. `profiles.default_whatsapp_instance`, `leads.whatsapp_instance_name`, `pipelines.sdr_instance_name`, `messages.instance_name` permitem rastreamento e roteamento por instância.

A segunda camada pronta é o **transfer SDR para vendedor**. SDR retorna `transfer: true`, sdr-ai envia mensagem de transferência pelo número do SDR, gera resumo IA salvo em `leads.transfer_summary`, troca instância do lead e notifica vendedor. Template configurável em `pipelines.sdr_transfer_message_template` com `{vendedor_nome}`.

A terceira camada pronta é **múltiplos pipelines por empresa**. Cada lead pertence a um pipeline. Cada pipeline pode ter agente SDR e instância WhatsApp próprios.

A quarta camada pronta é o **shared inbound handler**: `_shared/lead-inbound-handler.ts` consolida lógica de criação/atualização de lead. `_shared/resolve-instance.ts` resolve qual instância usar (prioridade: lead > pipeline SDR > profile vendedor).

A camada antiga que será **reformada ou descartada**: `sdr-ai` Edge Function atual (qualifica + temperatura + resposta livre), `useSdrConfig`, `SdrSettings`, `SdrMetricsDashboard`. Vão ser refeitos, não migrados.

### Hub (o que já existe)

A infra de IA tem tabelas prontas: `ai_model_config` (provider e modelo por feature), `tenant_ai_config` (is_ai_enabled, monthly_limit_usd, current_month_spend_usd), `ai_usage` (log de uso por empresa/produto/feature). Funções `increment_ai_spend` e `reset_monthly_ai_spend` existem.

A infra Evolution está completa: VPS Hostinger em `evo.veltz.group`, Coolify gerenciando containers, Evolution API v2.3.7 rodando com Postgres e Redis dedicados. Edge Functions de gestão de instância (`evolution-instance-manage`, `evolution-send-message`, `evolution-webhook-receiver`) prontas.

A UI Hub v0 tem: F1 auth super_admin, F2 painel de empresas, F3 visualização de integrações, F4 painel IA por empresa, F5 visualização de ai_usage, F6 CRUD de ai_model_config.

### O que falta (gaps concretos)

O bloqueador 1 é que **endpoint `/v1/ai/complete` não existe**. Hub tem as tabelas de IA mas não tem o proxy que recebe da Veltzy, valida limite, chama OpenAI, registra uso e retorna. Sem isso, SDR v2 não pode existir nessa arquitetura.

O bloqueador 2 é que **tool calling não está modelado**. Hub atual pensa em completion simples (prompt entra, texto sai). SDR v2 é agent loop com tools. Endpoint precisa suportar definições de tools, retorno de `tool_calls`, e múltiplos turns.

O importante 1 é que **RAG não existe**. Knowledge Base aparece só no roadmap futuro do Hub. pgvector não está habilitado. Endpoint `/v1/ai/embeddings` não existe.

O importante 2 é que **Asaas e Google Calendar OAuth não existem no Hub**. Z-API e Evolution estão prontos. Asaas e GCal precisam ser construídos como pré-requisito de Onda 2.

O médio é que **limite por plano não está implementado**. Hub tem `monthly_limit_usd` por empresa em USD, queremos cobrar por plano em BRL (Starter R$50, Pro R$200, Enterprise ilimitado). Decisão tomada: mantém USD no banco, BRL apenas na UI. Conversão via tabela `currency_rates` ou hardcoded por enquanto.

O baixo é que **alertas Slack/email não existem**. Hub não tem mecanismo de notificação. Reutiliza Brevo (já nas integrações) e webhook Slack (a construir).

## 5. Arquitetura geral

### Fluxo end-to-end (mensagem entrante)

```
Lead envia mensagem WhatsApp
  -> Evolution API (VPS Hostinger, evo.veltz.group)
  -> Hub: evolution-webhook-receiver
  -> Veltzy: evolution-inbound (Edge Function)
  -> _shared/lead-inbound-handler: cria/atualiza lead, identifica pipeline e instância
  -> Decisão de roteamento:
       Se pipeline.ai_sdr_enabled = true
         AND lead.is_ai_active = true
         AND tenant_ai_config.is_ai_enabled = true
         AND tenant_ai_config dentro do limite
         -> Dispara sdr-engine (Edge Function nova)
       Caso contrário -> roteamento normal (distribuicao_de_leads)
  -> sdr-engine: orquestra agent loop
       -> Carrega Agent Profile do pipeline
       -> Carrega histórico de mensagens do lead (memória)
       -> Roteador determinístico: mensagem trivial? Resposta pronta? -> responde sem LLM
       -> Caso contrário, monta payload e chama Hub /v1/ai/complete
       -> Hub valida tenant, chama OpenAI com tools definidas, registra ai_usage
       -> Hub retorna resposta + tool_calls (se houver)
       -> sdr-engine executa tools localmente (cada tool tem handler)
       -> Loop até resposta final OU budget esgotado OU escalada para humano
  -> sdr-engine envia resposta via Veltzy whatsapp-send
  -> whatsapp-send chama Hub evolution-send-message (via instância do pipeline)
  -> Lead recebe resposta no WhatsApp
```

### Separação Veltzy vs Hub

O Veltzy é fachada: configuração de personalidade (Agent Profile), habilidades habilitadas (toggle de tools), orquestração do agent loop (sdr-engine), execução de tools de domínio (criar evento via Hub, gerar cobrança via Hub, atualizar lead local), conversa com o lead via WhatsApp (envio via Hub).

O Hub é control plane: provider e modelo de IA (ai_model_config), limites por empresa (tenant_ai_config), log de uso (ai_usage), proxy seguro para OpenAI (/v1/ai/complete), proxy seguro para embeddings (/v1/ai/embeddings), proxy seguro para Asaas (asaas-create-charge), proxy seguro para Google Calendar (gcal-create-event, gcal-list-availability), proxy seguro para WhatsApp (evolution-send-message), kill switch global, alertas.

A chave global da OpenAI nunca trafega fora do Hub. Veltzy não conhece o provider. Amanhã trocamos OpenAI por Anthropic em uma empresa específica, mexe só no `ai_model_config` no Hub. Veltzy continua igual.

### Onde mora cada peça (decisão final)

| Camada | Onde mora |
|---|---|
| Agent Profile por pipeline | `veltzy.agent_profiles` |
| Knowledge Base chunks | `veltzy.agent_knowledge_chunks` (pgvector) |
| Conversas SDR (estado) | `veltzy.sdr_conversations` |
| Follow-ups agendados | `veltzy.sdr_followups` |
| Log de tool calls | `veltzy.sdr_tool_calls` |
| Orquestração (agent loop) | Veltzy Edge Function `sdr-engine` |
| Scheduler de follow-up | Veltzy Edge Function `sdr-followup-scheduler` (cron 5min) |
| Extração de docs (upload) | Veltzy Edge Function `sdr-knowledge-ingest` |
| Proxy IA | Hub Edge Function `/v1/ai/complete` |
| Proxy embeddings | Hub Edge Function `/v1/ai/embeddings` |
| Proxy Asaas | Hub Edge Function `asaas-create-charge` |
| Proxy Google Calendar | Hub Edge Functions `gcal-*` |
| Log de uso de IA | `public.ai_usage` (Hub) |
| Limite e gasto por empresa | `public.tenant_ai_config` (Hub) |
| Configuração de modelo | `public.ai_model_config` (Hub) |
| Subscriptions e planos | `public.subscriptions` (Hub) |

## 6. Agent Harness (camada técnica central)

O Harness é a camada entre o usuário final (lead via WhatsApp) e o LLM (OpenAI via Hub). Não é o prompt, não é o modelo. É a infraestrutura que faz o agente confiável. Vai morar em `supabase/functions/sdr-engine/` no Veltzy, decomposto em módulos.

### Componentes nomeados

**AgentLoop.** O coração do harness. Implementa o while loop canônico: chama LLM via Hub, recebe resposta, se houver tool_calls executa as tools, alimenta resultados de volta no contexto, repete até resposta final OU stop condition. Stop conditions: max_iterations atingido, budget de tokens estourado, tool de encerramento chamada (end_conversation, escalate_to_human), erro irrecuperável.

**ToolRegistry.** Catálogo de tools disponíveis para o agente. Cada tool é registrada com: nome, descrição (vai pro LLM), schema zod (valida argumentos antes de executar), handler (função que executa). Registry é populado dinamicamente por Agent Profile: só registra tools que o pipeline tem habilitadas. Isso significa que se `send_payment_link` está desligado, o LLM nem vê a tool, não pode chamar.

**BudgetEnforcer.** Aplica limites multi-camada. Antes de cada chamada ao Hub, verifica: limite mensal da empresa (tenant_ai_config), limite de tokens por conversa (config global, default 50k), limite de iterações por turn (default 10), limite de tool calls por turn (default 5). Estoura limite, encerra loop com motivo estruturado, escala para humano se necessário.

**MemoryManager.** Gerencia contexto da conversa. Estratégia de memória híbrida: as últimas 20 mensagens vão crus no prompt, mensagens mais antigas são compressadas em um resumo gerado pelo próprio LLM (hot cache pattern). System prompt fica fixo (Agent Profile + knowledge base relevante via RAG). Compressão acontece quando contexto ultrapassa 75% do limite do modelo.

**GuardrailChecker.** Validação pós-LLM e pós-tool. Verifica antes de enviar resposta ao lead: resposta contém preço que não está na knowledge base? (alerta, possível alucinação). Resposta promete prazo (dias, semanas)? (alerta). Tool `send_payment_link` chamada com valor > limite configurado? (bloqueia, escala). Tool `schedule_meeting` chamada em horário fora do comercial? (bloqueia, oferece outros horários). Cada guardrail tem ação configurável: alertar, bloquear, ou bloquear+escalar.

**FailureHandler.** Tratamento estruturado de erros. Classifica erros em três categorias. Transient: timeout do Hub, rate limit do OpenAI, erro de rede. Ação: retry com backoff exponencial (3 tentativas). Permanent: argumento inválido, tool não existe, schema falhou. Ação: log estruturado, segue conversa sem essa tool, não retry. Unavailable: Hub fora, OpenAI fora, Asaas fora. Ação: degradação graciosa (responde texto sem tool), notifica admin.

**ConversationStateManager.** Mantém estado da conversa em `veltzy.sdr_conversations`. Campos: lead_id, pipeline_id, agent_profile_id, status (active | escalated | completed | abandoned | failed), current_iteration, total_tokens_used, total_cost_usd, started_at, ended_at, end_reason. Permite resumir conversa interrompida, calcular custo por conversa, debugar comportamento.

### Padrão canônico do loop

```pseudo
while (!done) {
  budget.assertCanContinue()           // BudgetEnforcer
  context = memory.buildContext()      // MemoryManager
  
  response = hub.complete({            // chamada via Hub /v1/ai/complete
    model: agentProfile.model,
    messages: context.messages,
    tools: toolRegistry.openAISchema(),
    system: agentProfile.systemPrompt
  })
  
  ai_usage.log(response.usage)
  budget.consume(response.usage)
  
  if (response.toolCalls.length > 0) {
    for (toolCall of response.toolCalls) {
      validated = toolRegistry.validate(toolCall)  // zod
      if (!validated.ok) {
        memory.appendToolError(toolCall, validated.error)
        continue
      }
      result = await toolRegistry.execute(toolCall)
      guardrails.checkToolResult(toolCall, result)
      memory.appendToolResult(toolCall, result)
      if (result.terminal) { done = true; break }
    }
  } else {
    guardrails.checkAssistantResponse(response.content)
    await whatsapp.send(response.content)
    memory.appendAssistantMessage(response.content)
    done = true  // resposta final, aguarda próxima mensagem do lead
  }
}
```

### Observabilidade

Todo agent run gera logs estruturados em `veltzy.sdr_tool_calls` (tool calls com argumentos, resultado, duração, status) e em `veltzy.sdr_conversations` (estado consolidado). Quando uma conversa falha, é possível reconstruir exatamente o que aconteceu: que mensagem o lead mandou, que prompt o LLM viu, que tool ele decidiu chamar, que resultado a tool retornou, como o LLM interpretou.

## 7. Agent Profile (configuração por pipeline)

Cada pipeline com `ai_sdr_enabled=true` tem um Agent Profile próprio. Não é configuração por empresa: é por pipeline. Isso permite que a empresa tenha SDR de "Vendas B2B" diferente do SDR de "Recuperação de Inadimplentes" diferente do SDR de "Pós-venda".

### Schema

```typescript
interface AgentProfile {
  id: string
  pipeline_id: string                    // FK pipelines.id (1:1)
  company_id: string                     // denormalizado para RLS
  
  // Identidade
  agent_name: string                     // "Lara", "Carlos", "SDR Veltz"
  agent_gender: 'female' | 'male' | 'neutral'
  tone: 'formal' | 'informal' | 'coloquial' | 'tecnico'
  personality: 'consultiva' | 'objetiva' | 'calorosa' | 'tecnica'
  disclose_ai: boolean                   // agente revela que é IA se perguntado?
  
  // Empresa (contexto)
  company_description: string            // 2-3 frases
  value_proposition: string              // 1-2 frases
  differentiators: string                // bullets em texto livre
  ideal_customer_profile: string         // texto livre, perfil de cliente ideal
  
  // Propósito declarado (compliance Meta)
  purpose: 'qualification' | 'appointment_booking' | 'direct_sales' | 'support' | 'recovery'
  primary_goal: string                   // texto livre, ex: "Agendar reunião comercial de 30min"
  
  // Habilidades (tools habilitadas)
  enabled_tools: ToolName[]              // subset das 8 tools
  
  // Limites e comportamento
  max_iterations_per_turn: number        // default 10
  max_tokens_per_conversation: number    // default 50000
  max_payment_value_brl: number          // valor máximo de cobrança sem aprovação humana
  operating_mode: 'full_auto' | 'suggest_mode'
  business_hours: BusinessHours          // janelas de horário comercial
  
  // Follow-up
  followup_cadence: number[]             // array de minutos: [60, 1440, 4320, 10080, 20160]
  followup_max_attempts: number          // default 5
  
  // Knowledge base
  knowledge_base_status: 'empty' | 'processing' | 'ready' | 'error'
  knowledge_base_version: number         // incrementa a cada upload
  
  // Guardrails
  forbidden_topics: string[]             // ex: ['concorrentes', 'política', 'religião']
  must_escalate_keywords: string[]       // ex: ['advogado', 'reclamação formal', 'cancelar contrato']
  custom_guardrails: string              // texto livre, vai pro system prompt
  
  // Sistema
  is_active: boolean
  created_at: timestamptz
  updated_at: timestamptz
  created_by: uuid                       // FK profiles
}
```

### Wizard de onboarding

O wizard tem dois modos. Modo guiado (10 min) cobre os campos essenciais com defaults inteligentes: nome do agente, tom, purpose, descrição da empresa, proposta de valor, horário comercial, cadência de follow-up. Tools habilitadas vêm com preset por purpose (qualification habilita 4 tools, direct_sales habilita 6, etc.).

Modo profundo (30+ min) abre todos os campos, permite upload de docs para knowledge base, customização de guardrails, configuração fina de cadência e limites. Termina com sandbox de teste obrigatório.

### Sandbox de teste

Antes de ativar o agente para leads reais, admin testa em sandbox. Interface de chat dentro do Veltzy que simula conversa com o agente. Tools são chamadas em modo simulação: `schedule_meeting` retorna "agendamento simulado", `send_payment_link` retorna "link simulado". Admin valida tom, conhecimento, fluxo, e só então ativa.

### Presets por purpose

| Purpose | Tools habilitadas (default) |
|---|---|
| qualification | qualify_lead, update_lead_field, escalate_to_human, query_business_knowledge, schedule_followup, end_conversation |
| appointment_booking | qualify_lead, schedule_meeting, update_lead_field, escalate_to_human, query_business_knowledge, schedule_followup, end_conversation |
| direct_sales | qualify_lead, send_payment_link, update_lead_field, escalate_to_human, query_business_knowledge, schedule_followup, end_conversation |
| support | update_lead_field, escalate_to_human, query_business_knowledge, end_conversation |
| recovery | send_payment_link, update_lead_field, escalate_to_human, query_business_knowledge, schedule_followup, end_conversation |

Admin pode customizar (ligar/desligar individualmente cada tool).

## 8. Compliance Meta WhatsApp (purpose declarado)

Em 15 de janeiro de 2026, a Meta atualizou política de WhatsApp Business exigindo que agentes de IA tenham propósito declarado. Não é mais permitido chatbot de IA "geral" que conversa sobre qualquer assunto. Cada agente deve ter função específica: assistência de compra, suporte, agendamento, rastreio, ou outra.

### Como o SDR v2 atende

Cada Agent Profile tem campo `purpose` obrigatório (enum de 5 valores). Esse purpose vai no system prompt do agente como restrição explícita. Tools habilitadas variam por purpose.

### Fallback de escopo

Se lead pergunta algo claramente fora do purpose declarado, agente reconhece e oferece transferência para humano. Exemplo: pipeline com `purpose='appointment_booking'` e lead pergunta sobre cancelamento de contrato. Agente responde: "Para esse assunto preciso te conectar com nossa equipe. Vou transferir agora." e chama `escalate_to_human` com motivo "fora_de_escopo".

### Documentação obrigatória

O Agent Profile guarda histórico de purpose e enabled_tools. Auditoria Meta pode pedir prova de que o agente tem escopo definido. Logs em `veltzy.sdr_tool_calls` mostram o que o agente fez. Banco mostra o que ele pode fazer.

## 9. As 8 tools (especificação completa)

Todas as tools seguem o mesmo padrão: schema zod, descrição em PT-BR para o LLM, handler em TypeScript, log estruturado, retorno padronizado `{ ok: boolean, data?: unknown, error?: string, terminal?: boolean }`. Terminal=true encerra o loop (caso de escalate_to_human e end_conversation).

### Tool 1: qualify_lead

Propósito. Atualiza score (0-100) e temperatura (cold/warm/hot/fire) do lead com base na conversa.

Schema (zod):
```typescript
z.object({
  score: z.number().min(0).max(100),
  temperature: z.enum(['cold', 'warm', 'hot', 'fire']),
  reasoning: z.string().min(10).max(500),
  detected_signals: z.array(z.enum([
    'orcamento_mencionado',
    'urgencia_alta',
    'autoridade_decisao',
    'necessidade_clara',
    'timing_definido',
    'concorrente_mencionado',
    'objecao_preco',
    'objecao_timing',
    'sem_interesse'
  ])).optional()
})
```

Descrição para o LLM: "Use esta tool quando tiver informação suficiente para qualificar o lead. score=0 sem interesse algum, score=100 lead pronto para fechar. temperature segue: cold=0-30, warm=31-60, hot=61-85, fire=86-100. reasoning explica brevemente o porquê do score."

Side effects: atualiza `leads.ai_score`, `leads.temperature`, registra log em `veltzy.sdr_tool_calls`.

### Tool 2: schedule_meeting

Propósito. Agenda reunião no Google Calendar. Conversacional (oferece horários, não link).

Comportamento. A primeira chamada deve ser para listar disponibilidade. Tool tem dois modos: `list_availability` retorna 3 horários disponíveis nos próximos 5 dias úteis, `book` confirma um horário específico.

Schema (zod):
```typescript
z.discriminatedUnion('action', [
  z.object({
    action: z.literal('list_availability'),
    duration_minutes: z.number().min(15).max(120).default(30),
    days_ahead: z.number().min(1).max(14).default(5)
  }),
  z.object({
    action: z.literal('book'),
    start_iso: z.string().datetime(),
    duration_minutes: z.number().min(15).max(120),
    title: z.string().min(5).max(100),
    description: z.string().max(500).optional(),
    lead_email: z.string().email().optional()
  })
])
```

Descrição para o LLM: "Para agendar reunião, primeiro chame action=list_availability para ver horários. Apresente os 3 horários ao lead em formato amigável (ex: 'amanhã às 10h, quinta às 14h, ou sexta às 9h'). Quando lead escolher, chame action=book com o horário escolhido. Não envie link de calendário, ofereça horários direto na conversa."

Side effects (action=book): cria evento no Google Calendar via Hub, atualiza `leads.next_meeting_at`, cria registro em `veltzy.activity_logs`, dispara webhook se configurado.

Guardrails: bloqueia agendamento fora de business_hours, bloqueia agendamento em datas passadas, bloqueia agendamento com duração > max permitido por Agent Profile.

### Tool 3: send_payment_link

Propósito. Gera cobrança Asaas e envia link ao lead.

Schema (zod):
```typescript
z.object({
  amount_brl: z.number().positive().max(50000),
  description: z.string().min(5).max(200),
  due_date_iso: z.string().date(),
  payment_methods: z.array(z.enum(['PIX', 'BOLETO', 'CREDIT_CARD'])).min(1),
  installments: z.number().min(1).max(12).default(1),
  customer_data: z.object({
    name: z.string().min(2),
    document: z.string().optional(),  // CPF/CNPJ
    email: z.string().email().optional(),
    phone: z.string()
  })
})
```

Descrição para o LLM: "Gere cobrança quando lead confirmar interesse em comprar. amount_brl em reais. payment_methods pode ter PIX, BOLETO, CREDIT_CARD. due_date_iso é data de vencimento. installments para parcelamento no cartão. customer_data precisa ter pelo menos nome e telefone."

Side effects: cria cobrança via Hub asaas-create-charge, recebe URL do link, salva em `veltzy.payments` (nova tabela), envia URL na próxima mensagem ao lead.

Guardrails (críticos): bloqueia valores acima de `agent_profile.max_payment_value_brl` e escala para humano. Bloqueia datas de vencimento em mais de 30 dias. Bloqueia se customer_data.phone não bater com `leads.phone`.

### Tool 4: update_lead_field

Propósito. Atualiza campos arbitrários do lead durante conversa (nome, email, empresa, observações, tags).

Schema (zod):
```typescript
z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  company_name: z.string().optional(),
  observations: z.string().max(1000).optional(),
  tags_to_add: z.array(z.string()).optional(),
  tags_to_remove: z.array(z.string()).optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional()
})
```

Descrição: "Atualize campos do lead conforme ele compartilha informação. Use observations para anotar contexto importante. Use tags para classificar (ex: 'b2b', 'enterprise', 'urgente'). Não invente dados, só registre o que lead disse."

Side effects: update direto em `veltzy.leads`. Validação: não permite sobrescrever campos com valores vazios.

### Tool 5: escalate_to_human

Propósito. Transfere conversa para vendedor humano (já existe lógica em sdr-ai antigo, vai ser reaproveitada).

Schema (zod):
```typescript
z.object({
  reason: z.enum([
    'lead_qualificado',
    'fora_de_escopo',
    'lead_solicitou',
    'objecao_complexa',
    'pagamento_alto_valor',
    'reclamacao',
    'erro_tecnico',
    'limite_atingido'
  ]),
  summary: z.string().min(20).max(1000),
  recommended_action: z.string().max(200).optional(),
  urgency: z.enum(['low', 'medium', 'high']).default('medium')
})
```

Descrição: "Escale para humano quando: lead está qualificado e quer falar com vendedor, pergunta sai do seu escopo, lead pede expressamente humano, objeção complexa que você não consegue resolver, valor de cobrança acima do permitido, sinal de reclamação, ou erro técnico. summary é um resumo da conversa para o humano se contextualizar rapidamente."

Side effects (terminal=true): salva summary em `leads.transfer_summary`, troca instância do lead para a do vendedor designado, desativa `leads.is_ai_active`, cria notificação para vendedor/manager, envia mensagem de transferência ao lead via template do pipeline.

### Tool 6: schedule_followup

Propósito. Agenda follow-up para conversa que esfriou ou requer continuidade.

Schema (zod):
```typescript
z.object({
  delay_minutes: z.number().min(15).max(43200),  // 15min a 30 dias
  message: z.string().min(10).max(500),
  reasoning: z.string().min(10).max(300),
  cancel_if_lead_responds: z.boolean().default(true)
})
```

Descrição: "Agende follow-up quando: lead não respondeu e cadência base se aplica, lead pediu para falar em momento específico ('me liga semana que vem'), conversa esfriou mas tem potencial. delay_minutes desde agora. message será enviada quando chegar a hora. cancel_if_lead_responds=true cancela follow-up se lead voltar antes."

Side effects: cria registro em `veltzy.sdr_followups` com status=pending, scheduled_for, message, reasoning. Cron `sdr-followup-scheduler` processa a cada 5 min.

Lógica híbrida: agente pode chamar com delay_minutes que difere da cadência base, registrando reasoning. Exemplo: cadência base é 1d, lead disse "me liga sexta às 14h", agente chama com delay_minutes que aponta para sexta 14h e reasoning="lead pediu sexta 14h".

### Tool 7: query_business_knowledge

Propósito. Busca semântica na knowledge base da empresa (RAG).

Schema (zod):
```typescript
z.object({
  query: z.string().min(5).max(500),
  top_k: z.number().min(1).max(10).default(5)
})
```

Descrição: "Use esta tool quando precisar de informação específica sobre produtos, preços, FAQs, políticas, ou diferenciais que a empresa carregou. Pergunte em forma de pergunta natural ('Qual o preço do plano Pro?' ou 'Quais são as formas de pagamento aceitas?'). Não invente informação, sempre consulte primeiro."

Side effects: gera embedding da query via Hub `/v1/ai/embeddings`, faz busca em `veltzy.agent_knowledge_chunks` com pgvector, retorna top_k chunks mais relevantes com score de similaridade. Resultados vão pro contexto da próxima iteração do loop.

Guardrails: se top_k chunks têm score < 0.7, retorna `{ ok: true, data: { chunks: [], warning: 'Nenhum resultado relevante encontrado' } }` e o LLM saberá não inventar resposta.

### Tool 8: end_conversation

Propósito. Encerra conversa quando objetivo atingido ou lead claramente perdido.

Schema (zod):
```typescript
z.object({
  outcome: z.enum([
    'objetivo_atingido',
    'lead_nao_qualificado',
    'lead_pediu_para_parar',
    'erro_irrecuperavel',
    'timeout'
  ]),
  final_message: z.string().min(10).max(300).optional(),
  summary: z.string().min(20).max(500)
})
```

Descrição: "Encerre conversa quando: objetivo do agente foi atingido (reunião agendada, pagamento gerado, lead transferido), lead claramente não tem perfil ('só estava curioso', 'não tenho interesse'), lead pediu para não receber mais mensagens, erro impossível de recuperar. final_message é a última mensagem ao lead (opcional, pode ser silencioso)."

Side effects (terminal=true): atualiza `veltzy.sdr_conversations.status` para completed, registra outcome e summary, envia final_message se fornecida, libera lead da fila ativa do SDR.

## 10. Knowledge Base e RAG

### Pipeline de ingestão

Admin faz upload de até 10 arquivos por Agent Profile. Tipos aceitos: PDF, DOCX, TXT, MD. Tamanho máximo 10MB por arquivo.

A primeira etapa é upload via Veltzy admin UI para Supabase Storage bucket `agent-knowledge`, path `{company_id}/{agent_profile_id}/{filename}`.

A segunda etapa é Edge Function `sdr-knowledge-ingest` (dispara quando upload completa). Extrai texto: PDF via pdf-parse, DOCX via mammoth, TXT/MD direto. Faz chunking: 500 tokens por chunk com overlap de 50 tokens. Gera embedding de cada chunk via Hub `/v1/ai/embeddings` (modelo text-embedding-3-small da OpenAI, 1536 dimensões). Salva em `veltzy.agent_knowledge_chunks` com pgvector.

A terceira etapa é atualização de status no Agent Profile: knowledge_base_status='processing' durante extração, 'ready' quando completo, 'error' se falha. knowledge_base_version incrementa a cada ingestão bem sucedida.

### Schema do chunk

```typescript
interface AgentKnowledgeChunk {
  id: string
  agent_profile_id: string
  company_id: string                  // RLS
  source_file_name: string
  source_file_url: string
  chunk_index: number                 // posição no documento original
  content: string                     // texto do chunk
  embedding: number[]                 // vector(1536)
  metadata: {
    page_number?: number
    section_title?: string
    word_count: number
  }
  knowledge_base_version: number
  created_at: timestamptz
}
```

### Migration pgvector

```sql
-- Habilitar extensão (uma vez por projeto)
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela
CREATE TABLE veltzy.agent_knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_profile_id uuid NOT NULL REFERENCES veltzy.agent_profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  source_file_name text NOT NULL,
  source_file_url text NOT NULL,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  knowledge_base_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON veltzy.agent_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_akc_profile ON veltzy.agent_knowledge_chunks(agent_profile_id);
CREATE INDEX idx_akc_version ON veltzy.agent_knowledge_chunks(agent_profile_id, knowledge_base_version);
```

### Função de busca

```sql
CREATE OR REPLACE FUNCTION veltzy.search_knowledge_chunks(
  p_agent_profile_id uuid,
  p_query_embedding vector(1536),
  p_top_k integer DEFAULT 5,
  p_min_score float DEFAULT 0.7
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE sql SECURITY DEFINER SET search_path = veltzy, public
AS $$
  SELECT
    id,
    content,
    1 - (embedding <=> p_query_embedding) AS similarity,
    metadata
  FROM veltzy.agent_knowledge_chunks
  WHERE agent_profile_id = p_agent_profile_id
    AND knowledge_base_version = (
      SELECT knowledge_base_version
      FROM veltzy.agent_profiles
      WHERE id = p_agent_profile_id
    )
  ORDER BY embedding <=> p_query_embedding
  LIMIT p_top_k * 2
$$;
```

### Versionamento

Cada upload novo incrementa `agent_profile.knowledge_base_version`. Busca filtra pela versão atual. Chunks antigos não são deletados imediatamente: limpeza ocorre via cron diário (chunks de versões 3+ atrás são removidos). Isso permite rollback rápido se nova versão piorou comportamento.

### Edição manual

Admin pode visualizar chunks individuais na UI. Pode editar texto ou deletar chunk específico (recalcula embedding na hora). Pode marcar chunk como "priority" (boost no ranking).

## 11. Integração com Hub

### Endpoint /v1/ai/complete

**Path.** `POST /functions/v1/ai-complete` (Hub Edge Function).

**Auth.** Service role key compartilhada entre Veltzy e Hub (vai em header `Authorization: Bearer {service_role}`) MAIS header `x-veltzy-company-id: {uuid}` para identificar tenant.

**Request body:**
```typescript
{
  company_id: string
  product: 'veltzy' | 'leadbaze' | 'powerv'
  feature: string              // ex: 'sdr-engine'
  lead_id?: string             // para correlação no ai_usage
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string | null
    tool_calls?: Array<...>
    tool_call_id?: string
  }>
  tools?: Array<{              // OpenAI tool format
    type: 'function'
    function: {
      name: string
      description: string
      parameters: Record<string, unknown>
    }
  }>
  max_tokens?: number
  temperature?: number
}
```

**Response body:**
```typescript
{
  ok: boolean
  data?: {
    content: string | null
    tool_calls?: Array<{
      id: string
      type: 'function'
      function: { name: string; arguments: string }
    }>
    usage: {
      prompt_tokens: number
      completion_tokens: number
      total_tokens: number
      cost_usd: number
    }
    model: string
    finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter'
  }
  error?: {
    code: 'TENANT_DISABLED' | 'LIMIT_EXCEEDED' | 'PROVIDER_ERROR' | 'INVALID_REQUEST'
    message: string
    details?: unknown
  }
}
```

**Comportamento interno do Hub:**

A primeira coisa é validar tenant: lê `tenant_ai_config` pelo company_id, confere `is_ai_enabled=true`, confere `current_month_spend_usd < monthly_limit_usd`. Falha qualquer um, retorna `TENANT_DISABLED` ou `LIMIT_EXCEEDED`.

A segunda é resolver modelo: lê `ai_model_config` filtrando por product e feature, pega provider e model_id. Default fallback se não encontrar: `openai/gpt-4o-mini`.

A terceira é chamar provider (OpenAI). Repassa messages e tools no formato esperado, com max_tokens e temperature.

A quarta é calcular custo. Usa tabela hardcoded de preços por modelo (input/output token rates). Calcula cost_usd = (prompt_tokens * input_rate + completion_tokens * output_rate) / 1_000_000.

A quinta é registrar uso. Insert em `ai_usage` com: company_id, product, feature, lead_id, model, tokens_input, tokens_output, cost_usd, latency_ms, status, created_at. Chama `increment_ai_spend(company_id, cost_usd)` para atualizar `tenant_ai_config.current_month_spend_usd`.

A sexta é retornar resposta no formato padronizado.

### Endpoint /v1/ai/embeddings

Mais simples. Recebe `{ company_id, product, feature, input: string | string[] }`. Retorna `{ embeddings: number[][], usage: {...}, cost_usd }`. Registra em `ai_usage` com feature='embeddings'.

### Autenticação service-to-service

Veltzy Edge Functions chamam Hub Edge Functions usando o service_role key do Supabase Central. Header pattern:
```typescript
headers: {
  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
  'x-veltzy-company-id': companyId,
  'Content-Type': 'application/json'
}
```

Hub verifica que o caller é uma Edge Function autorizada (não cliente direto) e valida company_id.

### Retry e fallback

Veltzy `sdr-engine` tem retry com backoff exponencial: 3 tentativas em caso de timeout ou erro 5xx. Em caso de TENANT_DISABLED ou LIMIT_EXCEEDED, não retry: agente envia mensagem padrão ("Estou indisponível no momento. Vou te conectar com alguém da equipe.") e chama `escalate_to_human` com reason='limite_atingido'.

## 12. Limites e cobrança

### Plano por subscription

Tabela `public.subscriptions` (cria se não existe na Onda 0):
```typescript
{
  company_id: string
  product: 'veltzy' | 'leadbaze' | 'powerv'
  plan: 'starter' | 'pro' | 'enterprise'
  status: 'trial' | 'active' | 'cancelled' | 'expired'
  trial_ends_at?: timestamptz
  current_period_ends_at: timestamptz
}
```

Mapping plano → limite mensal (em USD no banco, convertido pra BRL na UI):
- Starter: 10 USD (≈ R$ 50)
- Pro: 40 USD (≈ R$ 200)
- Enterprise: NULL (ilimitado)

Trigger ao criar subscription: cria/atualiza `tenant_ai_config` com `monthly_limit_usd` correspondente.

### Conversão USD/BRL

Decisão final: mantém USD no banco do Hub, exibe BRL na UI. Conversão via constante `USD_TO_BRL` no frontend do Hub (atualmente 5.0, configurável). Quando ecossistema crescer, virar tabela `currency_rates` atualizada via cron.

### Soft warning aos 80%

Quando `current_month_spend_usd / monthly_limit_usd >= 0.80`, dispara notificação para admin da empresa: email via Brevo e push notification no Veltzy. Mensagem: "Você usou 80% do seu limite mensal de IA. Considere ajustar uso ou upgrade de plano."

### Hard block aos 100%

Quando `current_month_spend_usd >= monthly_limit_usd`, Hub passa a retornar `LIMIT_EXCEEDED` em todas as chamadas. SDR v2 detecta e responde ao lead com mensagem padrão de indisponibilidade e escala. Reset automático no primeiro dia do mês via cron `reset_monthly_ai_spend`.

### Override manual

Super Admin no Hub pode aplicar override de limite para empresa específica. Tabela `tenant_ai_config_overrides` (cria na Onda 0):
```typescript
{
  company_id: string
  override_limit_usd: number      // sobrescreve limit do plano
  reason: string                  // auditoria
  expires_at?: timestamptz        // temporário ou permanente
  granted_by: uuid                // FK profiles (super_admin)
  granted_at: timestamptz
}
```

### Kill switch global

Tabela `public.system_flags` (cria na Onda 0):
```typescript
{
  key: 'ai_globally_enabled' | 'ai_company_disabled'
  value: jsonb
}
```

Quando `ai_globally_enabled.value = false`, Hub retorna `PROVIDER_ERROR` com message "IA globalmente desabilitada" em todas as chamadas. Quando `ai_company_disabled.value` contém array de company_ids, essas empresas têm IA desabilitada (override de tenant_ai_config.is_ai_enabled).

### Budgets multi-camada (no Veltzy sdr-engine)

Limite mensal por empresa: validado pelo Hub. Limite de tokens por conversa: validado pelo BudgetEnforcer (default 50k, configurável por Agent Profile). Limite de iterações por turn: validado pelo AgentLoop (default 10). Limite de tool calls por turn: validado pelo AgentLoop (default 5).

### Alertas Slack/email

Webhook Slack configurável por empresa (admin coloca URL do webhook em integrações). Email via Brevo (já está nas integrações do Hub).

Alertas dispara: soft warning 80%, hard block 100%, erro repetido (3+ erros consecutivos no Hub para mesma empresa), tool failure rate > 20% em uma hora.

## 13. Modo de operação (full-auto vs suggest-mode)

### Full-auto

Default. Agente responde direto ao lead via WhatsApp. Vendedor recebe notificação que IA está atendendo. Pode interromper a qualquer momento clicando "Assumir conversa" no Inbox (desativa is_ai_active do lead).

### Suggest-mode

Agente gera mensagem mas não envia. Mensagem fica em painel de aprovação no Veltzy (`/inbox?filter=pending_approval`). Vendedor revisa, edita se quiser, e clica "Enviar" para mandar ao lead. Cada tool call gera "card de aprovação" descrevendo o que IA quer fazer (ex: "IA quer agendar reunião amanhã às 10h. [Aprovar] [Rejeitar] [Editar]").

### Transição entre modos

Admin pode trocar modo a qualquer momento no Agent Profile. Conversas em andamento mantêm modo original até encerrar. Novas conversas usam modo atualizado.

## 14. Follow-up híbrido

### Cadência base

Configurável por Agent Profile (`followup_cadence: number[]`). Default sugerido: `[60, 1440, 4320, 10080, 20160]` (1h, 1d, 3d, 7d, 14d em minutos). Após o último follow-up sem resposta, status do lead vai para `lost` automaticamente.

### Lógica híbrida

Quando lead não responde, agente decide se segue cadência base ou se ajusta. Exemplo: lead disse "me liga amanhã às 14h" antes de parar de responder. Agente chama `schedule_followup` com `delay_minutes` calculado para amanhã 14h e `reasoning="lead pediu amanhã 14h"`. Cadência base é ignorada.

Outro exemplo: lead demonstrou urgência alta antes de sumir. Agente pode antecipar primeiro follow-up de 1h para 15min, com `reasoning="lead demonstrou urgência alta"`.

Outro exemplo: lead pediu para falar "semana que vem". Agente pula primeiro e segundo follow-up, agenda direto para 7 dias depois, com `reasoning="lead pediu próxima semana"`.

### Scheduler

Edge Function `sdr-followup-scheduler` roda via cron a cada 5 minutos. Lê `veltzy.sdr_followups` com `status='pending' AND scheduled_for <= now()`. Para cada follow-up: verifica se conversa não foi resolvida (lead respondeu antes), se sim cancela. Caso contrário, dispara nova iteração do agent loop com mensagem inicial sendo o `followup.message`.

### Cancelamento

Follow-ups com `cancel_if_lead_responds=true` (default) são automaticamente cancelados quando lead manda nova mensagem. Trigger no insert de `veltzy.messages` com `sender_type='lead'` faz update em `sdr_followups` setando status='cancelled'.

## 15. Métricas e Dashboard

### KPIs no Veltzy (visão da empresa)

Conversas iniciadas (total e por período). Taxa de qualificação (qualified / total conversas, onde qualified = score >= 60). Reuniões agendadas (count de tool_calls schedule_meeting com action=book bem sucedidos). Pagamentos enviados (count de tool_calls send_payment_link bem sucedidos). Pagamentos confirmados (via webhook Asaas). Taxa de conversão (sales_closed / qualified_leads). Tempo médio até qualificação. Custo médio por conversa (em BRL via conversão). Custo por reunião agendada. Custo por venda fechada.

### Filtros do dashboard

Período (hoje, 7d, 30d, 90d, custom). Pipeline. Agent Profile. Outcome (objetivo_atingido, escalated, lost). Modo (full_auto, suggest).

### Visão no Hub (Super Admin)

Lista de empresas com uso de IA, ordenado por custo descendente. Por empresa: gasto do mês, % do limite usado, conversas SDR no mês, custo médio por conversa. Gráfico temporal de custo total agregado do ecossistema. Margem por cliente (futuro, depende de billing).

## 16. Plano de Ondas

### Onda 0: pré-requisitos no Hub (1-2 semanas)

Crítico. Sem isso, SDR v2 não roda.

Entregáveis:
- Edge Function `ai-complete` (proxy IA com validação tenant e registro)
- Edge Function `ai-embeddings` (proxy embeddings)
- Tabela `public.subscriptions` (se não existe)
- Tabela `public.tenant_ai_config_overrides`
- Tabela `public.system_flags` (kill switch)
- Trigger de criação de tenant_ai_config a partir de subscription
- Tabela hardcoded de preços por modelo OpenAI
- Trigger de soft warning 80%
- Edge Function `send-ai-alert` (Brevo + Slack)
- UI no Hub: kill switch toggle, gestão de overrides, visualização de alertas

Critério de "pronto pra Onda 1": Veltzy consegue chamar `ai-complete` com tools, recebe resposta válida com tool_calls, e o registro aparece em `ai_usage` com cost_usd correto.

### Onda 1: SDR core no Veltzy (3-4 semanas)

Entregáveis:
- Migrations: `veltzy.agent_profiles`, `veltzy.agent_knowledge_chunks` (pgvector), `veltzy.sdr_conversations`, `veltzy.sdr_followups`, `veltzy.sdr_tool_calls`, `veltzy.payments`
- Edge Function `sdr-engine` (agent harness completo)
- Edge Function `sdr-knowledge-ingest` (upload e processamento de docs)
- 4 tools básicas: qualify_lead, update_lead_field, escalate_to_human, query_business_knowledge
- Wizard de onboarding do Agent Profile (guiado + profundo)
- Upload de docs + extração + chunking + embeddings
- Sandbox de teste
- Modo full-auto (suggest-mode fica pra Onda 3)
- Dashboard de métricas SDR v2 (KPIs básicos)
- Modificação em evolution-inbound: dispatch para sdr-engine quando aplicável
- Modificação em whatsapp-send: usa instância do SDR (pipelines.sdr_instance_name)

Critério de "pronto pra Onda 2": agente conversa com lead via WhatsApp, qualifica, consulta knowledge base, escala para humano. Métricas básicas aparecem no dashboard.

### Onda 2: tools de venda (2-3 semanas)

Entregáveis:
- Hub: Edge Functions Asaas (`asaas-create-charge`, `asaas-list-charges`, `asaas-webhook`)
- Hub: tabela `public.asaas_configs` por empresa (API key, webhook secret)
- Hub: Edge Functions Google Calendar (`gcal-list-availability`, `gcal-create-event`, `gcal-oauth-callback`)
- Hub: tabela `public.gcal_connections` (OAuth tokens por empresa ou por usuário)
- Veltzy: tools `schedule_meeting`, `send_payment_link` registradas no ToolRegistry
- Veltzy: webhook handler para confirmações Asaas (atualiza payment status)
- Veltzy: configuração na UI de Agent Profile: calendário do vendedor vs empresa
- Veltzy: visualização de pagamentos gerados pelo agente no lead

Critério de "pronto pra Onda 3": agente agenda reuniões e gera links de pagamento de verdade. Webhook Asaas atualiza status. Eventos aparecem no Google Calendar.

### Onda 3: follow-up híbrido e suggest-mode (2 semanas)

Entregáveis:
- Veltzy: Edge Function `sdr-followup-scheduler` (cron 5min)
- Veltzy: tool `schedule_followup` registrada
- Veltzy: tool `end_conversation` registrada
- Veltzy: lógica de antecipar/adiar com justificativa
- Veltzy: trigger de cancelamento ao lead responder
- Veltzy: UI suggest-mode (painel de aprovação no Inbox)
- Veltzy: toggle full-auto / suggest-mode no Agent Profile
- Veltzy: tratamento de transição entre modos

Critério de "pronto pra Onda 4": agente faz follow-up autônomo com cadência híbrida. Empresas conseguem operar em suggest-mode.

### Onda 4: limites, alertas, kill switch (1-2 semanas)

Entregáveis:
- Hub: alertas Slack + email funcionando
- Hub: dashboard de uso agregado e por empresa
- Veltzy: notificações in-app de soft warning e hard block
- Veltzy: mensagem padrão de indisponibilidade ao lead quando limite atingido
- Hub: UI de kill switch global e por empresa
- Hub: UI de override manual de limite
- Hub: relatório de margem por cliente (receita do plano vs custo IA)

Critério de "pronto pra GA": empresa consegue operar mês inteiro sem intervenção manual. Limites funcionam corretamente. Alertas chegam. Super Admin tem controle total.

### Estimativa total

9 a 13 semanas. Pode comprimir paralelizando Onda 1 e início de Onda 2 (Asaas e GCal não dependem de SDR core estar pronto).

## 17. Schema completo (migrations)

### veltzy.agent_profiles

```sql
CREATE TABLE veltzy.agent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL UNIQUE REFERENCES veltzy.pipelines(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  
  agent_name text NOT NULL,
  agent_gender text NOT NULL CHECK (agent_gender IN ('female', 'male', 'neutral')),
  tone text NOT NULL CHECK (tone IN ('formal', 'informal', 'coloquial', 'tecnico')),
  personality text NOT NULL CHECK (personality IN ('consultiva', 'objetiva', 'calorosa', 'tecnica')),
  disclose_ai boolean NOT NULL DEFAULT true,
  
  company_description text NOT NULL,
  value_proposition text NOT NULL,
  differentiators text,
  ideal_customer_profile text,
  
  purpose text NOT NULL CHECK (purpose IN ('qualification', 'appointment_booking', 'direct_sales', 'support', 'recovery')),
  primary_goal text NOT NULL,
  
  enabled_tools text[] NOT NULL DEFAULT '{}',
  
  max_iterations_per_turn integer NOT NULL DEFAULT 10,
  max_tokens_per_conversation integer NOT NULL DEFAULT 50000,
  max_payment_value_brl numeric NOT NULL DEFAULT 5000,
  operating_mode text NOT NULL DEFAULT 'full_auto' CHECK (operating_mode IN ('full_auto', 'suggest_mode')),
  business_hours jsonb NOT NULL DEFAULT '{}',
  
  followup_cadence integer[] NOT NULL DEFAULT ARRAY[60, 1440, 4320, 10080, 20160],
  followup_max_attempts integer NOT NULL DEFAULT 5,
  
  knowledge_base_status text NOT NULL DEFAULT 'empty' CHECK (knowledge_base_status IN ('empty', 'processing', 'ready', 'error')),
  knowledge_base_version integer NOT NULL DEFAULT 0,
  
  forbidden_topics text[] NOT NULL DEFAULT '{}',
  must_escalate_keywords text[] NOT NULL DEFAULT '{}',
  custom_guardrails text,
  
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_profiles_company ON veltzy.agent_profiles(company_id);
ALTER TABLE veltzy.agent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON veltzy.agent_profiles
  USING (company_id = get_current_company_id() OR is_super_admin());
```

### veltzy.sdr_conversations

```sql
CREATE TABLE veltzy.sdr_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES veltzy.leads(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES veltzy.pipelines(id),
  agent_profile_id uuid NOT NULL REFERENCES veltzy.agent_profiles(id),
  company_id uuid NOT NULL,
  
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'completed', 'abandoned', 'failed')),
  current_iteration integer NOT NULL DEFAULT 0,
  total_iterations integer NOT NULL DEFAULT 0,
  total_tokens_used integer NOT NULL DEFAULT 0,
  total_cost_usd numeric NOT NULL DEFAULT 0,
  
  end_reason text,
  end_summary text,
  
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX idx_sdr_conv_lead ON veltzy.sdr_conversations(lead_id);
CREATE INDEX idx_sdr_conv_status ON veltzy.sdr_conversations(status) WHERE status = 'active';
```

### veltzy.sdr_followups

```sql
CREATE TABLE veltzy.sdr_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES veltzy.sdr_conversations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL,
  company_id uuid NOT NULL,
  
  attempt_number integer NOT NULL,
  scheduled_for timestamptz NOT NULL,
  message text NOT NULL,
  reasoning text NOT NULL,
  cancel_if_lead_responds boolean NOT NULL DEFAULT true,
  
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  sent_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sdr_followups_pending ON veltzy.sdr_followups(scheduled_for)
  WHERE status = 'pending';
```

### veltzy.sdr_tool_calls

```sql
CREATE TABLE veltzy.sdr_tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES veltzy.sdr_conversations(id) ON DELETE CASCADE,
  iteration_number integer NOT NULL,
  
  tool_name text NOT NULL,
  arguments jsonb NOT NULL,
  result jsonb,
  status text NOT NULL CHECK (status IN ('success', 'validation_failed', 'execution_failed', 'guardrail_blocked')),
  error_message text,
  
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sdr_tool_calls_conv ON veltzy.sdr_tool_calls(conversation_id);
```

### veltzy.payments

```sql
CREATE TABLE veltzy.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES veltzy.leads(id),
  conversation_id uuid REFERENCES veltzy.sdr_conversations(id),
  company_id uuid NOT NULL,
  
  asaas_charge_id text NOT NULL UNIQUE,
  amount_brl numeric NOT NULL,
  description text NOT NULL,
  payment_methods text[] NOT NULL,
  due_date date NOT NULL,
  payment_url text NOT NULL,
  
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'overdue', 'cancelled', 'refunded')),
  paid_at timestamptz,
  
  generated_by text NOT NULL CHECK (generated_by IN ('sdr_ai', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_lead ON veltzy.payments(lead_id);
CREATE INDEX idx_payments_status ON veltzy.payments(status);
```

### Migrations no Hub (Onda 0)

```sql
-- public.subscriptions (se não existir)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product text NOT NULL CHECK (product IN ('veltzy', 'leadbaze', 'powerv')),
  plan text NOT NULL CHECK (plan IN ('starter', 'pro', 'enterprise')),
  status text NOT NULL CHECK (status IN ('trial', 'active', 'cancelled', 'expired')),
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, product)
);

-- public.tenant_ai_config_overrides
CREATE TABLE public.tenant_ai_config_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  override_limit_usd numeric NOT NULL,
  reason text NOT NULL,
  expires_at timestamptz,
  granted_by uuid NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now()
);

-- public.system_flags
CREATE TABLE public.system_flags (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.system_flags (key, value) VALUES
  ('ai_globally_enabled', 'true'::jsonb),
  ('ai_company_disabled', '[]'::jsonb);
```

## 18. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Alucinação de preço | Tool query_business_knowledge consultada antes de mencionar preço. GuardrailChecker flagga resposta com R$ ou números sem source na KB. |
| Prometer prazo | GuardrailChecker flagga palavras "dias", "semanas", "horas" em resposta. Se não vier de KB ou de tool, bloqueia ou alerta. |
| Agendar fora do comercial | schedule_meeting valida business_hours antes de oferecer/aceitar horário. |
| Cobrança duplicada | send_payment_link valida que não existe cobrança 'pending' para mesmo lead nos últimos 24h. |
| Loop infinito | AgentLoop tem max_iterations hardcoded em 15 (sobrescreve config). BudgetEnforcer encerra. |
| Conversa que não termina | Heartbeat de 7 dias sem mensagem fecha conversa automaticamente com outcome='abandoned'. |
| Banimento Meta | Purpose declarado por pipeline. Tools restritas por purpose. Fallback fora de escopo. |
| Custo descontrolado | Budgets multi-camada. Tabela hardcoded de preços por modelo. Alertas 80% e hard block 100%. |
| Lead trollando (mensagens longas, repetitivas, ofensivas) | BudgetEnforcer por conversa. Tool end_conversation com outcome='lead_pediu_para_parar'. Lista de keywords ofensivas que escalam. |
| Hub indisponível | sdr-engine tem retry. Após 3 falhas, envia mensagem padrão e escala. |
| Knowledge base ruim ou desatualizada | Sandbox de teste obrigatório antes de ativar. Versionamento permite rollback. Admin pode editar chunks. |
| OpenAI mudar API | Hub é o ponto único de adaptação. Veltzy não muda. |
| Empresa não consegue configurar Agent Profile sozinha | Wizard guiado com defaults inteligentes. Time interno faz onboarding boutique para primeiros clientes. |

## 19. Fora de escopo

Voz/telefone (Bland/RetellAI). Email outbound (Lindy/Apollo). Prospecção cold (scraping LinkedIn, web scraping). LinkedIn DM. Multi-agente colaborativo (um agente passando contexto para outro). Treinamento de modelo próprio (fine-tuning, RLHF). White-label do próprio agente (cliente do cliente vendo "agente da empresa X"). Suporte multi-idioma além de PT-BR. Integração com outros gateways de pagamento além de Asaas. Integração com outros calendários além de Google Calendar. Avaliação de qualidade do agente via LLM-as-judge (futuro, depois de termos volume).

## 20. Decisões registradas

1. Arquitetura: Hub é control plane, Veltzy é fachada. Veltzy chama Hub via /v1/ai/complete.
2. Escopo: qualifica + agenda + cobra + follow-up.
3. Pagamento: Asaas (PIX, boleto, cartão).
4. Agenda: Google Calendar OAuth no Hub. Conversacional, oferece 3 horários, sem link.
5. Configuração: por pipeline (não por empresa). Wizard guiado e profundo.
6. Modo: configurável por empresa, default full-auto.
7. Knowledge Base: upload PDF/docs, RAG com pgvector em veltzy.agent_knowledge_chunks.
8. Compliance: purpose declarado por pipeline (5 valores).
9. Limite: por plano (Starter R$50, Pro R$200, Enterprise ilimitado). USD no banco, BRL na UI.
10. Follow-up: híbrido (cadência base + IA ajusta com reasoning).
11. Kill switch: global e por empresa, no Hub.
12. Plano: ondas 0-4, 9-13 semanas estimadas.
13. Design partner zero: Veltz Group testa primeiro.

---

## 21. Documentação relevante

### Padrão canônico de agent loop
Fonte: Braintrust - "The canonical agent architecture: A while loop with tools"
URL: https://www.braintrust.dev/blog/agent-while-loop

### Agent harness
Fonte: AWS / Dev.to - "Building an AI Agent Harness from Scratch"
URL: https://dev.to/thedailyagent/building-an-ai-agent-harness-from-scratch-the-architecture-between-llm-and-agent-5gg6

### Compliance WhatsApp Meta jan/2026
Fonte: Chat Data - "WhatsApp Automation for Business: Build Task-Specific AI Workflows"
URL: https://www.chat-data.com/blog/whatsapp-automation-business-ai-workflows-openclaw

### Agendamento conversacional vs link
Fonte: SalesHive - "AI and Sales: The Emerging Influence of AI Calendar Integration"
URL: https://www.saleshive.com/blog (busca: AI calendar integration)

### Custo de agentes vs chatbots
Fonte: Oracle Developers - "What Is the AI Agent Loop"

### pgvector best practices
Fonte: Supabase Docs - https://supabase.com/docs/guides/ai/vector-columns

### OpenAI tool calling
Fonte: OpenAI Platform - https://platform.openai.com/docs/guides/function-calling

### Asaas API
Fonte: https://docs.asaas.com

### Google Calendar API
Fonte: https://developers.google.com/calendar/api/v3/reference

### Evolution API
Fonte: https://doc.evolution-api.com
