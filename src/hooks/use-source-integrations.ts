import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import * as service from '@/services/source-integrations.service'
import type { IntegrationType } from '@/types/database'

export const useSourceIntegrations = () => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['source-integrations', companyId],
    queryFn: () => service.getIntegrations(companyId!),
    enabled: !!companyId,
  })
}

export const useSaveIntegration = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)
  return useMutation({
    mutationFn: ({ sourceId, type, config }: { sourceId: string; type: IntegrationType; config: Record<string, unknown> }) =>
      service.saveIntegration(companyId!, sourceId, type, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source-integrations'] })
      toast.success('Integracao salva!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
