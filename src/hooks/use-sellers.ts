import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabasePublic as supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

export const useToggleAvailability = () => {
  const queryClient = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)

  return useMutation({
    mutationFn: async (available: boolean) => {
      if (!profile) return
      const { error } = await supabase
        .from('profiles')
        .update({ is_available: available, last_seen_at: new Date().toISOString() })
        .eq('id', profile.id)
      if (error) throw error
    },
    onSuccess: (_data, available) => {
      if (profile) setProfile({ ...profile, is_available: available })
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      queryClient.invalidateQueries({ queryKey: ['seller-performance'] })
    },
  })
}
