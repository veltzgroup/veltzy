import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

interface LimitResult {
  allowed: boolean
  current: number
  limit: number
}

export const useCompanyLimits = (type: 'users' | 'leads') => {
  const companyId = useAuthStore((s) => s.company?.id)

  return useQuery({
    queryKey: ['company-limits', companyId, type],
    queryFn: async (): Promise<LimitResult> => {
      const { data, error } = await supabase.rpc('check_company_limits', {
        p_company_id: companyId!,
        p_type: type,
      })
      if (error) throw error
      return data as LimitResult
    },
    enabled: !!companyId,
    staleTime: 60 * 1000,
  })
}
