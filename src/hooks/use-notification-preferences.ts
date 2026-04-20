import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { NotificationPreferences } from '@/types/database'

const defaultPrefs: NotificationPreferences = {
  new_lead: true,
  new_message: true,
  lead_transferred: true,
  system_alerts: true,
  sound_enabled: true,
}

export const useNotificationPreferences = () => {
  const userId = useAuthStore((s) => s.user?.id)
  const companyId = useAuthStore((s) => s.company?.id)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notification-prefs', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('company_id', companyId!)
        .eq('key', `notification_prefs_${userId}`)
        .maybeSingle()
      return (data?.value as NotificationPreferences) ?? defaultPrefs
    },
    enabled: !!userId && !!companyId,
  })

  const save = useMutation({
    mutationFn: async (prefs: NotificationPreferences) => {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          { company_id: companyId!, key: `notification_prefs_${userId}`, value: prefs as unknown as Record<string, unknown> },
          { onConflict: 'company_id,key' }
        )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-prefs'] })
      toast.success('Preferencias salvas!')
    },
  })

  return { prefs: query.data ?? defaultPrefs, isLoading: query.isLoading, savePrefs: save }
}
