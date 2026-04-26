import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { LeadTagsInput } from '@/components/pipeline/lead-tags-input'
import { useUpdateLead, useDeleteLead } from '@/hooks/use-leads'
import { usePipelineStages } from '@/hooks/use-pipeline-stages'
import { useLeadSources } from '@/hooks/use-lead-sources'
import { triggerCelebration } from '@/lib/celebration'
import type { LeadWithDetails, LeadTemperature } from '@/types/database'
import { leadTemperatureConfig } from '@/lib/lead-config'

const schema = z.object({
  name: z.string().optional(),
  phone: z.string().min(8, 'Telefone invalido'),
  email: z.string().email('Email invalido').optional().or(z.literal('')),
  stage_id: z.string().uuid(),
  source_id: z.string().optional(),
  temperature: z.enum(['cold', 'warm', 'hot', 'fire']),
  deal_value: z.number().nonnegative().optional(),
  observations: z.string().optional(),
  tags: z.array(z.string()),
})

type FormValues = z.infer<typeof schema>

interface EditLeadModalProps {
  lead: LeadWithDetails | null
  open: boolean
  onClose: () => void
}

const EditLeadModal = ({ lead, open, onClose }: EditLeadModalProps) => {
  const updateLead = useUpdateLead()
  const deleteLead = useDeleteLead()
  const { data: stages } = usePipelineStages()
  const { data: sources } = useLeadSources()

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (lead) {
      reset({
        name: lead.name ?? '',
        phone: lead.phone,
        email: lead.email ?? '',
        stage_id: lead.stage_id,
        source_id: lead.source_id ?? undefined,
        temperature: lead.temperature,
        deal_value: lead.deal_value ?? 0,
        observations: lead.observations ?? '',
        tags: lead.tags,
      })
    }
  }, [lead, reset])

  const onSubmit = async (values: FormValues) => {
    if (!lead) return

    const oldStageId = lead.stage_id
    const newStageId = values.stage_id

    await updateLead.mutateAsync({
      leadId: lead.id,
      data: {
        ...values,
        name: values.name || null,
        email: values.email || null,
        source_id: values.source_id || null,
        deal_value: values.deal_value || null,
        observations: values.observations || null,
      },
    })

    if (newStageId !== oldStageId) {
      const newStage = stages?.find((s) => s.id === newStageId)
      if (newStage?.is_final && newStage?.is_positive) {
        triggerCelebration()
        toast.success('Negocio fechado! 🎉')
      }
    }

    onClose()
  }

  const handleDelete = async () => {
    if (!lead) return
    if (!confirm('Tem certeza que deseja remover este lead?')) return
    await deleteLead.mutateAsync(lead.id)
    onClose()
  }

  if (!lead) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{lead.name || lead.phone}</DialogTitle>
          <DialogDescription>Editar informacoes do lead</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informacoes</TabsTrigger>
            <TabsTrigger value="history">Historico</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input {...register('phone')} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input {...register('name')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" {...register('email')} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Fase</Label>
                  <Controller
                    control={control}
                    name="stage_id"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {stages?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Controller
                    control={control}
                    name="source_id"
                    render={({ field }) => (
                      <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {sources?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Temperatura</Label>
                  <Controller
                    control={control}
                    name="temperature"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(v) => field.onChange(v as LeadTemperature)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(leadTemperatureConfig) as LeadTemperature[]).map((t) => (
                            <SelectItem key={t} value={t}>
                              {leadTemperatureConfig[t].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" {...register('deal_value', { valueAsNumber: true })} />
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Score IA: <span className="font-medium text-foreground">{lead.ai_score}/100</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Status: <span className="font-medium text-foreground">{lead.conversation_status}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Criado em: <span className="font-medium text-foreground">
                    {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Observacoes</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 input-clean"
                  {...register('observations')}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <Controller
                  control={control}
                  name="tags"
                  render={({ field }) => (
                    <LeadTagsInput value={field.value} onChange={field.onChange} />
                  )}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteLead.isPending}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Remover
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                  <Button type="submit" disabled={updateLead.isPending}>
                    {updateLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </div>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">Historico de atividades em breve</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export { EditLeadModal }
