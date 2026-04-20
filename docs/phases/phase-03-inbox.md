# Phase 03 - Inbox Multicanal (Chat + WhatsApp Z-API)

## OBJETIVO
Implementar o inbox de atendimento multicanal: lista de conversas, chat em tempo real, envio e recebimento de mensagens WhatsApp via Z-API, suporte a mídias (imagem, áudio, vídeo, documento), indicador de digitação, status de conversa e alertas de mensagens não respondidas. Ao final desta fase, vendedores conseguem atender leads via WhatsApp diretamente pelo Veltzy.

## PRÉ-REQUISITOS
- Fases 1 e 2 concluídas
- Projeto rodando sem erros

## NOVAS DEPENDÊNCIAS
```bash
npm i react-resizable-panels
```

## MIGRATION SQL

Criar `supabase/migrations/003_inbox.sql`:

```sql
-- ===========================================
-- TABELAS DA FASE 3
-- ===========================================

-- Mensagens do chat
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    sender_type sender_type NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text'
        CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact')),
    file_url TEXT,
    file_name TEXT,
    file_mime_type TEXT,
    file_size INTEGER,
    source TEXT NOT NULL DEFAULT 'manual'
        CHECK (source IN ('whatsapp', 'instagram', 'linkedin', 'manual')),
    external_id TEXT,                        -- ID da mensagem no WhatsApp/Instagram
    replied_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    is_scheduled BOOLEAN NOT NULL DEFAULT false,
    scheduled_at TIMESTAMPTZ,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Configuração WhatsApp (Z-API) por empresa
CREATE TABLE public.whatsapp_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
    instance_id TEXT NOT NULL,
    instance_token TEXT NOT NULL,
    client_token TEXT NOT NULL,
    phone_number TEXT,
    status TEXT NOT NULL DEFAULT 'disconnected'
        CHECK (status IN ('connected', 'disconnected', 'connecting', 'error')),
    qr_code TEXT,
    connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Templates de resposta rápida
CREATE TABLE public.reply_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'geral',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- ÍNDICES PARA PERFORMANCE
-- ===========================================
CREATE INDEX idx_messages_lead_id ON public.messages(lead_id);
CREATE INDEX idx_messages_company_id ON public.messages(company_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_leads_conversation_status ON public.leads(company_id, conversation_status);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);

-- ===========================================
-- FUNÇÕES
-- ===========================================

-- Atualiza conversation_status do lead ao receber mensagem
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sender_type = 'lead' THEN
        UPDATE public.leads
        SET
            conversation_status = 'unread',
            updated_at = now()
        WHERE id = NEW.lead_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_message_received
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- ===========================================
-- RLS
-- ===========================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reply_templates ENABLE ROW LEVEL SECURITY;

-- Messages: mesmo padrão dos leads (admin/manager tudo, seller apenas atribuídos)
CREATE POLICY "Admins and managers see all messages"
ON public.messages FOR SELECT TO authenticated
USING (
    company_id = get_current_company_id()
    AND (
        is_admin_or_manager()
        OR EXISTS (
            SELECT 1 FROM public.leads
            WHERE leads.id = messages.lead_id
            AND leads.assigned_to = get_current_profile_id()
        )
    )
    OR is_super_admin()
);

CREATE POLICY "Members can insert messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (company_id = get_current_company_id() OR is_super_admin());

-- WhatsApp Configs
CREATE POLICY "Members can view whatsapp config"
ON public.whatsapp_configs FOR SELECT TO authenticated
USING (company_id = get_current_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage whatsapp config"
ON public.whatsapp_configs FOR ALL TO authenticated
USING (company_id = get_current_company_id() AND is_company_admin() OR is_super_admin());

-- Reply Templates
CREATE POLICY "Members can view templates"
ON public.reply_templates FOR SELECT TO authenticated
USING (company_id = get_current_company_id() OR is_super_admin());

CREATE POLICY "Admins can manage templates"
ON public.reply_templates FOR ALL TO authenticated
USING (company_id = get_current_company_id() AND is_company_admin() OR is_super_admin());

-- ===========================================
-- REALTIME
-- ===========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE TRIGGER on_whatsapp_configs_updated
    BEFORE UPDATE ON public.whatsapp_configs
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_reply_templates_updated
    BEFORE UPDATE ON public.reply_templates
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

## EDGE FUNCTIONS

### `supabase/functions/zapi-webhook/index.ts`
Recebe POST do Z-API com mensagens WhatsApp entrantes.

Fluxo:
1. Valida `instanceId` → busca `whatsapp_configs` para identificar empresa
2. Ignora mensagens do próprio número (`fromMe: true`) e grupos (`isGroup: true`)
3. Ignora callbacks de status (`StatusCallback`, `ReadReceiptCallback`, `MessageUpdateCallback`)
4. Extrai conteúdo da mensagem (texto, imagem, áudio, vídeo, documento)
5. Busca ou cria lead pelo telefone (`UNIQUE company_id + phone`)
6. Se lead novo: atribui via Round Robin (vendedores com `is_available = true`)
7. Insere mensagem na tabela `messages` com `sender_type = 'lead'`
8. Captura contexto de Meta Ads (`referral` → `ad_context`) se presente

Estrutura do payload Z-API:
```typescript
interface ZAPIPayload {
    phone: string
    isGroup: boolean
    fromMe: boolean
    momment: number
    messageId: string
    instanceId: string
    chatName?: string
    senderName?: string
    type?: string
    text?: { message: string }
    image?: { caption?: string; imageUrl?: string; mimeType?: string }
    audio?: { audioUrl?: string; mimeType?: string }
    video?: { caption?: string; videoUrl?: string; mimeType?: string }
    document?: { caption?: string; documentUrl?: string; fileName?: string; mimeType?: string }
    referral?: {
        headline?: string; body?: string
        sourceUrl?: string; thumbnailUrl?: string
        mediaUrl?: string; ctwaClid?: string
        sourceId?: string; sourceType?: string
    }
}
```

Round Robin (lógica simplificada):
```typescript
// 1. Busca sellers com is_available = true da empresa
// 2. Ordena por last_seen_at DESC (mais recente primeiro)
// 3. Usa índice circular baseado em count de leads atribuídos hoje
// 4. Se nenhum disponível → is_queued = true no lead
```

### `supabase/functions/zapi-send/index.ts`
Envia mensagens via Z-API.

Recebe:
```typescript
interface SendPayload {
    leadId: string
    content: string
    messageType: 'text' | 'image' | 'audio' | 'video' | 'document'
    fileUrl?: string
    fileName?: string
    mimeType?: string
    repliedMessageId?: string
}
```

Fluxo:
1. Valida autenticação e permissão
2. Busca config Z-API da empresa (`whatsapp_configs`)
3. Monta request para Z-API baseado no `messageType`
4. Insere mensagem no banco com `sender_type = 'human'`
5. Atualiza `conversation_status = 'replied'` no lead

Endpoints Z-API por tipo:
- texto: `POST /send-text`
- imagem: `POST /send-image`
- áudio: `POST /send-audio`
- vídeo: `POST /send-video`
- documento: `POST /send-document`

### `supabase/functions/whatsapp-manager/index.ts`
Gerencia instâncias Z-API (conectar, desconectar, status, QR code).

Ações suportadas via query param `?action=`:
- `status` → GET status da instância
- `qrcode` → GET QR code para scan
- `disconnect` → POST desconectar
- `restart` → POST reiniciar instância

## SERVICES

**`src/services/messages.service.ts`**
```typescript
// getMessages(leadId) → Message[]
// sendMessage(payload: SendMessagePayload) → Message
//   → chama Edge Function zapi-send
// markAsRead(leadId) → void
//   → atualiza conversation_status para 'read'
// getConversationList(companyId, filters?) → LeadWithLastMessage[]
//   → leads com última mensagem e contagem de não lidas
```

**`src/services/whatsapp.service.ts`**
```typescript
// getConfig(companyId) → WhatsAppConfig | null
// saveConfig(companyId, data) → WhatsAppConfig
// getStatus(companyId) → { status, phone_number }
// getQRCode(companyId) → { qr_code }
// disconnect(companyId) → void
```

**`src/services/reply-templates.service.ts`**
```typescript
// getTemplates(companyId) → ReplyTemplate[]
// createTemplate(companyId, data) → ReplyTemplate
// updateTemplate(id, data) → ReplyTemplate
// deleteTemplate(id) → void
```

## HOOKS

**`src/hooks/use-messages.ts`**
- `useMessages(leadId)` - mensagens com React Query + Realtime subscription
- `useSendMessage()` - mutation que chama zapi-send
- `useMarkAsRead(leadId)` - mutation para marcar como lida

**`src/hooks/use-conversation-list.ts`**
- `useConversationList(filters?)` - lista de leads/conversas ordenada por última mensagem
- Realtime: atualiza ao receber nova mensagem

**`src/hooks/use-typing-indicator.ts`**
- `useTypingIndicator(leadId)` - gerencia estado de digitação
- Publica presença via Supabase Realtime Channel
- Debounce de 1s para parar de indicar digitação

**`src/hooks/use-inactive-message-alert.ts`**
- `useInactiveMessageAlert()` - alerta sonoro quando há mensagens não lidas
- Toca som apenas se a aba estiver em background ou o lead não estiver aberto
- Respeita preferência do usuário (pode desabilitar)

**`src/hooks/use-whatsapp-config.ts`**
- `useWhatsAppConfig()` - config da instância Z-API
- `useSaveWhatsAppConfig()` - mutation para salvar
- Polling a cada 5s quando status é 'connecting' (aguardando QR scan)

**`src/hooks/use-reply-templates.ts`**
- `useReplyTemplates()` - templates da empresa
- Filtragem client-side por título/conteúdo

## REALTIME HUB

**`src/hooks/use-realtime-hub.ts`** - Canal central (evita múltiplas subscriptions)

```typescript
// Assina canais via Supabase Realtime:
// - messages: INSERT → atualiza lista de mensagens + conversation list
// - leads: UPDATE → atualiza status de conversa na lista
// - typing_{leadId}: presença do lead digitando
// Retorna: { isConnected }
// Deve ser chamado UMA VEZ no MainLayout
```

## STORE

**`src/stores/inbox.store.ts`**
```typescript
interface InboxState {
    selectedLeadId: string | null
    filters: InboxFilters
    unreadCount: number
    setSelectedLeadId: (id: string | null) => void
    setFilters: (f: Partial<InboxFilters>) => void
    setUnreadCount: (n: number) => void
}

