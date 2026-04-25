import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import * as teamService from '@/services/team.service'

export const useTeamMembers = () => {
  const companyId = useAuthStore((s) => s.company?.id)

  return useQuery({
    queryKey: ['team-members', companyId],
    queryFn: () => teamService.getMembers(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  })
}
