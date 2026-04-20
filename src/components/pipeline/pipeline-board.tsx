import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { StageColumn } from '@/components/pipeline/stage-column'
import { LeadCard } from '@/components/pipeline/lead-card'
import { CreateLeadModal } from '@/components/pipeline/create-lead-modal'
import { EditLeadModal } from '@/components/pipeline/edit-lead-modal'
import { PipelineHeader } from '@/components/pipeline/pipeline-header'
import { StageManagerModal } from '@/components/pipeline/stage-manager-modal'
import { TransferLeadModal } from '@/components/pipeline/transfer-lead-modal'
import { usePipelineStages } from '@/hooks/use-pipeline-stages'
import { useLeads, useMoveLeadToStage } from '@/hooks/use-leads'
import { usePipelineStore } from '@/stores/pipeline.store'
import { triggerCelebration } from '@/lib/celebration'
import type { LeadWithDetails } from '@/types/database'

const PipelineBoard = () => {
  const { data: stages, isLoading: stagesLoading } = usePipelineStages()
  const { data: leads, isLoading: leadsLoading } = useLeads()
  const moveLeadToStage = useMoveLeadToStage()

  const { activeLeadId, setActiveLeadId, selectedLeadId, setSelectedLeadId, filters } = usePipelineStore()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createModalStageId, setCreateModalStageId] = useState<string>()
  const [stageManagerOpen, setStageManagerOpen] = useState(false)
  const [transferLeadId, setTransferLeadId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const filteredLeads = useMemo(() => {
    if (!leads) return []
    let result = leads
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (l) =>
          l.name?.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          l.email?.toLowerCase().includes(q)
      )
    }
    return result
  }, [leads, filters.search])

  const leadsByStage = useMemo(() => {
    const map: Record<string, LeadWithDetails[]> = {}
    stages?.forEach((s) => { map[s.id] = [] })
    filteredLeads.forEach((l) => {
      if (map[l.stage_id]) {
        map[l.stage_id].push(l)
      }
    })
    return map
  }, [filteredLeads, stages])

  const leadCounts = useMemo(() => {
    const map: Record<string, number> = {}
    leads?.forEach((l) => { map[l.stage_id] = (map[l.stage_id] ?? 0) + 1 })
    return map
  }, [leads])

  const activeLead = useMemo(
    () => leads?.find((l) => l.id === activeLeadId) ?? null,
    [leads, activeLeadId]
  )

  const selectedLead = useMemo(
    () => leads?.find((l) => l.id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveLeadId(event.active.id as string)
  }, [setActiveLeadId])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveLeadId(null)
    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    const overId = over.id as string

    const targetStage = stages?.find((s) => s.id === overId)
    const lead = leads?.find((l) => l.id === leadId)

    if (!lead) return

    const stageId = targetStage ? targetStage.id : leads?.find((l) => l.id === overId)?.stage_id
    if (!stageId || stageId === lead.stage_id) return

    moveLeadToStage.mutate({ leadId, stageId })

    const finalStage = stages?.find((s) => s.id === stageId)
    if (finalStage?.is_final && finalStage?.is_positive) {
      triggerCelebration()
      toast.success('Negocio fechado! 🎉')
    }
  }, [leads, stages, moveLeadToStage, setActiveLeadId])

  const handleAddLead = useCallback((stageId?: string) => {
    setCreateModalStageId(stageId)
    setCreateModalOpen(true)
  }, [])

  if (stagesLoading || leadsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PipelineHeader
        onAddLead={() => handleAddLead()}
        onManageStages={() => setStageManagerOpen(true)}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages?.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              leads={leadsByStage[stage.id] ?? []}
              onAddLead={handleAddLead}
              onTransferLead={setTransferLeadId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="w-[280px] rotate-2 scale-105 opacity-90 shadow-2xl">
              <LeadCard lead={activeLead} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CreateLeadModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        defaultStageId={createModalStageId}
      />

      <EditLeadModal
        lead={selectedLead}
        open={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />

      <StageManagerModal
        open={stageManagerOpen}
        onClose={() => setStageManagerOpen(false)}
        leadCounts={leadCounts}
      />

      <TransferLeadModal
        leadId={transferLeadId}
        open={!!transferLeadId}
        onClose={() => setTransferLeadId(null)}
      />
    </div>
  )
}

export { PipelineBoard }
