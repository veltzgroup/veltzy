import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { getLeadSources } from '@/services/lead-sources.service'

export const useLeadSources = () => {
  const companyId = useAuthStore((s) => s.company?.id)

  return useQuery({
    queryKey: ['lead-sources', companyId],
    queryFn: () => getLeadSources(companyId!),
    enabled: !!companyId,
  })
}