interface InboxFilters {
    search: string
    status: ConversationStatus | 'all'
    assignedTo: string | 'mine' | 'all'
    sourceId: string | null
}
```

## COMPONENTES

### Inbox Page (fina)
**`src/pages/inbox.tsx`**
```tsx
<ResizablePanelGroup direction="horizontal">
    <ResizablePanel defaultSize={30} minSize={25}>
        <ConversationList />
    </ResizablePanel>
    <ResizableHandle />
    <ResizablePanel defaultSize={70}>
        {selectedLeadId ? <ChatWindow leadId={selectedLeadId} /> : <EmptyInbox />}
    </ResizablePanel>
</ResizablePanelGroup>
```

### Conversation List
**`src/components/inbox/conversation-list.tsx`**
- Header com busca e filtros (status, atribuído)
- Lista de `ConversationItem` ordenada por última mensagem
- Badge de não lidas em cada item
- Skeleton de carregamento
- Empty state quando sem conversas

### Conversation Item
**`src/components/inbox/conversation-item.tsx`**
Props: `lead: LeadWithLastMessage`
- Avatar (inicial do nome ou foto)
- Nome + telefone
- Preview da última mensagem (truncada)
- Tempo relativo (ex: "há 5 min")
- Badge de não lidas (número)
- Indicador de status da conversa (dot colorido)
- Temperatura do lead (emoji pequeno)
- Selecionado: borda `primary` à esquerda

### Chat Window
**`src/components/inbox/chat-window.tsx`**
- Header: info do lead (nome, telefone, temperatura, score) + botões de ação
- Área de mensagens com scroll automático para o final
- Input de mensagem com botões de anexo e envio
- Indicador de digitação quando lead está digitando

### Chat Header
**`src/components/inbox/chat-header.tsx`**
Props: `lead: LeadWithDetails`
- Avatar + nome + telefone
- Badge de temperatura
- Score IA (mini barra)
- Botão "Ver no Pipeline" → navega para `/pipeline` com lead selecionado
- Dropdown de ações: transferir lead, marcar como resolvido, ver histórico

### Message List
**`src/components/inbox/message-list.tsx`**
- Virtualização simples (sem biblioteca, apenas scroll manual)
- Agrupa mensagens por data (separador de dia)
- Scroll automático para última mensagem ao abrir conversa
- Scroll automático ao receber nova mensagem (se já estava no final)
- Loading skeleton

### Message Bubble
**`src/components/inbox/message-bubble.tsx`**
Props: `message: Message`
- Layout: lead à esquerda, humano/IA à direita
- Classes do design system: `.message-bubble-lead`, `.message-bubble-human`, `.message-bubble-ai`
- Suporte a tipos: texto, imagem (thumbnail clicável), áudio (player nativo), vídeo (player nativo), documento (link download)
- Timestamp no canto inferior
- Se `replied_message_id`: exibe preview da mensagem citada acima
- Indicador de remetente: nome do vendedor em mensagens human

### Chat Input
**`src/components/inbox/chat-input.tsx`**
- Textarea com auto-resize (máx 5 linhas)
- Enter envia, Shift+Enter quebra linha
- Botão de anexo (`ChatMediaUpload`)
- Botão de templates (`ReplyTemplatesPopover`)
- Botão de envio com loading state
- Disabled quando lead não tem WhatsApp conectado ou status é 'resolved'

### Chat Media Upload
**`src/components/inbox/chat-media-upload.tsx`**
- Input file oculto, aceita: imagem, áudio, vídeo, PDF
- Upload para Supabase Storage (`chat-attachments/{company_id}/{lead_id}/{filename}`)
- Preview antes de enviar
- Progresso de upload
- Máx 25MB por arquivo

### Reply Templates Popover
**`src/components/inbox/reply-templates-popover.tsx`**
- Popover com lista de templates
- Busca por título/conteúdo
- Click insere template no input
- Agrupado por categoria

### Typing Indicator
**`src/components/inbox/typing-indicator.tsx`**
- 3 dots animados (CSS keyframes)
- Exibido quando lead está digitando (via Realtime)

### Ad Context Card
**`src/components/inbox/ad-context-card.tsx`**
Props: `adContext: AdContext`
- Card colapsável no topo da conversa quando lead veio de anúncio Meta Ads
- Exibe: título do anúncio, corpo, thumbnail, link

### Empty Inbox
**`src/components/inbox/empty-inbox.tsx`**
Ilustração + texto "Selecione uma conversa para começar"

## CONFIGURAÇÃO WHATSAPP (SETTINGS)

Adicionar aba "WhatsApp" em `/settings`:

**`src/components/settings/whatsapp-settings.tsx`**
- Campos: Instance ID, Instance Token, Client Token
- Status da conexão (badge colorido: conectado/desconectado)
- QR Code para scan (polling a cada 5s enquanto conectando)
- Botão desconectar
- URL do webhook para configurar no Z-API:
  `https://{supabase_project}.supabase.co/functions/v1/zapi-webhook`

