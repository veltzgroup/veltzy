import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { LeadTagsInput } from '@/components/pipeline/lead-tags-input'
import { useCreateLead } from '@/hooks/use-leads'
import { usePipelineStages } from '@/hooks/use-pipeline-stages'
import { useLeadSources } from '@/hooks/use-lead-sources'
import type { LeadTemperature } from '@/types/database'
import { leadTemperatureConfig } from '@/lib/lead-config'

const schema = z.object({
  phone: z.string().min(8, 'Telefone invalido'),
  name: z.string().optional(),
  email: z.string().email('Email invalido').optional().or(z.literal('')),
  stage_id: z.string().uuid(),
  source_id: z.string().uuid().optional(),
  temperature: z.enum(['cold', 'warm', 'hot', 'fire']),
  deal_value: z.number().nonnegative().optional(),
  observations: z.string().optional(),
  tags: z.array(z.string()),
})

type FormValues = z.infer<typeof schema>

interface CreateLeadModalProps {
  open: boolean
  onClose: () => void
  defaultStageId?: string
}

const CreateLeadModal = ({ open, onClose, defaultStageId }: CreateLeadModalProps) => {
  const createLead = useCreateLead()
  const { data: stages } = usePipelineStages()
  const { data: sources } = useLeadSources()

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      stage_id: defaultStageId ?? '',
      temperature: 'cold',
      tags: [],
    },
  })

  const onSubmit = async (values: FormValues) => {
    const input = {
      ...values,
      deal_value: values.deal_value || undefined,
      email: values.email || undefined,
      name: values.name || undefined,
      source_id: values.source_id || undefined,
      observations: values.observations || undefined,
    }
    await createLead.mutateAsync(input)
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>Preencha os dados do lead</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input placeholder="(11) 99999-9999" {...register('phone')} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Nome do lead" {...register('name')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="email@exemplo.com" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fase *</Label>
              <Controller
                control={control}
                name="stage_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.stage_id && <p className="text-xs text-destructive">{errors.stage_id.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Controller
                control={control}
                name="source_id"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(leadTemperatureConfig) as LeadTemperature[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {leadTemperatureConfig[t].emoji} {leadTemperatureConfig[t].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" placeholder="0,00" {...register('deal_value', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observacoes</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 input-clean"
              placeholder="Anotacoes sobre o lead..."
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { CreateLeadModal }
