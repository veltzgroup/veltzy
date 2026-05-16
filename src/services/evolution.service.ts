import { supabase } from '@/lib/supabase'
import type { EvolutionInstance } from '@/types/database'

const HUB_URL = import.meta.env.VITE_HUB_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL

/**
 * Lista instancias Evolution da empresa (chama Hub on-demand).
 */
export async function getCompanyInstances(companyId: string): Promise<EvolutionInstance[]> {
  const { data: session } = await supabase.auth.getSession()
  if (!session?.session?.access_token) return []

  try {
    const res = await fetch(`${HUB_URL}/functions/v1/evolution-instance-manage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session.access_token}`,
      },
      body: JSON.stringify({ action: 'list', company_id: companyId }),
    })

    if (!res.ok) return []
    const data = await res.json()
    return data.instances ?? []
  } catch {
    return []
  }
}

/**
 * Conta mensagens com delivery_status='failed' nos ultimos 7 dias.
 */
export async function getFailedMessageCount(companyId: string): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('delivery_status', 'failed')
    .gte('created_at', sevenDaysAgo)

  return count ?? 0
}
