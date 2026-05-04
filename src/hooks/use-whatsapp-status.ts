import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import type { WhatsAppStatus } from '@/types/database'

export const useWhatsAppStatus = () => {
  const companyId = useAuthStore((s) => s.company?.id)

  return useQuery({
    queryKey: ['whatsapp-status', companyId],
    queryFn: async (): Promise<WhatsAppStatus | null> => {
      const { data } = await supabase
        .from('oauth_integrations')
        .select('status')
        .eq('provider', 'zapi')
        .eq('company_id', companyId!)
        .maybeSingle()
      return (data?.status as WhatsAppStatus) ?? null
    },
    enabled: !!companyId,
    refetchInterval: 1000 * 60 * 2, // re-check a cada 2 min
  })
}
