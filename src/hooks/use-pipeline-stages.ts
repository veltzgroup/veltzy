import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { usePipelineStore } from '@/stores/pipeline.store'
import * as pipelineService from '@/services/pipeline.service'

export const usePipelineStages = (pipelineIdOverride?: string | null) => {
  const companyId = useAuthStore((s) => s.company?.id)
  const activePipelineId = usePipelineStore((s) => s.activePipelineId)
  const pipelineId = pipelineIdOverride ?? activePipelineId

  return useQuery({
    queryKey: ['pipeline-stages', companyId, pipelineId],
    queryFn: () => pipelineService.getPipelineStages(companyId!, pipelineId!),
    enabled: !!companyId && !!pipelineId,
  })
}

export const useCreateStage = (pipelineIdOverride?: string | null) => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)
  const activePipelineId = usePipelineStore((s) => s.activePipelineId)
  const pipelineId = pipelineIdOverride ?? activePipelineId

  return useMutation({
    mutationFn: (input: { name: string; slug: string; color: string; position: number }) =>
      pipelineService.createStage(companyId!, pipelineId!, input),
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
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: ({ stageId, data }: { stageId: string; data: Parameters<typeof pipelineService.updateStage>[2] }) =>
      pipelineService.updateStage(companyId!, stageId, data),
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
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: (stageId: string) => pipelineService.deleteStage(companyId!, stageId),
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
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: (stages: { id: string; position: number }[]) =>
      pipelineService.reorderStages(companyId!, stages),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao reordenar fases')
    },
  })
}
