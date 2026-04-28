import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckSquare, MessageCircle, Phone, Video } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useCreateTask } from '@/hooks/use-tasks'
import { useTeamMembers } from '@/hooks/use-team'
import { useAuthStore } from '@/stores/auth.store'
import type { TaskType } from '@/types/database'

const schema = z.object({
  title: z.string().min(1, 'Titulo obrigatorio'),
  type: z.enum(['todo', 'followup', 'call', 'meeting']),
  lead_id: z.string().uuid().optional().or(z.literal('')),
  assigned_to: z.string().uuid().optional().or(z.literal('')),
  due_date: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

interface CreateTaskModalProps {
  open: boolean
  onClose: () => void
  defaultLeadId?: string | null
  leads?: Array<{ id: string; name: string | null; phone: string }>
}

const typeOptions: Array<{ value: TaskType; label: string; icon: typeof CheckSquare }> = [
  { value: 'todo', label: 'Tarefa', icon: CheckSquare },
  { value: 'followup', label: 'Follow-up', icon: MessageCircle },
  { value: 'call', label: 'Ligacao', icon: Phone },
  { value: 'meeting', label: 'Reuniao', icon: Video },
]

const CreateTaskModal = ({ open, onClose, defaultLeadId, leads }: CreateTaskModalProps) => {
  const profile = useAuthStore((s) => s.profile)
  const createTask = useCreateTask()
  const { data: members } = useTeamMembers()

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'todo',
      lead_id: defaultLeadId ?? '',
      assigned_to: profile?.id ?? '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    await createTask.mutateAsync({
      title: values.title,
      type: values.type as TaskType,
      lead_id: values.lead_id || null,
      assigned_to: values.assigned_to || profile?.id || null,
      created_by: profile?.id ?? null,
      due_date: values.due_date || null,
      description: values.description || null,
    })
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>Crie uma tarefa para acompanhar atividades</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Titulo *</Label>
            <Input {...register('title')} placeholder="Ex: Ligar para o cliente" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <div className="grid grid-cols-4 gap-2">
                  {typeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-smooth',
                        field.value === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {leads && leads.length > 0 && (
            <div className="space-y-2">
              <Label>Lead vinculado</Label>
              <Controller
                control={control}
                name="lead_id"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {leads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name || l.phone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Responsavel</Label>
            <Controller
              control={control}
              name="assigned_to"
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {members?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Data de vencimento</Label>
            <Input type="datetime-local" {...register('due_date')} />
          </div>

          <div className="space-y-2">
            <Label>Descricao</Label>
            <textarea
              {...register('description')}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm input-clean"
              placeholder="Detalhes da tarefa..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar tarefa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { CreateTaskModal }
