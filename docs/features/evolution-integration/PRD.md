# PRD: Integracao Evolution API via Hub

**Autor:** Toni Melo
**Data:** 2026-05-14
**Status:** Aprovado - PVOs validados, pronto para Spec

---

## 1. Contexto

### 1.1 Situacao atual

O Veltzy usa Z-API como provider unico de WhatsApp. A integracao funciona assim:

- **Recebimento:** Z-API envia webhook para `zapi-webhook` Edge Function do Veltzy, que valida token, cria/atualiza lead, salva mensagem, dispara SDR e automacoes.
- **Envio humano:** Frontend chama `zapi-send` Edge Function, que busca config do provider na `oauth_integrations`, instancia o provider via factory e envia.
- **Envio AI SDR:** Edge Function `sdr-ai` gera reply e chama `zapi-send` internamente via fetch.
- **Envio automacao:** Edge Function `run-automations` insere na `message_queue`, que e processada por `process-message-queue` chamando o provider Z-API diretamente.
- **Config:** Tabela `oauth_integrations` (provider='zapi', metadata com instance_id, token, client_token). Uma linha por empresa.
- **Provider abstraction:** Existe interface `WhatsAppProvider` com implementacao `ZApiProvider`, factory `createProvider()`, e `whatsapp-config.ts` para lookup.

### 1.2 Problema

Z-API e instavel, caro, e single-instance por empresa. Precisamos migrar para Evolution API, que e self-hosted, mais barato, e suporta multiplas instancias por empresa. A infra Evolution ja esta em producao no Hub (repo separado).

### 1.3 O que o Hub ja entrega

O Hub (Supabase Central, repo `veltzgroup/hub`) tem a feature `evolution-integration` completa:

| Recurso | Detalhe |
|---------|---------|
| **Tabelas** | `public.evolution_config` (config global), `public.evolution_instances` (instancias por empresa), `public.evolution_webhook_events` (log de eventos) |
| **Edge Functions** | `evolution-instance-manage` (CRUD instancias, QR code), `evolution-webhook-receiver` (recebe webhooks de TODAS as instancias, roteia por empresa), `evolution-send-message` (envia mensagem por qualquer instancia) |
| **UI** | Gerenciamento de instancias por empresa, criacao via QR code, status em tempo real |
| **Profiles** | `profiles.default_whatsapp_instance` (FK para `evolution_instances.instance_name`) |

---

## 2. Decisoes de arquitetura (locked)

Estas decisoes estao travadas. Nao questionar, apenas incorporar.

### D1. Hub e dono da infra
Veltzy **nunca** chama Evolution API diretamente. Todo envio passa pela Edge Function `evolution-send-message` do Supabase Central. Veltzy e consumidor, nao operador.

### D2. Multi-instancia por empresa
Cada empresa tem N numeros WhatsApp (N instancias Evolution). Vendedor envia sempre pelo numero do seu perfil (`profiles.default_whatsapp_instance`). Admin/manager podem escolher qualquer instancia da empresa.

### D3. Inbox unificada com filtro por instancia
Vendedor ve por padrao so conversas do numero dele. Admin/manager veem tudo com seletor "Todos os numeros / Numero X". Conversa e associada a instancia que recebeu, nao ao usuario.

### D4. AI SDR em modo autonomo
Instancia dedicada por pipeline (`pipelines.sdr_instance_name`). Quando qualifica, transfere conversa pro vendedor responsavel no numero dele.

### D5. Envio no kanban
Humano usa numero padrao do usuario. Automacao/SDR usa instancia configurada no pipeline.

### D6. Migracao gradual via feature flag
Z-API e Evolution coexistem por semanas. Cada empresa migra individualmente. Feature flag `whatsapp_provider` em `companies.features` controla qual provider esta ativo. Nao e big-bang.

### D7. Webhook unico
`evolution-webhook-receiver` (Supabase Central) recebe eventos de todas as instancias e roteia pela empresa via `instance_name`. O Hub notifica o Veltzy via chamada a um novo endpoint do Veltzy.

---

## 3. Modelo de dados - Mudancas no Veltzy

### 3.1 Tabelas existentes a alterar

