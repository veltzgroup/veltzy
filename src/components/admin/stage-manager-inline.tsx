import { useState } from 'react'
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ColorPicker } from '@/components/shared/color-picker'
import { usePipelineStages, useCreateStage, useUpdateStage, useDeleteStage } from '@/hooks/use-pipeline-stages'
import type { PipelineStage } from '@/types/database'

const slugify = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

const StageRow = ({ stage }: { stage: PipelineStage }) => {
  const updateStage = useUpdateStage()
  const deleteStage = useDeleteStage()
  const [name, setName] = useState(stage.name)
  const [color, setColor] = useState(stage.color)

  const handleBlur = () => {
    if (name !== stage.name || color !== stage.color) {
      updateStage.mutate({ stageId: stage.id, data: { name, color } })
    }
  }

  const handleColorChange = (newColor: string) => {
    setColor(newColor)
    updateStage.mutate({ stageId: stage.id, data: { color: newColor } })
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/20 p-2">
      <GripVertical className="h-4 w-4 text-muted-foreground/40" />
      <ColorPicker value={color} onChange={handleColorChange} />
      <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={handleBlur} className="h-7 flex-1 text-xs" />
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">pos {stage.position}</span>
      {stage.is_final && (
        <span className="text-[10px] text-muted-foreground">{stage.is_positive ? 'Ganho' : 'Perdido'}</span>
      )}
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => confirm(`Remover "${stage.name}"?`) && deleteStage.mutate(stage.id)}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

const StageManagerInline = () => {
  const { data: stages, isLoading } = usePipelineStages()
  const createStage = useCreateStage()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')

  const handleAdd = async () => {
    if (!newName.trim()) return
    await createStage.mutateAsync({ name: newName, slug: slugify(newName), color: newColor, position: stages?.length ?? 0 })
    setNewName('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Etapas do Funil</CardTitle>
        <CardDescription>Gerencie as fases do pipeline</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}

        {stages?.map((s) => <StageRow key={s.id} stage={s} />)}

        <div className="flex items-center gap-2 pt-2 border-t border-border/20">
          <ColorPicker value={newColor} onChange={setNewColor} />
          <Input placeholder="Nova etapa..." value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} className="h-7 flex-1 text-xs" />
          <Button size="sm" className="h-7" onClick={handleAdd} disabled={createStage.isPending || !newName.trim()}>
            {createStage.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export { StageManagerInline }
