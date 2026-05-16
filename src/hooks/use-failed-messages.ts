import { useQuery } from '@tanstack/react-query'
import { getFailedMessageCount } from '@/services/evolution.service'
import { useAuthStore } from '@/stores/auth.store'
import { useRoles } from '@/hooks/use-roles'

export function useFailedMessages() {
  const companyId = useAuthStore((s) => s.company?.id)
  const { isAdmin, isManager } = useRoles()

  return useQuery({
    queryKey: ['failed-messages-count', companyId],
    queryFn: () => getFailedMessageCount(companyId!),
    enabled: !!companyId && (isAdmin || isManager),
    refetchInterval: 5 * 60 * 1000,
  })
}
