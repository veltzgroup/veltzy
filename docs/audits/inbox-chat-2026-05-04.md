# Auditoria: Inbox / Chat
**Data:** 2026-05-04
**Area:** Chat do Inbox (lista de conversas + janela de chat + mensagens)
**Gatilho:** Mensagens nao chegam e lista de ultimas mensagens sumiu

---

## Sumario Executivo

| Dimensao | Gaps | Semaforo |
|----------|------|----------|
| 1. Funcional | 1 critico | 🔴 |
| 2. Dados | 1 critico | 🔴 |
| 3. Integracao | 1 medio | 🟡 |
| 4. UX/Visual | 1 baixo | 🟢 |
| 5. Comercial | 1 critico (bloqueio total) | 🔴 |

**Veredicto geral: 🔴 VERMELHO - Inbox completamente quebrado**

A causa raiz e uma unica migration (029) que removeu a coluna `is_internal` da tabela `messages` sem atualizar a RPC `get_conversation_list` que ainda a referencia. Isso faz a query falhar, zerando a lista de conversas e impedindo o carregamento de qualquer chat.

---

## Inventario

### Telas e Componentes
| Componente | Arquivo | Funcao |
|------------|---------|--------|
| InboxPage | `src/pages/inbox.tsx` | Layout principal (sidebar + chat) |
| ConversationList | `src/components/inbox/conversation-list.tsx` | Lista lateral de conversas |
| ConversationItem | `src/components/inbox/conversation-item.tsx` | Item individual da lista |
| ChatWindow | `src/components/inbox/chat-window.tsx` | Area principal do chat |
| MessageList | `src/components/inbox/message-list.tsx` | Lista de mensagens |
| MessageBubble | `src/components/inbox/message-bubble.tsx` | Bolha individual |
| ChatInput | `src/components/inbox/chat-input.tsx` | Area de envio |
| ChatHeader | `src/components/inbox/chat-header.tsx` | Cabecalho do chat |
| AudioRecorder | `src/components/inbox/audio-recorder.tsx` | Gravacao de audio |
| ReplyTemplatesPopover | `src/components/inbox/reply-templates-popover.tsx` | Templates de resposta |
| TypingIndicator | `src/components/inbox/typing-indicator.tsx` | Indicador de digitacao |
| EmptyInbox | `src/components/inbox/empty-inbox.tsx` | Estado vazio |

### Hooks
| Hook | Arquivo | Status |
|------|---------|--------|
| useConversationList | `src/hooks/use-conversation-list.ts` | 🔴 QUEBRADO (RPC falha) |
| useMessages | `src/hooks/use-messages.ts` | 🟢 OK |
| useSendMessage | `src/hooks/use-messages.ts` | 🟢 OK |
| useMarkAsRead | `src/hooks/use-messages.ts` | 🟢 OK |
| useTypingIndicator | `src/hooks/use-typing-indicator.ts` | 🟢 OK |
| useWhatsAppStatus | `src/hooks/use-whatsapp-status.ts` | 🟢 OK |

### Services
| Funcao | Arquivo | Status |
|--------|---------|--------|
| getConversationList | `src/services/messages.service.ts` | 🔴 QUEBRADO (chama RPC falha) |
| getMessages | `src/services/messages.service.ts` | 🟢 OK |
| sendMessage | `src/services/messages.service.ts` | 🟢 OK |
| routeMessage | `src/services/messages.service.ts` | 🟢 OK |
| markAsRead | `src/services/messages.service.ts` | 🟢 OK |

### Edge Functions
| Funcao | Status |
|--------|--------|
| zapi-webhook (incoming WhatsApp) | 🟢 OK |
| zapi-send (outgoing WhatsApp) | 🟡 Sem validacao res.ok |
| instagram-webhook | 🟢 OK |
| instagram-send | 🟢 OK |
| process-message-queue | 🟢 OK |
| check-sla | 🟢 OK |
| check-whatsapp-health | 🟢 OK |

### Tabelas
| Tabela | Status |
|--------|--------|
| veltzy.messages | 🟢 OK (coluna is_internal removida) |
| veltzy.leads (conversation fields) | 🟢 OK |
| veltzy.message_queue | 🟢 OK |
| veltzy.whatsapp_configs | 🟢 OK |
| veltzy.reply_templates | 🟢 OK |