#### `public.profiles`
```sql
ALTER TABLE public.profiles
  ADD COLUMN default_whatsapp_instance TEXT DEFAULT NULL;
-- Texto livre (instance_name), sem FK para Hub.
-- Preenchido pelo admin ao configurar o vendedor.
```

#### `veltzy.leads`
```sql
ALTER TABLE veltzy.leads
  ADD COLUMN whatsapp_instance_name TEXT DEFAULT NULL;
-- Instancia que recebeu/iniciou a conversa.
-- Usado para filtro no inbox e roteamento de envio.
```

#### `veltzy.pipelines`
```sql
ALTER TABLE veltzy.pipelines
  ADD COLUMN sdr_instance_name TEXT DEFAULT NULL,
  ADD COLUMN sdr_transfer_message_template TEXT DEFAULT NULL;
-- sdr_instance_name: instancia dedicada para AI SDR neste pipeline.
--   Quando null, SDR usa instancia padrao do vendedor.
-- sdr_transfer_message_template: template da mensagem enviada ao lead quando
--   SDR transfere para humano. Suporta variavel {vendedor_nome}.
--   Fallback: "Ola! A partir de agora voce sera atendido por {vendedor_nome}.
--     Em breve ele entrara em contato."
```

#### `veltzy.messages`
```sql
ALTER TABLE veltzy.messages
  ADD COLUMN instance_name TEXT DEFAULT NULL,
  ADD COLUMN delivery_status TEXT DEFAULT 'sent'
    CHECK (delivery_status IN ('sent', 'failed', 'pending'));
-- instance_name: qual instancia enviou/recebeu esta mensagem (auditoria e debug).
-- delivery_status: 'sent' (entregue ao provider), 'failed' (instancia offline ou erro),
--   'pending' (aguardando envio). Default 'sent' para retrocompatibilidade.
```

#### `veltzy.message_queue`
```sql
ALTER TABLE veltzy.message_queue
  ADD COLUMN instance_name TEXT DEFAULT NULL;
-- Qual instancia usar para enviar.
```

#### `public.companies` (campo existente)
```
companies.active_whatsapp_provider: 'zapi' | 'evolution' | 'disabled'
-- Ja existe com default 'zapi'. Adicionar 'evolution' como valor valido.
-- whatsapp-config.ts ja le esse campo para roteamento.
-- Nao usar JSONB features para isso; campo dedicado e mais simples.
```

### 3.2 Nenhuma tabela nova no Veltzy

As tabelas de infra Evolution (`evolution_config`, `evolution_instances`, `evolution_webhook_events`) vivem no Hub. Veltzy nao replica dados de instancias -- consulta via Edge Function quando necessario (ex: listar instancias para seletor no admin).

---

## 4. Fluxos reescritos

### 4.1 Recebimento de mensagem (webhook)

**Antes (Z-API):**
```
Z-API --> POST zapi-webhook (Veltzy) --> valida token, cria lead, salva msg
```

**Depois (Evolution):**
```
Evolution API --> POST evolution-webhook-receiver (Hub)
  --> Hub identifica empresa pelo instance_name
  --> Hub chama POST evolution-inbound (Veltzy) com payload normalizado
    --> Veltzy cria/atualiza lead (com whatsapp_instance_name)
    --> Veltzy salva mensagem (com instance_name)
    --> Veltzy dispara SDR e automacoes
```

**Nova Edge Function no Veltzy: `evolution-inbound`**

Payload recebido do Hub (ja normalizado):
```typescript
interface EvolutionInboundPayload {
  company_id: string
  instance_name: string
  phone: string           // formato internacional sem +
  sender_name?: string
  message_id: string       // ID externo do Evolution
  content: string
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document'
  media_url?: string
  media_mime_type?: string
  timestamp: string
  // Meta Ads context (se aplicavel)
  ad_context?: {
    ad_id?: string
    ad_title?: string
    source_url?: string
    ctwa_clid?: string
  }
}
```

