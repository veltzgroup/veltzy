import { supabase } from '@/lib/supabase'
import type { ActivityLog } from '@/types/database'

export const getActivityLogs = async (companyId: string, limit = 50, offset = 0): Promise<ActivityLog[]> => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data
}
