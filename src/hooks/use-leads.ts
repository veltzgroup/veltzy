import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { usePipelineStore } from '@/stores/pipeline.store'
import * as leadsService from '@/services/leads.service'
import * as teamService from '@/services/team.service'
import type { CreateLeadInput, UpdateLeadInput, LeadWithDetails } from '@/types/database'

export const useLeads = () => {
  const companyId = useAuthStore((s) => s.company?.id)
  const filters = usePipelineStore((s) => s.filters)

  return useQuery({
    queryKey: ['leads', companyId, filters.sourceId, filters.temperature, filters.assignedTo],
    queryFn: async () => {
      const [leads, members] = await Promise.all([
        leadsService.getLeadsByCompany(companyId!, {
          sourceId: filters.sourceId,
          temperature: filters.temperature,
          assignedTo: filters.assignedTo,
        }),
        teamService.getMembers(companyId!),
      ])
      const profileMap = new Map(members.map((m) => [m.id, { id: m.id, name: m.name, email: m.email }]))
      return leads.map((lead) => ({
        ...lead,
        profiles: lead.assigned_to ? profileMap.get(lead.assigned_to) ?? null : null,
      }))
    },
    enabled: !!companyId,
  })
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

  return useMutation({
    mutationFn: ({ leadId, stageId }: { leadId: string; stageId: string }) =>
      leadsService.moveLeadToStage(leadId, stageId),
    onMutate: async ({ leadId, stageId }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] })
      const previousLeads = queryClient.getQueryData<LeadWithDetails[]>(['leads'])

      queryClient.setQueriesData<LeadWithDetails[]>(
        { queryKey: ['leads'] },
        (old) => old?.map((lead) => (lead.id === leadId ? { ...lead, stage_id: stageId } : lead))
      )

      return { previousLeads }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLeads) {
        queryClient.setQueriesData({ queryKey: ['leads'] }, context.previousLeads)
      }
      toast.error('Erro ao mover lead')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
