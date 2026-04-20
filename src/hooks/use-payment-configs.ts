import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import * as paymentsService from '@/services/payments.service'
import type { PaymentProvider, PaymentEnvironment } from '@/types/database'

export const usePaymentConfigs = () => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['payment-configs', companyId],
    queryFn: () => paymentsService.getPaymentConfigs(companyId!),
    enabled: !!companyId,
  })
}

export const useSavePaymentConfig = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)
  return useMutation({
    mutationFn: (input: { provider: PaymentProvider; api_key: string; api_secret?: string; webhook_secret?: string; environment: PaymentEnvironment }) =>
      paymentsService.savePaymentConfig(companyId!, input.provider, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-configs'] })
      toast.success('Configuracao salva!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export const useTogglePaymentConfig = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      paymentsService.togglePaymentConfig(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-configs'] }),
  })
}
