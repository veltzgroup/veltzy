import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import * as automationsService from '@/services/automations.service'
import type { AutomationRule } from '@/types/database'

export const useAutomationRules = () => {
  const companyId = useAuthStore((s) => s.company?.id)

  return useQuery({
    queryKey: ['automation-rules', companyId],
    queryFn: () => automationsService.getRules(companyId!),
    enabled: !!companyId,
  })
}

export const useCreateRule = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: (input: Omit<AutomationRule, 'id' | 'company_id' | 'created_at' | 'updated_at'>) =>
      automationsService.createRule(companyId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      toast.success('Regra criada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export const useUpdateRule = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof automationsService.updateRule>[1] }) =>
      automationsService.updateRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export const useDeleteRule = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => automationsService.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      toast.success('Regra removida!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export const useToggleRule = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      automationsService.toggleRule(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
    },
  })
}
