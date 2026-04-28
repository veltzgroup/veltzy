import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckSquare, MessageCircle, Phone, Video, Search } from 'lucide-react'
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
import { useQuery } from '@tanstack/react-query'
import { useCreateTask } from '@/hooks/use-tasks'
import { useTeamMembers } from '@/hooks/use-team'
import { useAuthStore } from '@/stores/auth.store'
import { veltzy } from '@/lib/supabase'
import type { TaskType } from '@/types/database'

const useLeadsSimple = () => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['leads-simple', companyId],
    queryFn: async () => {
      const { data, error } = await veltzy()
        .from('leads')
        .select('id, name, phone')
        .eq('company_id', companyId!)
        .order('updated_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data as Array<{ id: string; name: string | null; phone: string }>
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

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
}

const typeOptions: Array<{ value: TaskType; label: string; icon: typeof CheckSquare }> = [
  { value: 'todo', label: 'Tarefa', icon: CheckSquare },
  { value: 'followup', label: 'Follow-up', icon: MessageCircle },
  { value: 'call', label: 'Ligacao', icon: Phone },
  { value: 'meeting', label: 'Reuniao', icon: Video },
]

const CreateTaskModal = ({ open, onClose, defaultLeadId }: CreateTaskModalProps) => {
  const profile = useAuthStore((s) => s.profile)
  const createTask = useCreateTask()
  const { data: members } = useTeamMembers()
  const { data: allLeads } = useLeadsSimple()
  const [leadSearch, setLeadSearch] = useState('')

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'todo',
      lead_id: defaultLeadId ?? '',
      assigned_to: profile?.id ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        title: '',
        type: 'todo',
        lead_id: defaultLeadId ?? '',
        assigned_to: profile?.id ?? '',
        due_date: '',
        description: '',
      })
      setLeadSearch('')
    }
  }, [open, defaultLeadId, profile?.id, reset])

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

          <div className="space-y-2">
            <Label>Lead vinculado</Label>
            <Controller
              control={control}
              name="lead_id"
              render={({ field }) => {
                const filteredLeads = (allLeads ?? []).filter((l) => {
                  if (!leadSearch) return true
                  const q = leadSearch.toLowerCase()
                  return (l.name?.toLowerCase().includes(q) || l.phone.includes(q))
                }).slice(0, 50)

                return (
                  <Select value={field.value ?? ''} onValueChange={(v) => { field.onChange(v); setLeadSearch('') }}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <div className="px-2 pb-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <input
                            value={leadSearch}
                            onChange={(e) => setLeadSearch(e.target.value)}
                            placeholder="Buscar lead..."
                            className="w-full rounded-md border border-input bg-background py-1.5 pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <SelectItem value="">Nenhum</SelectItem>
                      {filteredLeads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name || l.phone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }}
            />
          </div>

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