Logica:
1. Valida `x-hub-secret` header (shared secret entre Hub e Veltzy)
2. Verifica `companies.active_whatsapp_provider = 'evolution'` para a empresa
3. Busca/cria lead por (company_id, phone)
4. Se lead novo: atribui pipeline, stage, vendedor (mesma logica do zapi-webhook)
5. Seta `lead.whatsapp_instance_name = payload.instance_name`
6. Salva mensagem com `source='whatsapp'`, `instance_name=payload.instance_name`
7. Dispara `sdr-ai` e `run-automations` (mesma logica existente)

### 4.2 Envio humano (inbox/chat)

**Antes:**
```
Frontend --> zapi-send (Veltzy) --> Z-API diretamente
```

**Depois:**
```
Frontend --> whatsapp-send (Veltzy, renomeado)
  --> Determina instance_name:
      - Se lead.whatsapp_instance_name existe: usa esse (responde pelo mesmo numero)
      - Senao: usa profile.default_whatsapp_instance do vendedor
  --> Chama evolution-send-message (Hub) com instance_name + phone + content
  --> Salva mensagem com instance_name
```

**Refactor: `zapi-send` --> `whatsapp-send`**

A Edge Function `zapi-send` sera refatorada para `whatsapp-send` com logica de roteamento:

```typescript
// Pseudo-codigo
const provider = await getActiveProvider(companyId) // 'zapi' | 'evolution'

if (provider === 'evolution') {
  const instanceName = resolveInstanceName(lead, profile)

  // Vendedor sem numero configurado: erro 400
  if (!instanceName) {
    return error(400, 'Configure seu numero WhatsApp em Minha Conta para enviar mensagens.')
  }

  await callHubEvolutionSend(instanceName, phone, content)
} else {
  // Fluxo Z-API existente (mantido durante migracao)
  const config = await getWhatsAppConfig(supabase, companyId)
  const provider = createProvider(config.provider)
  await provider.sendMessage(config, payload)
}
```

**Validacao vendedor sem numero (PVO 2):** Envio bloqueado com erro 400 no backend. Frontend exibe toast: "Configure seu numero WhatsApp em Minha Conta para enviar mensagens." Chat input desabilitado quando `profile.default_whatsapp_instance` e null e provider e 'evolution'.

### 4.3 Envio AI SDR

**Antes:**
```
sdr-ai --> fetch zapi-send internamente
```

**Depois:**
```
sdr-ai --> fetch whatsapp-send internamente
  --> Determina instance_name:
      - pipeline.sdr_instance_name (se configurado)
      - OU profile.default_whatsapp_instance do vendedor atribuido
  --> Salva mensagem com instance_name e sender_type='ai'
```

**Instancia SDR offline (PVO 4):** SDR processa qualificacao normalmente (score, temperature). A mensagem de reply e salva com `delivery_status='failed'` e `instance_name` da instancia offline. Admin ve alerta no dashboard de mensagens nao entregues. SDR nunca trava o pipeline por problema de envio.

### 4.4 Envio automacao (message_queue)

**Antes:**
```
run-automations --> insere message_queue
process-message-queue --> chama Z-API provider diretamente
```

**Depois:**
```
run-automations --> insere message_queue COM instance_name
process-message-queue
  --> Se provider='evolution': chama evolution-send-message (Hub)
  --> Se provider='zapi': chama Z-API diretamente (mantido)
```

### 4.5 Transfer de conversa (SDR --> vendedor)

Fluxo novo quando AI SDR qualifica lead e transfere:

1. SDR qualifica lead (temperature='hot', score >= 80)
2. SDR decide transferir (reply com flag `transfer: true` no JSON de resposta)
3. **Mensagem de transfer para o lead** (pelo numero do SDR, que o lead ja conhece):
   - Usa `pipeline.sdr_transfer_message_template` se configurado
   - Fallback: "Ola! A partir de agora voce sera atendido por {vendedor_nome}. Em breve ele entrara em contato."
   - Variavel `{vendedor_nome}` substituida pelo `profiles.name` do vendedor atribuido
   - Salva com `sender_type='ai'`, `instance_name=pipeline.sdr_instance_name`
   - Envia via `whatsapp-send` pelo numero do SDR
