import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { useTeamMembers } from '@/hooks/use-team'
import * as leadsService from '@/services/leads.service'

/**
 * Hook para buscar leads no contexto do dashboard, independente do store do Kanban.
 * Quando pipelineId é null/undefined, busca todos os leads (sem filtro de pipeline).
 * Quando pipelineId é uma string, filtra por aquele pipeline.
 */
export const useDashboardLeads = (pipelineId?: string | null, showArchived = false) => {
  const companyId = useAuthStore((s) => s.company?.id)
  const { data: members } = useTeamMembers()

  return useQuery({
    queryKey: ['dashboard-leads', companyId, pipelineId, showArchived],
    queryFn: async () => {
      const leads = await leadsService.getLeadsByCompany(companyId!, {
        pipelineId: pipelineId ?? undefined,
        limit: 500,
      })
      const profileMap = new Map(
        members?.map((m) => [m.id, { id: m.id, name: m.name, email: m.email }]) ?? []
      )
      return leads.map((lead) => ({
        ...lead,
        profiles: lead.assigned_to ? profileMap.get(lead.assigned_to) ?? null : null,
      }))
    },
    enabled: !!companyId,
    staleTime: 30 * 1000,
  })
}
