import { veltzy as db } from '@/lib/supabase'
import type { LeadSourceRecord } from '@/types/database'

export const getLeadSources = async (companyId: string): Promise<LeadSourceRecord[]> => {
  const { data, error } = await db()
    .from('lead_sources')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data
}