4. Veltzy atualiza `lead.is_ai_active = false`
5. Veltzy atualiza `lead.whatsapp_instance_name = profile.default_whatsapp_instance` do vendedor atribuido
6. **Resumo IA para o vendedor** (notificacao interna, NAO para o lead):
   - Edge Function `sdr-ai` gera resumo das ultimas 5 mensagens via chamada IA
   - Formato: "Lead {nome} transferido do SDR. Resumo: {resumo_ia}. {n} mensagens trocadas."
   - Salva como `notifications` com `type='lead_transferred'` e `action_data` contendo resumo
   - Vendedor ve no notification center e como badge no card do lead no kanban
7. Proximo envio humano sai pelo numero do vendedor

**Nota:** A conversa muda de instancia. O lead pode ter historico em 2 numeros diferentes. O inbox mostra tudo unificado por lead, independente da instancia.

---

## 5. Mudancas no frontend

### 5.1 Inbox - Filtro por instancia

**Componente:** `conversation-list.tsx`

- Admin/manager: seletor no topo "Todos os numeros / Numero X"
  - Lista instancias da empresa (chamada a Hub Edge Function ou cache local)
  - Filtra por `lead.whatsapp_instance_name`
- **Vendedor:** ve todos os leads atribuidos a ele (`assigned_to = user.id`), independente de qual numero originou a conversa. O filtro por instancia e exclusivo para admin/manager. Criterio primario do vendedor e atribuicao, nao numero.

**Componente:** `conversation-item.tsx`
- Badge discreto mostrando de qual numero veio (ultimos 4 digitos ou label da instancia)

### 5.2 Chat Window - Indicador de instancia

**Componente:** `chat-header.tsx`
- Mostra qual numero esta sendo usado para envio (instance_name ou phone do numero)
- Admin/manager: dropdown para trocar instancia de envio (override temporario)

**Componente:** `chat-input.tsx`
- Quando `provider='evolution'` e `profile.default_whatsapp_instance = null`:
  - Input desabilitado
  - Placeholder: "Configure seu numero WhatsApp em Minha Conta"
  - Link direto para configuracao

**Componente:** `message-bubble.tsx`
- Mensagens com `delivery_status='failed'`: icone de alerta (triangulo vermelho) ao lado do timestamp
- Tooltip no icone: "Mensagem nao entregue - instancia offline"
- Botao "Reenviar" (futuro, fora de escopo desta feature)

### 5.3 Pipeline - Config de instancia SDR

**Componente:** Novo campo em pipeline settings
- `sdr_instance_name`: dropdown com instancias da empresa
- Label: "Numero WhatsApp do SDR"
- Tooltip: "Numero dedicado que a IA usara para prospectar neste pipeline"

### 5.4 Settings - Perfil do vendedor

**Componente:** `settings` ou admin panel
- `default_whatsapp_instance`: dropdown com instancias da empresa
- Label: "Numero WhatsApp padrao"
- Obrigatorio quando `whatsapp_provider = 'evolution'`

### 5.5 Admin - Integracao WhatsApp

**Componente:** `integrations-tab.tsx`
- Quando `whatsapp_provider = 'evolution'`:
  - Mostra lista de instancias (via Hub)
  - Cada instancia: nome, numero, status, data de conexao
  - Botao "Gerenciar no Hub" (link externo)
  - Nao gerencia instancias no Veltzy (Hub e dono)
- Quando `whatsapp_provider = 'zapi'`:
  - Mantém UI atual (card Z-API)

### 5.6 WhatsApp Status e alertas

**Hook:** `use-whatsapp-status.ts`
- Quando Evolution: query instancias via Hub on-demand (check quando admin acessa integrations-tab)
- Mostrar status agregado: "3/4 numeros conectados"
- Ou status do numero do vendedor logado

**Alerta de mensagens nao entregues:**
- Dashboard ou inbox header: badge "X mensagens nao entregues nos ultimos 7 dias"
- Visivel para admin/manager
- Query: `messages WHERE delivery_status='failed' AND created_at > now() - 7 days`
- Click abre lista filtrada dessas mensagens (ou toast com contagem)

---

## 6. Estrategia de migracao (feature flag)

### 6.1 Mecanismo

Campo `companies.active_whatsapp_provider` (ja existe, default 'zapi'):

