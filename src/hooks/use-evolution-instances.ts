import { useQuery } from '@tanstack/react-query'
import { getCompanyInstances } from '@/services/evolution.service'
import { useAuthStore } from '@/stores/auth.store'

export function useEvolutionInstances() {
  const companyId = useAuthStore((s) => s.company?.id)

  return useQuery({
    queryKey: ['evolution-instances', companyId],
    queryFn: () => getCompanyInstances(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  })
}
