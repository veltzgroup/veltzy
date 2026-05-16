import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { usePipelines, useUpdatePipeline } from '@/hooks/use-pipelines'
import { useWhatsAppStatus } from '@/hooks/use-whatsapp-status'
import { useEvolutionInstances } from '@/hooks/use-evolution-instances'

interface PipelineSdrConfigProps {
  pipelineId: string | null
}

const PipelineSdrConfig = ({ pipelineId }: PipelineSdrConfigProps) => {
  const { data: whatsappStatus } = useWhatsAppStatus()
  const { data: instances } = useEvolutionInstances()
  const { data: pipelines } = usePipelines()
  const updatePipeline = useUpdatePipeline()

  const pipeline = pipelines?.find((p) => p.id === pipelineId)
  const isEvolution = whatsappStatus?.provider === 'evolution'

  const [sdrInstance, setSdrInstance] = useState('')
  const [transferTemplate, setTransferTemplate] = useState('')

  useEffect(() => {
    if (pipeline) {
      setSdrInstance(pipeline.sdr_instance_name ?? '')
      setTransferTemplate(pipeline.sdr_transfer_message_template ?? '')
    }
  }, [pipeline])

  if (!isEvolution || !pipelineId || !pipeline) return null

  const handleSave = () => {
    updatePipeline.mutate({
      pipelineId,
      data: {
        sdr_instance_name: sdrInstance || null,
        sdr_transfer_message_template: transferTemplate || null,
      },
    }, {
      onSuccess: () => toast.success('Configuracao SDR salva!'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Erro ao salvar'),
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <div>
            <CardTitle className="text-base">IA SDR - {pipeline.name}</CardTitle>
            <CardDescription>Configuracoes do SDR para este pipeline</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Numero WhatsApp do SDR</Label>
          <Select value={sdrInstance} onValueChange={setSdrInstance}>
            <SelectTrigger>
              <SelectValue placeholder="Usar numero do vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Usar numero do vendedor</SelectItem>
              {instances?.map((inst) => (
                <SelectItem key={inst.instance_name} value={inst.instance_name}>
                  {inst.phone_number ?? inst.instance_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            Numero dedicado que a IA usara para prospectar neste pipeline
          </p>
        </div>

        <div className="space-y-2">
          <Label>Mensagem de transfer SDR</Label>
          <textarea
            value={transferTemplate}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTransferTemplate(e.target.value)}
            placeholder="Ola! A partir de agora voce sera atendido por {vendedor_nome}. Em breve ele entrara em contato."
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-[10px] text-muted-foreground">
            Mensagem enviada ao lead quando o SDR transfere para vendedor. Use {'{vendedor_nome}'} para inserir o nome.
          </p>
        </div>

        <Button onClick={handleSave} disabled={updatePipeline.isPending} size="sm">
          {updatePipeline.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  )
}

export { PipelineSdrConfig }
