import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { getActivityLogs, getActivityLogsByResource } from '@/services/activity-logs.service'

export const useActivityLogs = (limit = 50, offset = 0) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['activity-logs', companyId, limit, offset],
    queryFn: () => getActivityLogs(companyId!, limit, offset),
    enabled: !!companyId,
  })
}

export const useLeadActivityLogs = (leadId: string | undefined) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['activity-logs', 'lead', leadId],
    queryFn: () => getActivityLogsByResource(companyId!, 'lead', leadId!),
    enabled: !!companyId && !!leadId,
  })
}
