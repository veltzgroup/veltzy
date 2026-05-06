import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

export interface SalesPulseAlerta {
  tipo: 'urgente' | 'oportunidade' | 'atencao'
  texto: string
  lead_id?: string | null
}

export interface SalesPulseAcao {
  texto: string
  lead_id: string | null
  destino: 'inbox' | 'pipeline' | 'deals'
}

export interface SalesPulseData {
  situacao: string
  alertas: SalesPulseAlerta[]
  acoes: SalesPulseAcao[]
}

const getCacheKey = (companyId: string) => {
  const today = new Date().toISOString().slice(0, 10)
  return `sales_pulse_${companyId}_${today}`
}

const getFromCache = (companyId: string): SalesPulseData | null => {
  try {
    const raw = sessionStorage.getItem(getCacheKey(companyId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const saveToCache = (companyId: string, data: SalesPulseData) => {
  try {
    sessionStorage.setItem(getCacheKey(companyId), JSON.stringify(data))
  } catch { /* ignore quota errors */ }
}

export function useSalesPulse() {
  const company = useAuthStore((s) => s.company)
  const profile = useAuthStore((s) => s.profile)
  const roles = useAuthStore((s) => s.roles)
  const queryClient = useQueryClient()

  const role = roles.includes('admin') || roles.includes('manager') || roles.includes('super_admin')
    ? 'admin'
    : 'seller'

  const query = useQuery<SalesPulseData>({
    queryKey: ['sales-pulse', company?.id],
    queryFn: async () => {
      // Tenta cache primeiro
      if (company?.id) {
        const cached = getFromCache(company.id)
        if (cached) return cached
      }

      const { data, error } = await supabase.functions.invoke('ai-copilot', {
        body: {
          action: 'sales-pulse',
          company_id: company?.id,
          user_profile_id: profile?.id,
          user_name: profile?.name,
          role,
        },
      })
      if (error) throw error

      const result = data as SalesPulseData
      if (company?.id) saveToCache(company.id, result)
      return result
    },
    enabled: !!company?.id,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: company?.id ? getFromCache(company.id) ?? undefined : undefined,
  })

  const refresh = () => {
    if (company?.id) {
      sessionStorage.removeItem(getCacheKey(company.id))
    }
    queryClient.invalidateQueries({ queryKey: ['sales-pulse', company?.id] })
  }

  return { ...query, refresh }
}
