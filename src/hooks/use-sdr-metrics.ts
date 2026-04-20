import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import * as sdrMetrics from '@/services/sdr-metrics.service'

export const useSdrMetrics = (days?: number) => {
  const companyId = useAuthStore((s) => s.company?.id)

  const kpis = useQuery({
    queryKey: ['sdr-kpis', companyId, days],
    queryFn: () => sdrMetrics.getSdrKpis(companyId!, days),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  })

  const distribution = useQuery({
    queryKey: ['sdr-distribution', companyId, days],
    queryFn: () => sdrMetrics.getScoreDistribution(companyId!, days),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  })

  return {
    kpis: kpis.data,
    distribution: distribution.data,
    isLoading: kpis.isLoading || distribution.isLoading,
  }
}
