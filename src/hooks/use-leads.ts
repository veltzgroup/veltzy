import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { usePipelineStore } from '@/stores/pipeline.store'
import { useTeamMembers } from '@/hooks/use-team-members'
import * as leadsService from '@/services/leads.service'
import type { CreateLeadInput, UpdateLeadInput, LeadWithDetails } from '@/types/database'

export const useLeads = () => {
  const companyId = useAuthStore((s) => s.company?.id)
  const filters = usePipelineStore((s) => s.filters)
  const { data: members } = useTeamMembers()

  return useQuery({
    queryKey: ['leads', companyId, filters.sourceId, filters.temperature, filters.assignedTo],
    queryFn: async () => {
      const leads = await leadsService.getLeadsByCompany(companyId!, {
        sourceId: filters.sourceId,
        temperature: filters.temperature,
        assignedTo: filters.assignedTo,
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

const useLeadsQueryKey = () => {
  const companyId = useAuthStore((s) => s.company?.id)
  const filters = usePipelineStore((s) => s.filters)
  return ['leads', companyId, filters.sourceId, filters.temperature, filters.assignedTo] as const
}

export const useCreateLead = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: (input: CreateLeadInput) => leadsService.createLead(companyId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead criado com sucesso!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao criar lead')
    },
  })
}

export const useUpdateLead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ leadId, data }: { leadId: string; data: UpdateLeadInput }) =>
      leadsService.updateLead(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead atualizado!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao atualizar lead')
    },
  })
}

export const useDeleteLead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (leadId: string) => leadsService.deleteLead(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead removido!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao remover lead')
    },
  })
}

export const useMoveLeadToStage = () => {
  const queryClient = useQueryClient()
  const queryKey = useLeadsQueryKey()

  return useMutation({
    mutationFn: ({ leadId, stageId }: { leadId: string; stageId: string }) =>
      leadsService.moveLeadToStage(leadId, stageId),
    onMutate: async ({ leadId, stageId }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousLeads = queryClient.getQueryData<LeadWithDetails[]>(queryKey)

      queryClient.setQueryData<LeadWithDetails[]>(
        queryKey,
        (old) => old?.map((lead) => (lead.id === leadId ? { ...lead, stage_id: stageId } : lead))
      )

      return { previousLeads }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(queryKey, context.previousLeads)
      }
      toast.error('Erro ao mover lead. Tente novamente.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
