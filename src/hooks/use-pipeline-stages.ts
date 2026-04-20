import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import * as pipelineService from '@/services/pipeline.service'

export const usePipelineStages = () => {
  const companyId = useAuthStore((s) => s.company?.id)

  return useQuery({
    queryKey: ['pipeline-stages', companyId],
    queryFn: () => pipelineService.getPipelineStages(companyId!),
    enabled: !!companyId,
  })
}

export const useCreateStage = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: (input: { name: string; slug: string; color: string; position: number }) =>
      pipelineService.createStage(companyId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] })
      toast.success('Fase criada!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao criar fase')
    },
  })
}

export const useUpdateStage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ stageId, data }: { stageId: string; data: Parameters<typeof pipelineService.updateStage>[1] }) =>
      pipelineService.updateStage(stageId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao atualizar fase')
    },
  })
}

export const useDeleteStage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (stageId: string) => pipelineService.deleteStage(stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] })
      toast.success('Fase removida!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao remover fase')
    },
  })
}

export const useReorderStages = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (stages: { id: string; position: number }[]) =>
      pipelineService.reorderStages(stages),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao reordenar fases')
    },
  })
}
