import { supabase } from '@/lib/supabase'

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
