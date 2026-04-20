import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { getLogs } from '@/services/automations.service'

export const useAutomationLogs = (limit = 50) => {
  const companyId = useAuthStore((s) => s.company?.id)

  return useQuery({
    queryKey: ['automation-logs', companyId, limit],
    queryFn: () => getLogs(companyId!, limit),
    enabled: !!companyId,
  })
}
