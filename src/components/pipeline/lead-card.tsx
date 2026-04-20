import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { usePipelineStore } from '@/stores/pipeline.store'
import { LeadSourceBadge } from '@/components/pipeline/lead-source-badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { useRoles } from '@/hooks/use-roles'
import { usePipelineStages } from '@/hooks/use-pipeline-stages'
import { useMoveLeadToStage } from '@/hooks/use-leads'
import { getAvatarUrl } from '@/lib/avatar'
import { timeAgo } from '@/lib/time'
import type { LeadWithDetails } from '@/types/database'
import { useNavigate } from 'react-router-dom'
import { Phone, Mail, MoreVertical, Pencil, ArrowRightLeft, UserRoundPen, Clock, MessageSquare } from 'lucide-react'

interface LeadCardProps {
  lead: LeadWithDetails
  onTransfer?: (leadId: string) => void
}

const ScoreBar = ({ score }: { score: number }) => {
  const color =
    score >= 67 ? 'bg-green-500' : score >= 34 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
      <div className={cn('h-full rounded-full transition-all duration-500 ease-out', color)} style={{ width: `${score}%` }} />
    </div>
  )
}

const LeadCard = ({ lead, onTransfer }: LeadCardProps) => {
  const navigate = useNavigate()
  const setSelectedLeadId = usePipelineStore((s) => s.setSelectedLeadId)
  const { isAdmin, isManager } = useRoles()
  const { data: stages } = usePipelineStages()
  const moveToStage = useMoveLeadToStage()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { lead } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const avatarSrc = lead.avatar_url || getAvatarUrl(lead.phone)

  const assigneeName = lead.profiles?.name
  const assigneeInitials = assigneeName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'kanban-card glass-card rounded-lg p-3 cursor-grab active:cursor-grabbing animate-fade-in',
        isDragging && 'opacity-50 scale-105 shadow-xl z-50'
      )}
      onClick={() => setSelectedLeadId(lead.id)}
    >
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={avatarSrc} alt={lead.name ?? ''} />
            <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
              {(lead.name || lead.phone).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {lead.name || lead.phone}
            </p>
            {lead.name && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                {lead.phone}
              </p>
            )}
            {lead.email && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{lead.email}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-smooth"
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => setSelectedLeadId(lead.id)}>
                <Pencil className="h-4 w-4" />
                Editar
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Mover para
              </DropdownMenuLabel>
              {stages
                ?.filter((s) => s.id !== lead.stage_id)
                .map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => moveToStage.mutate({ leadId: lead.id, stageId: s.id })}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                  </DropdownMenuItem>
                ))}

              {(isAdmin || isManager) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onTransfer?.(lead.id)}>
                    <UserRoundPen className="h-4 w-4" />
                    Transferir lead
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/inbox?lead=${lead.id}`)
            }}
            className="rounded p-0.5 text-white/70 hover:text-primary transition-smooth"
            title="Abrir conversa"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          </div>
        </div>

        {lead.ai_score > 0 && <ScoreBar score={lead.ai_score} />}

        <div className="flex items-center justify-between gap-2">
          <LeadSourceBadge source={lead.lead_sources} />
          <div className="flex items-center gap-2">
            {lead.deal_value ? (
              <span className="text-xs font-semibold text-primary">
                R$ {lead.deal_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            ) : null}
            {assigneeName && (
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {assigneeInitials}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-1">
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {lead.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {tag}
              </span>
            ))}
            {lead.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{lead.tags.length - 3}</span>
            )}
          </div>
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60 shrink-0">
            <Clock className="h-2.5 w-2.5" />
            {timeAgo(lead.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}

export { LeadCard }
