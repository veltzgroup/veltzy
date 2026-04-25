import { useState } from 'react'
import { Loader2, Plus, Trash2, GripVertical } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  usePipelineStages, useCreateStage, useUpdateStage, useDeleteStage,
} from '@/hooks/use-pipeline-stages'
import type { PipelineStage } from '@/types/database'

const slugify = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

interface StageManagerModalProps {
  open: boolean
  onClose: () => void
  leadCounts: Record<string, number>
}

const StageRow = ({
  stage,
  leadCount,
}: {
  stage: PipelineStage
  leadCount: number
}) => {
  const updateStage = useUpdateStage()
  const deleteStage = useDeleteStage()
  const [name, setName] = useState(stage.name)
  const [color, setColor] = useState(stage.color)

  const handleBlur = () => {
    if (name !== stage.name || color !== stage.color) {
      updateStage.mutate({ stageId: stage.id, data: { name, color } })
    }
  }

  const handleDelete = async () => {
    if (leadCount > 0) {
      toast.error('Esta etapa possui leads. Mova-os antes de excluir.')
      return
    }
    if (!confirm(`Remover a fase "${stage.name}"?`)) return
    try {
      await deleteStage.mutateAsync(stage.id)
    } catch {
      toast.error('Esta etapa possui leads. Mova-os antes de excluir.')
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 p-2">
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        onBlur={handleBlur}
        className="h-6 w-6 cursor-pointer rounded border-0"
      />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleBlur}
        className="h-8 flex-1"
      />
      <span className="text-xs text-muted-foreground whitespace-nowrap">{leadCount} leads</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleDelete}
        disabled={leadCount > 0 || deleteStage.isPending}
        title={leadCount > 0 ? 'Nao e possivel remover fase com leads' : 'Remover fase'}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

const StageManagerModal = ({ open, onClose, leadCounts }: StageManagerModalProps) => {
  const { data: stages } = usePipelineStages()
  const createStage = useCreateStage()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6B7280')

  const handleAdd = async () => {
    if (!newName.trim()) return
    const position = (stages?.length ?? 0)
    await createStage.mutateAsync({
      name: newName,
      slug: slugify(newName),
      color: newColor,
      position,
    })
    setNewName('')
    setNewColor('#6B7280')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Fases</DialogTitle>
          <DialogDescription>Adicione, edite ou remova fases do pipeline</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {stages?.map((stage) => (
            <StageRow key={stage.id} stage={stage} leadCount={leadCounts[stage.id] ?? 0} />
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border-0"
          />
          <Input
            placeholder="Nova fase..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="h-8 flex-1"
          />
          <Button size="sm" onClick={handleAdd} disabled={createStage.isPending || !newName.trim()}>
            {createStage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { StageManagerModal }
