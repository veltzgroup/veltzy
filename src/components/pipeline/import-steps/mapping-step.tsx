import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { usePipelineStages } from '@/hooks/use-pipeline-stages'
import { useLeadSources } from '@/hooks/use-lead-sources'
import { autoMapColumns, LEAD_FIELD_LABELS, type LeadField } from '@/lib/csv-parser'
import type { ImportConfig } from '@/hooks/use-import-leads'

interface MappingStepProps {
  headers: string[]
  onNext: (config: ImportConfig) => void
  onBack: () => void
}

const ALL_FIELDS: LeadField[] = ['name', 'phone', 'email', 'source_id', 'stage_id', 'temperature', 'deal_value', 'observations', 'tags']

const MappingStep = ({ headers, onNext, onBack }: MappingStepProps) => {
  const { data: stages } = usePipelineStages()
  const { data: sources } = useLeadSources()
  const [mapping, setMapping] = useState<Record<number, LeadField | null>>({})
  const [defaultStageId, setDefaultStageId] = useState('')
  const [defaultSourceId, setDefaultSourceId] = useState<string | undefined>()

  useEffect(() => {
    setMapping(autoMapColumns(headers))
  }, [headers])

  useEffect(() => {
    if (stages && stages.length > 0 && !defaultStageId) {
      setDefaultStageId(stages[0].id)
    }
  }, [stages, defaultStageId])

  const usedFields = new Set(Object.values(mapping).filter(Boolean))
  const phoneIsMapped = usedFields.has('phone')
  const isValid = phoneIsMapped && !!defaultStageId

  const handleFieldChange = (colIndex: number, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [colIndex]: value === 'ignore' ? null : value as LeadField,
    }))
  }

  const handleSubmit = () => {
    if (!isValid) return
    onNext({
      columnMapping: mapping,
      defaultStageId,
      defaultSourceId,
    })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">Mapear colunas do CSV</p>
        <p className="text-xs text-muted-foreground">
          Associe cada coluna do arquivo a um campo do lead. Colunas marcadas como "Ignorar" nao serao importadas.
        </p>
      </div>

      <div className="max-h-[240px] overflow-y-auto space-y-2 pr-1 scrollbar-minimal">
        {headers.map((header, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-36 truncate text-sm text-muted-foreground" title={header}>
              {header}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Select
              value={mapping[index] ?? 'ignore'}
              onValueChange={(v) => handleFieldChange(index, v)}
            >
              <SelectTrigger className="h-8 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ignore">Ignorar</SelectItem>
                {ALL_FIELDS.map((field) => (
                  <SelectItem
                    key={field}
                    value={field}
                    disabled={usedFields.has(field) && mapping[index] !== field}
                  >
                    {LEAD_FIELD_LABELS[field]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
        <div className="space-y-2">
          <Label>Fase padrao *</Label>
          <Select value={defaultStageId} onValueChange={setDefaultStageId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {stages?.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Usada quando a coluna Fase nao esta mapeada ou o valor nao existe</p>
        </div>
        <div className="space-y-2">
          <Label>Origem padrao</Label>
          <Select value={defaultSourceId ?? 'none'} onValueChange={(v) => setDefaultSourceId(v === 'none' ? undefined : v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Nenhuma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {sources?.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!phoneIsMapped && (
        <p className="text-xs text-destructive">A coluna "Telefone" precisa estar mapeada para continuar</p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <Button onClick={handleSubmit} disabled={!isValid}>Proximo</Button>
      </div>
    </div>
  )
}

export { MappingStep }
