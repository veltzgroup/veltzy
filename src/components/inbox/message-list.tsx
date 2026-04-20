import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { MessageBubble } from '@/components/inbox/message-bubble'
import { TypingIndicator } from '@/components/inbox/typing-indicator'
import type { Message } from '@/types/database'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  isTyping: boolean
  senderNames?: Record<string, string>
}

const formatDateSeparator = (dateStr: string): string => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Hoje'
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const MessageList = ({ messages, isLoading, isTyping, senderNames }: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isTyping])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const messagesWithSeparators = messages.map((msg, i) => {
    const msgDate = new Date(msg.created_at).toDateString()
    const prevDate = i > 0 ? new Date(messages[i - 1].created_at).toDateString() : ''
    return { msg, showSeparator: msgDate !== prevDate }
  })

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto scrollbar-minimal px-4 py-3 space-y-2">
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
        </div>
      )}

      {messagesWithSeparators.map(({ msg, showSeparator }) => {
        return (
          <div key={msg.id}>
            {showSeparator && (
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">{formatDateSeparator(msg.created_at)}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <MessageBubble message={msg} senderName={senderNames?.[msg.id]} />
          </div>
        )
      })}

      {isTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}

export { MessageList }
