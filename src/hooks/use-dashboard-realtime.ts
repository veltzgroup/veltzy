import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

export const useDashboardRealtime = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  useEffect(() => {
    if (!companyId) return

    const channel = supabase
      .channel(`dashboard:${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'veltzy',
          table: 'leads',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
          queryClient.invalidateQueries({ queryKey: ['leads'] })
          queryClient.invalidateQueries({ queryKey: ['pipeline-overview'] })
          queryClient.invalidateQueries({ queryKey: ['historical-conversion-rates'] })
          queryClient.invalidateQueries({ queryKey: ['monthly-comparison-grid'] })
          queryClient.invalidateQueries({ queryKey: ['monthly-comparison'] })
          queryClient.invalidateQueries({ queryKey: ['leads-by-source'] })
          queryClient.invalidateQueries({ queryKey: ['seller-performance'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [companyId, queryClient])
}