---

## Achados por Dimensao

### Dimensao 1: Funcional

#### 🔴 F1 - RPC get_conversation_list referencia coluna inexistente
- **Severidade:** CRITICO
- **Arquivo:** `supabase/migrations/023_audit_fixes.sql:96`
- **Problema:** A linha `AND (m.is_internal IS NOT TRUE)` referencia a coluna `is_internal` que foi removida pela migration 029
- **Impacto:** A RPC falha com erro "column m.is_internal does not exist", zerando a lista de conversas. Sem a lista, nenhum chat pode ser selecionado ou visualizado
- **Correlacao:** Este unico bug causa AMBOS os sintomas reportados: "mensagens nao chegam" (nao e possivel abrir um chat) e "lista de ultimas mensagens sumiu" (RPC retorna erro)
- **Fix:** Migration `030_fix_conversation_list_rpc.sql` criada - substitui `m.is_internal IS NOT TRUE` por `m.sender_type != 'internal'`

### Dimensao 2: Dados

#### 🔴 D1 - Inconsistencia migration/RPC (causa raiz)
- **Severidade:** CRITICO
- **Arquivo:** `supabase/migrations/029_remove_internal_notes.sql`
- **Problema:** Migration 029 faz `DROP COLUMN is_internal` mas nao recria a RPC que depende dessa coluna
- **Sequencia de eventos:**
  1. Migration 020: adiciona `is_internal BOOLEAN` na tabela messages
  2. Migration 023: cria RPC com `WHERE m.is_internal IS NOT TRUE`
  3. Migration 029: dropa `is_internal` **SEM** atualizar a RPC
- **Fix:** Migration 030 recria a RPC sem a referencia a coluna removida

### Dimensao 3: Integracao

#### 🟡 I1 - zapi-send nao valida resposta da API
- **Severidade:** MEDIO
- **Arquivo:** `supabase/functions/zapi-send/index.ts`
- **Problema:** Apos enviar para Z-API, a edge function nao valida `res.ok` antes de salvar a mensagem no banco. Se a Z-API retornar erro, a mensagem e salva como enviada mas nao chegou no WhatsApp do cliente
- **Acao:** Adicionar verificacao `if (!res.ok)` antes do INSERT, retornando erro ao frontend

### Dimensao 4: UX/Visual

#### 🟢 V1 - MessageList sem virtualizacao
- **Severidade:** BAIXO
- **Arquivo:** `src/components/inbox/message-list.tsx`
- **Problema:** Renderiza todas as mensagens sem virtualizacao. Com 200+ mensagens, pode haver lag
- **Acao:** Considerar react-window ou react-virtuoso para conversas longas (backlog)

### Dimensao 5: Comercial

#### 🔴 C1 - Inbox indemonstravel
- **Severidade:** CRITICO
- **Problema:** Com o inbox quebrado, e impossivel demonstrar a funcionalidade de chat para clientes. O inbox e uma das features core do Veltzy (CRM com IA SDR)
- **Pergunta-chave:** "Se eu mostrar isso pro cliente amanha, ele assina hoje?" - **NAO, inbox esta completamente inoperante**
- **Fix:** Aplicar migration 030 resolve imediatamente

---

## Plano de Ataque (priorizado)

| # | Acao | Severidade | Esforco | Arquivo |
|---|------|-----------|---------|---------|
| 1 | Aplicar migration 030 (fix RPC) | 🔴 Critico | 1 min | `supabase/migrations/030_fix_conversation_list_rpc.sql` |
| 2 | Validar resposta Z-API no zapi-send | 🟡 Medio | 15 min | `supabase/functions/zapi-send/index.ts` |
| 3 | Virtualizacao de MessageList | 🟢 Baixo | 2h | `src/components/inbox/message-list.tsx` |

---

## Comando para aplicar o fix

```bash
npx supabase db push
```

Apos aplicar, o inbox volta a funcionar imediatamente - lista de conversas carrega, mensagens aparecem, chat funciona normalmente.