| Valor | Comportamento |
|-------|---------------|
| `'zapi'` | Fluxo atual. Tudo via Z-API. Nenhuma mudanca. |
| `'evolution'` | Todos os fluxos usam Evolution via Hub. Z-API ignorado. |

**Nao ha modo hibrido.** Uma empresa esta 100% em Z-API ou 100% em Evolution. A coexistencia e entre empresas diferentes, nao dentro da mesma empresa.

### 6.2 Processo de migracao por empresa

1. Admin (Toni) configura instancias Evolution da empresa no Hub
2. Admin conecta instancias via QR code no Hub
3. Admin configura `default_whatsapp_instance` para cada vendedor no Veltzy
4. Admin configura `sdr_instance_name` para cada pipeline no Veltzy
5. Admin altera `companies.active_whatsapp_provider` para 'evolution' (via super-admin ou SQL)
6. Webhook do Hub comeca a rotear mensagens da empresa para `evolution-inbound` do Veltzy
7. Envios passam a usar Hub
8. Apos validacao, desconecta Z-API da empresa

### 6.3 Rollback

Se problemas: alterar `active_whatsapp_provider` de volta para 'zapi'. Efeito imediato em todos os fluxos. Z-API continua configurado e conectado durante periodo de migracao.

### 6.4 Limpeza pos-migracao

Apos todas as empresas migradas:
- Remover provider `ZApiProvider` e `zapi.ts`
- Remover Edge Function `zapi-webhook` (ou manter como legacy)
- Limpar `oauth_integrations` com provider='zapi'
- Remover migration de indice zapi

---

## 7. Fases de implementacao

### Fase 1: Fundacao (sem mudanca de comportamento)

**Objetivo:** Preparar modelo de dados e abstraccoes sem quebrar nada.

1. Migration SQL: adicionar colunas `whatsapp_instance_name` (leads), `sdr_instance_name` + `sdr_transfer_message_template` (pipelines), `default_whatsapp_instance` (profiles), `instance_name` + `delivery_status` (messages), `instance_name` (message_queue)
2. Atualizar `WhatsAppProviderType` para incluir `'evolution'`
3. Criar `EvolutionHubProvider` implementando `WhatsAppProvider` (envia via Edge Function do Hub)
4. Registrar no factory
5. Atualizar tipos TypeScript (`database.ts`)
6. Testes manuais: nada muda para empresas existentes (todas em 'zapi')

### Fase 2: Inbound (receber mensagens via Evolution)

**Objetivo:** Veltzy recebe mensagens de instancias Evolution.

1. Criar Edge Function `evolution-inbound` no Veltzy
2. Logica de criacao/atualizacao de lead (extrair de `zapi-webhook` para shared)
3. Associar lead a `whatsapp_instance_name`
4. Salvar mensagem com `instance_name`
5. Disparar SDR e automacoes
6. Configurar Hub para chamar `evolution-inbound` do Veltzy
7. Testar com 1 empresa de teste

### Fase 3: Outbound (enviar mensagens via Evolution)

**Objetivo:** Veltzy envia mensagens via Hub.

1. Refatorar `zapi-send` --> `whatsapp-send` com roteamento por provider
2. Resolver `instance_name` para envio (lead > profile > pipeline)
3. Atualizar `sdr-ai` para usar `whatsapp-send` com instance_name do pipeline
4. Atualizar `process-message-queue` para Evolution
5. Testar envio humano, SDR e automacao com empresa de teste

### Fase 4: Frontend multi-instancia

**Objetivo:** UI suporta multiplos numeros.

1. Filtro por instancia no inbox (admin/manager apenas; vendedor ve por assigned_to)
2. Badge de instancia no conversation-item
3. Indicador de numero no chat-header
4. Bloqueio de chat-input quando vendedor sem numero + toast de alerta
5. Indicador visual de `delivery_status='failed'` no message-bubble (icone alerta)
6. Config de instancia SDR + template de transfer no pipeline settings
7. Config de numero padrao no perfil do vendedor
8. Painel de instancias no admin (read-only on-demand, dados do Hub)
9. Status WhatsApp multi-instancia
10. Alerta agregado de mensagens nao entregues (admin/manager)

### Fase 5: Transfer SDR --> vendedor

