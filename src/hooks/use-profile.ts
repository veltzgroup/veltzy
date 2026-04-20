import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { getProfile } from '@/services/profile.service'

export const useProfile = () => {
  const userId = useAuthStore((s) => s.user?.id)

  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
  })
}
