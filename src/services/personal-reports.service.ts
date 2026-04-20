import { supabase } from '@/lib/supabase'
import type { PersonalReport } from '@/types/database'

export const getPersonalReport = async (profileId: string, days = 30): Promise<PersonalReport> => {
  const start = new Date()
  start.setDate(start.getDate() - days)

  const { data: leads } = await supabase
    .from('leads')
    .select('status, deal_value')
    .eq('assigned_to', profileId)
    .gte('created_at', start.toISOString())

  const all = leads ?? []
  const deals = all.filter((l) => l.status === 'deal')
  const revenue = deals.reduce((s, l) => s + (Number(l.deal_value) || 0), 0)

  return {
    assigned_leads: all.length,
    deals_closed: deals.length,
    conversion_rate: all.length > 0 ? Math.round((deals.length / all.length) * 1000) / 10 : 0,
    avg_response_time: null,
    revenue,
  }
}
