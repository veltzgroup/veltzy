import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { useAllPipelineStages } from '@/hooks/use-pipeline-stages'
import { useLeadSources } from '@/hooks/use-lead-sources'
import { usePipelines } from '@/hooks/use-pipelines'
import { useTeamMembers } from '@/hooks/use-team'
import type { ParsedCsv, LeadField } from '@/lib/csv-parser'
import {
  mapCsvRowToLead,
  importLeads,
  type ImportBatchResult,
  type ImportableRow,
} from '@/services/import-leads.service'
import type { LeadTemperature } from '@/types/database'

export interface ImportConfig {
  columnMapping: Record<number, LeadField | null>
  defaultStageId: string
  defaultSourceId?: string
  defaultTemperature?: LeadTemperature
}

export interface ImportProgress {
  phase: 'idle' | 'validating' | 'importing' | 'done'
  current: number
  total: number
}

export const useImportLeads = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)
  const { data: stages } = useAllPipelineStages()
  const { data: sources } = useLeadSources()
  const { data: pipelines } = usePipelines()
  const { data: members } = useTeamMembers()
  const [progress, setProgress] = useState<ImportProgress>({ phase: 'idle', current: 0, total: 0 })
  const [result, setResult] = useState<ImportBatchResult | null>(null)
  const [isPending, setIsPending] = useState(false)

  const execute = useCallback(async (parsedCsv: ParsedCsv, config: ImportConfig) => {
    if (!companyId || !stages || !sources || !pipelines) return

    setIsPending(true)
    setProgress({ phase: 'validating', current: 0, total: parsedCsv.totalRows })

    try {
      const rows: ImportableRow[] = parsedCsv.rows.map((row) =>
        mapCsvRowToLead(row, config.columnMapping, config.defaultStageId, config.defaultSourceId, {
          stages,
          sources,
          pipelines,
          members: members ?? [],
        })
      )

      setProgress({ phase: 'importing', current: 0, total: rows.length })

      const batchResult = await importLeads(companyId, rows, (done, total) => {
        setProgress({ phase: 'importing', current: done, total })
      })

      setResult(batchResult)
      setProgress({ phase: 'done', current: rows.length, total: rows.length })

      queryClient.invalidateQueries({ queryKey: ['leads'] })

      if (batchResult.inserted > 0) {
        toast.success(`${batchResult.inserted} leads importados com sucesso`)
      }
      if (batchResult.errors > 0) {
        toast.error(`${batchResult.errors} linhas com erro`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro na importação')
      setProgress({ phase: 'idle', current: 0, total: 0 })
    } finally {
      setIsPending(false)
    }
  }, [companyId, stages, sources, pipelines, members, queryClient])

  const reset = useCallback(() => {
    setProgress({ phase: 'idle', current: 0, total: 0 })
    setResult(null)
    setIsPending(false)
  }, [])

  return { execute, progress, result, isPending, reset }
}
