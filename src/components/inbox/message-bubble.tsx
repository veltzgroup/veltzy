import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/time'
import { Download, FileText } from 'lucide-react'
import { AudioBubble } from '@/components/inbox/audio-bubble'
import type { Message } from '@/types/database'

interface MessageBubbleProps {
  message: Message
  senderName?: string
}

const MediaContent = ({ message }: { message: Message }) => {
  console.log('[message-bubble] renderizando midia:', message.file_url, message.message_type)
  switch (message.message_type) {
    case 'image':
      if (!message.file_url) return null
      return (
        <a href={message.file_url} target="_blank" rel="noopener noreferrer">
          <img
            src={message.file_url}
            alt="imagem"
            className="max-w-[240px] rounded-lg"
            loading="lazy"
          />
        </a>
      )
    case 'audio':
      return (
        <AudioBubble
          fileUrl={message.file_url ?? ''}
          transcription={message.content || null}
        />
      )
    case 'video':
      return <video controls src={message.file_url ?? ''} className="max-w-[280px] rounded-lg" />
    case 'document':
      return (
        <a
          href={message.file_url ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-background/50 px-3 py-2 text-xs hover:bg-background transition-smooth"
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate flex-1">{message.file_name ?? 'documento'}</span>
          <Download className="h-3.5 w-3.5 shrink-0" />
        </a>
      )
    default:
      return null
  }
}

const MessageBubble = ({ message, senderName }: MessageBubbleProps) => {
  const isLead = message.sender_type === 'lead'
  const isAi = message.sender_type === 'ai'
  const isHuman = message.sender_type === 'human'
  const isOptimistic = message.id.startsWith('optimistic-')

  return (
    <div className={cn('flex', isLead ? 'justify-start' : 'justify-end', isOptimistic && 'opacity-70')}>
      <div
        className={cn(
          'max-w-[75%] space-y-1 px-3 py-2 rounded-xl',
          isLead && 'bg-muted text-foreground rounded-bl-sm',
          isHuman && 'bg-primary text-primary-foreground rounded-br-sm',
          isAi && 'bg-accent text-accent-foreground rounded-bl-sm border border-primary/20',
        )}
      >
        {isHuman && senderName && (
          <p className="text-[10px] font-medium opacity-70">{senderName}</p>
        )}
        {isAi && (
          <p className="text-[10px] font-medium opacity-70">IA SDR</p>
        )}

        {message.message_type !== 'text' && <MediaContent message={message} />}

        {message.content && message.message_type !== 'audio' && (
          <p className={cn(
            'whitespace-pre-wrap break-words',
            message.message_type === 'text' ? 'text-sm' : 'text-xs opacity-70',
          )}>{message.content}</p>
        )}

        <p className={cn('text-[10px] text-right', isLead ? 'opacity-40' : 'opacity-60')}>
          {timeAgo(message.created_at)}
        </p>
      </div>
    </div>
  )
}

export { MessageBubble }
