import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import * as sdrService from '@/services/sdr.service'
import type { SdrConfig } from '@/types/database'

export const useSdrConfig = () => {
  const companyId = useAuthStore((s) => s.company?.id)

  return useQuery({
    queryKey: ['sdr-config', companyId],
    queryFn: () => sdrService.getSdrConfig(companyId!),
    enabled: !!companyId,
  })
}

export const useSaveSdrConfig = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: (config: SdrConfig) => sdrService.saveSdrConfig(companyId!, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-config'] })
      toast.success('Configuracao SDR salva!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao salvar configuracao')
    },
  })
}

export const useToggleSdrForLead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ leadId, enabled }: { leadId: string; enabled: boolean }) =>
      sdrService.toggleSdrForLead(leadId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
