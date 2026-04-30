import { cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { timeAgo } from '@/lib/time'
import type { LeadWithLastMessage } from '@/types/database'

interface ConversationItemProps {
  lead: LeadWithLastMessage
  isSelected: boolean
  onClick: () => void
}

const statusDot: Record<string, string> = {
  unread: 'bg-blue-500',
  read: 'bg-muted-foreground/30',
  replied: 'bg-green-500',
  waiting_client: 'bg-yellow-500',
  waiting_internal: 'bg-orange-500',
  resolved: 'bg-muted-foreground/20',
}

const messagePreview = (lead: LeadWithLastMessage): string => {
  const msg = lead.last_message
  if (!msg) return 'Sem mensagens'
  if (msg.message_type !== 'text') {
    const typeLabels: Record<string, string> = {
      image: 'Imagem',
      audio: 'Audio',
      video: 'Video',
      document: 'Documento',
    }
    return typeLabels[msg.message_type] ?? msg.message_type
  }
  const prefix = msg.sender_type === 'human' ? 'Voce: ' : msg.sender_type === 'ai' ? 'IA: ' : ''
  return prefix + msg.content
}

const ConversationItem = ({ lead, isSelected, onClick }: ConversationItemProps) => {
  const avatarSrc = lead.avatar_url || undefined
  const lastTime = lead.last_message?.created_at ?? lead.updated_at

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 px-3 py-3 text-left transition-smooth border-l-4',
        isSelected
          ? 'bg-primary/10 border-l-primary'
          : 'border-l-transparent hover:bg-muted/50'
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarSrc} alt={lead.name ?? ''} />
          <AvatarFallback className="text-xs bg-secondary">
            {(lead.name || lead.phone).slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background', statusDot[lead.conversation_status])}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{lead.name || lead.phone}</p>
          <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(lastTime)}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{messagePreview(lead)}</p>
      </div>

      {(lead.unread_count ?? 0) > 0 && (
        <span className="mt-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
          {lead.unread_count}
        </span>
      )}
    </button>
  )
}

export { ConversationItem }
