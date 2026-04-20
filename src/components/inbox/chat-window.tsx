import { useEffect } from 'react'
import { ChatHeader } from '@/components/inbox/chat-header'
import { MessageList } from '@/components/inbox/message-list'
import { ChatInput } from '@/components/inbox/chat-input'
import { AdContextCard } from '@/components/inbox/ad-context-card'
import { useMessages, useMarkAsRead } from '@/hooks/use-messages'
import { useTypingIndicator } from '@/hooks/use-typing-indicator'
import type { LeadWithLastMessage } from '@/types/database'

interface ChatWindowProps {
  lead: LeadWithLastMessage
}

const ChatWindow = ({ lead }: ChatWindowProps) => {
  const { data: messages, isLoading } = useMessages(lead.id)
  const markAsRead = useMarkAsRead()
  const { isTyping, sendTyping } = useTypingIndicator(lead.id)

  useEffect(() => {
    if (lead.conversation_status === 'unread') {
      markAsRead.mutate(lead.id)
    }
  }, [lead.id, lead.conversation_status]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col">
      <ChatHeader lead={lead} />

      {lead.ad_context && <AdContextCard adContext={lead.ad_context} />}

      <MessageList
        messages={messages ?? []}
        isLoading={isLoading}
        isTyping={isTyping}
      />

      <ChatInput leadId={lead.id} onTyping={sendTyping} />
    </div>
  )
}

export { ChatWindow }
