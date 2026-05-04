import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LeadCard } from '@/components/pipeline/lead-card'
import { Button } from '@/components/ui/button'
import type { PipelineStage, LeadWithDetails } from '@/types/database'

interface StageColumnProps {
  stage: PipelineStage
  leads: LeadWithDetails[]
  onAddLead: (stageId: string) => void
  onTransferLead?: (leadId: string) => void
  onMovePipeline?: (lead: LeadWithDetails) => void
  fireOnly?: boolean
}

const StageColumn = ({ stage, leads, onAddLead, onTransferLead, onMovePipeline, fireOnly }: StageColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const leadIds = leads.map((l) => l.id)

  return (
    <div className="flex w-[300px] min-w-[280px] max-w-[320px] flex-shrink-0 flex-col h-full">
      <div
        className="mb-2 rounded-t-xl px-3 py-2.5"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${stage.color} 18%, transparent), color-mix(in srgb, ${stage.color} 4%, transparent))`,
          borderBottom: `1px solid color-mix(in srgb, ${stage.color} 15%, transparent)`,
        }}
      >
        <div className="flex items-center justify-between">
          <h3
            className="text-sm font-semibold"
            style={{ color: `color-mix(in srgb, ${stage.color} 75%, hsl(var(--foreground)))` }}
          >
            {stage.name}
          </h3>
          <span
            className="flex items-center justify-center rounded-full text-[10px] font-semibold"
            style={{
              width: 22,
              height: 22,
              backgroundColor: stage.color,
              color: '#fff',
            }}
          >
            {leads.length}
          </span>
        </div>
      </div>

      <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'kanban-column flex-1 space-y-2 rounded-xl p-2 transition-colors overflow-y-auto scrollbar-minimal',
            isOver && 'bg-primary/5 ring-2 ring-primary/20'
          )}
        >
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onTransfer={onTransferLead} onMovePipeline={onMovePipeline} fireOnly={fireOnly} />
          ))}

          {leads.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border/50">
              <p className="text-xs text-muted-foreground">Arraste leads aqui</p>
            </div>
          )}
        </div>
      </SortableContext>

      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full text-muted-foreground hover:text-foreground"
        onClick={() => onAddLead(stage.id)}
      >
        <Plus className="mr-1 h-4 w-4" />
        Novo Lead
      </Button>
    </div>
  )
}

export { StageColumn }