**Objetivo:** SDR qualifica e transfere para humano com handoff suave.

1. Logica de transfer no `sdr-ai` (flag `transfer: true` no JSON de resposta)
2. Enviar mensagem de transfer ao lead pelo numero do SDR (template configuravel por pipeline)
3. Gerar resumo IA das ultimas 5 mensagens para o vendedor
4. Salvar notificacao interna com resumo (`type='lead_transferred'`)
5. Atualizar `lead.whatsapp_instance_name` para numero do vendedor
6. Desativar `lead.is_ai_active`
7. Badge no card do lead no kanban indicando transfer recente
8. Proximo envio humano sai pelo numero do vendedor

### Fase 6: Migracao e limpeza

**Objetivo:** Migrar empresas reais e remover Z-API.

1. Migrar empresas uma a uma (processo da secao 6.2)
2. Monitorar por 1-2 semanas
3. Remover codigo Z-API
4. Limpar dados Z-API

---

## 8. Riscos e mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Hub fora do ar impede envio/recebimento | Monitoramento + alert. Rollback para Z-API se critico. |
| Latencia extra (Veltzy --> Hub --> Evolution) | Hub esta no mesmo projeto Supabase. Latencia < 200ms. |
| Vendedor sem `default_whatsapp_instance` tenta enviar | Bloqueio no frontend (input desabilitado) + erro 400 no backend. Nunca salva como manual silenciosamente. |
| Instancia SDR offline | SDR processa qualificacao, mensagem salva com delivery_status='failed'. Admin alertado. |
| Lead recebe mensagem de numero diferente apos transfer | Esperado e documentado. Mensagem de transfer pode ser customizada. |
| Historico de mensagens em numeros diferentes | Inbox unificada por lead. Badge mostra qual numero. |
| Empresa volta para Z-API apos usar Evolution | Rollback funciona. Mensagens com `instance_name` continuam visiveis. |

---

## 9. Metricas de sucesso

- 100% das empresas migradas em 4 semanas apos Fase 3 completa
- Zero downtime durante migracao de cada empresa
- Tempo de entrega de mensagem (webhook --> salvo) < 2s
- Tempo de envio (click --> entregue) < 3s
- Taxa de erro de envio < 1%

---

## 10. Fora de escopo

- Gerenciamento de instancias Evolution no Veltzy (Hub e dono)
- Criacao/exclusao de instancias via Veltzy
- Suporte a grupos WhatsApp
- Mensagens de template/HSM (WhatsApp Business API)
- Integracao com outros canais via Evolution (apenas WhatsApp)
- Multi-device por instancia

---

## Apendice: Decisoes validadas (PVO)

| # | Pergunta | Decisao |
|---|----------|---------|
| 1 | Transfer SDR --> vendedor: mensagem automatica? | Sim. Sai pelo numero do SDR. Template configuravel por pipeline (`sdr_transfer_message_template`), fallback: "Ola! A partir de agora voce sera atendido por {vendedor_nome}. Em breve ele entrara em contato." |
| 2 | Vendedor sem numero tenta enviar? | Bloqueio total. Backend retorna 400. Frontend desabilita chat-input com alerta claro. Nunca salvar como manual silenciosamente. |
| 3 | Filtro inbox vendedor | Vendedor ve todos os leads atribuidos a ele (assigned_to), independente do numero de origem. Filtro por instancia e exclusivo para admin/manager. |
| 4 | Instancia SDR offline | SDR processa qualificacao normalmente. Mensagem salva com `delivery_status='failed'`. Admin ve alerta de mensagens nao entregues. SDR nunca trava pipeline. |
| 5 | Rate-limit por instancia | Confiar no Evolution API. Sem rate-limit proprio nesta versao. Reavaliar com 50+ empresas. |
| 6 | Historico na transfer | Sim. Resumo IA das ultimas 5 mensagens enviado como notificacao interna ao vendedor. Formato: "Lead {nome} transferido do SDR. Resumo: {resumo}. {n} msgs trocadas." |
| 7 | Visibilidade de instancias | Check on-demand quando admin acessa integrations-tab. Heartbeat em tempo real para iteracao futura. |
