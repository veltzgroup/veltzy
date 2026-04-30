import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Kanban, CheckCircle } from 'lucide-react'
import { useUpdateLead } from '@/hooks/use-leads'
import type { LeadWithLastMessage } from '@/types/database'

interface ChatHeaderProps {
  lead: LeadWithLastMessage
}

const ChatHeader = ({ lead }: ChatHeaderProps) => {
  const navigate = useNavigate()
  const updateLead = useUpdateLead()
  const avatarSrc = lead.avatar_url || undefined

  const handleResolve = () => {
    updateLead.mutate({ leadId: lead.id, data: { conversation_status: 'resolved' } })
  }

  return (
    <div className="flex items-center gap-3 border-b px-4 py-3">
      <Avatar className="h-9 w-9">
        <AvatarImage src={avatarSrc} alt={lead.name ?? ''} />
        <AvatarFallback className="text-xs bg-secondary">
          {(lead.name || lead.phone).slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{lead.name || lead.phone}</p>
        <p className="text-xs text-muted-foreground">{lead.phone}</p>
      </div>

      <div className="flex items-center gap-1">
        {lead.ai_score > 0 && (
          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
            Score: {lead.ai_score}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate('/pipeline')}
          title="Ver no Pipeline"
        >
          <Kanban className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleResolve}>
              <CheckCircle className="h-4 w-4" />
              Marcar como resolvido
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export { ChatHeader }
