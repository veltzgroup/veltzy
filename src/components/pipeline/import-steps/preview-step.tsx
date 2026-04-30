import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { usePipelineStages } from '@/hooks/use-pipeline-stages'
import { useLeadSources } from '@/hooks/use-lead-sources'
import { LEAD_FIELD_LABELS, type LeadField, type ParsedCsv } from '@/lib/csv-parser'
import { mapCsvRowToLead } from '@/services/import-leads.service'
import type { ImportConfig } from '@/hooks/use-import-leads'

interface PreviewStepProps {
  parsedCsv: ParsedCsv
  config: ImportConfig
  onNext: () => void
  onBack: () => void
}

const PreviewStep = ({ parsedCsv, config, onNext, onBack }: PreviewStepProps) => {
  const { data: stages } = usePipelineStages()
  const { data: sources } = useLeadSources()

  const mappedFields = useMemo(() => {
    return Object.entries(config.columnMapping)
      .filter(([, field]) => field !== null)
      .map(([, field]) => field as LeadField)
  }, [config.columnMapping])

  const previewData = useMemo(() => {
    if (!stages || !sources) return []
    return parsedCsv.previewRows.map((row) => {
      const lead = mapCsvRowToLead(row, config.columnMapping, config.defaultStageId, config.defaultSourceId, {
        stages,
        sources,
      })

      return mappedFields.map((field) => {
        switch (field) {
          case 'stage_id': {
            const stage = stages.find((s) => s.id === lead.stage_id)
            return stage?.name ?? lead.stage_id
          }
          case 'source_id': {
            const source = sources.find((s) => s.id === lead.source_id)
            return source?.name ?? '-'
          }
          case 'deal_value':
            return lead.deal_value != null ? `R$ ${lead.deal_value.toLocaleString('pt-BR')}` : '-'
          case 'tags':
            return lead.tags?.join(', ') || '-'
          default:
            return (lead[field as keyof typeof lead] as string) ?? '-'
        }
      })
    })
  }, [parsedCsv.previewRows, config, stages, sources, mappedFields])

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Preview da importacao</p>
        <p className="text-xs text-muted-foreground mt-1">
          Mostrando {parsedCsv.previewRows.length} de {parsedCsv.totalRows} linhas.
          {' '}<span className="font-medium text-foreground">{parsedCsv.totalRows} leads serao processados.</span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              {mappedFields.map((field) => (
                <th key={field} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                  {LEAD_FIELD_LABELS[field]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewData.map((row, i) => (
              <tr key={i} className="border-t">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <Button onClick={onNext}>Importar {parsedCsv.totalRows} leads</Button>
      </div>
    </div>
  )
}

export { PreviewStep }
