import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { getFallbackLeadOwner, setFallbackLeadOwner } from '@/services/team.service'

export const useFallbackOwner = () => {
  const companyId = useAuthStore((s) => s.company?.id)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['fallback-owner', companyId],
    queryFn: () => getFallbackLeadOwner(companyId!),
    enabled: !!companyId,
  })

  const setFallback = useMutation({
    mutationFn: (profileId: string | null) => setFallbackLeadOwner(companyId!, profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fallback-owner'] })
      toast.success('Responsavel fallback atualizado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return { fallbackOwnerId: query.data, isLoading: query.isLoading, setFallback }
}