## ROTA

Adicionar em `App.tsx`:
```tsx
<Route path="/inbox" element={<Inbox />} />
```

Habilitar link na sidebar.

## CONFIGURAÇÕES DE STORAGE

No Supabase Dashboard, criar bucket `chat-attachments`:
- Público: NÃO (privado)
- Policies:
  - SELECT: usuários autenticados da mesma empresa
  - INSERT: usuários autenticados da mesma empresa
- Path: `{company_id}/{lead_id}/{filename}`

## VARIÁVEIS DE AMBIENTE

Adicionar nas Edge Functions (Supabase Dashboard > Edge Functions > Secrets):
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

As Edge Functions usam `service_role` para bypass de RLS (operações de sistema).

## DESIGN DO INBOX

### Layout
- Painel esquerdo (lista): fundo `bg-muted/30`, border-right
- Painel direito (chat): fundo `bg-background`
- Handle de resize: linha sutil com hover

### Conversa selecionada
- Item da lista: `bg-primary/10` + borda esquerda `bg-primary` 4px

### Mensagens
- Balões com raio assimétrico (design system)
- Fundo lead: `bg-secondary`
- Fundo humano: `bg-primary text-primary-foreground`
- Fundo IA: `bg-accent` + borda `border-primary/20`
- Máx largura do balão: 75%

### Separador de data
- Linha horizontal com texto centralizado (ex: "Hoje", "Ontem", "19 abr")
- Estilo: `text-muted-foreground text-xs`

## CRITÉRIOS DE CONCLUSÃO
- [ ] Lista de conversas exibe leads com última mensagem e badge de não lidas
- [ ] Filtros de status e atribuição funcionam
- [ ] Chat abre ao selecionar conversa
- [ ] Mensagens carregam corretamente (texto e mídias)
- [ ] Envio de texto funciona (salva no banco + envia via Z-API se conectado)
- [ ] Upload de imagem funciona (Storage + Z-API)
- [ ] Realtime: nova mensagem aparece sem recarregar
- [ ] Indicador de digitação aparece quando lead digita
- [ ] Alerta sonoro ao receber mensagem em background
- [ ] Templates de resposta rápida funcionam
- [ ] Configuração Z-API em Settings funciona (salva credenciais, exibe QR)
- [ ] Webhook Z-API recebe mensagem e cria lead/mensagem corretamente
- [ ] Status da conversa atualiza (unread → read → replied)
- [ ] Build sem erros de TypeScript
