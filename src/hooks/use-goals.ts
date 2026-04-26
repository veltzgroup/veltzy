import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import * as goalsService from '@/services/goals.service'
import type { CreateGoalInput, UpdateGoalInput } from '@/services/goals.service'

export const useGoals = () => {
  const companyId = useAuthStore((s) => s.company?.id)

  return useQuery({
    queryKey: ['goals', companyId],
    queryFn: () => goalsService.getGoals(companyId!),
    enabled: !!companyId,
    staleTime: 60 * 1000,
  })
}

export const useCreateGoal = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: (input: CreateGoalInput) =>
      goalsService.createGoal(companyId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Meta criada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export const useUpdateGoal = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoalInput }) =>
      goalsService.updateGoal(companyId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Meta atualizada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export const useDeleteGoal = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: (id: string) => goalsService.deleteGoal(companyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Meta removida!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
