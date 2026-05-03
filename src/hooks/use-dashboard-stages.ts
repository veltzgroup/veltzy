import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import * as pipelineService from '@/services/pipeline.service'

/**
 * Hook para buscar stages no contexto do dashboard.
 * Quando pipelineId é null/undefined, busca todos os stages da empresa.
 * Quando pipelineId é uma string, busca stages daquele pipeline.
 */
export const useDashboardStages = (pipelineId?: string | null) => {
  const companyId = useAuthStore((s) => s.company?.id)

  return useQuery({
    queryKey: ['dashboard-stages', companyId, pipelineId],
    queryFn: () =>
      pipelineId
        ? pipelineService.getPipelineStages(companyId!, pipelineId)
        : pipelineService.getAllPipelineStages(companyId!),
    enabled: !!companyId,
  })
}
