import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { getActivityLogs } from '@/services/activity-logs.service'

export const useActivityLogs = (limit = 50, offset = 0) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['activity-logs', companyId, limit, offset],
    queryFn: () => getActivityLogs(companyId!, limit, offset),
    enabled: !!companyId,
  })
}
