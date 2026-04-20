import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { getPersonalReport } from '@/services/personal-reports.service'

export const usePersonalReport = (days = 30) => {
  const profileId = useAuthStore((s) => s.profile?.id)
  return useQuery({
    queryKey: ['personal-report', profileId, days],
    queryFn: () => getPersonalReport(profileId!, days),
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  })
}
