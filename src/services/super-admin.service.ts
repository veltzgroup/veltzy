import { supabase } from '@/lib/supabase'
import type { Company } from '@/types/database'

export const getAllCompanies = async (): Promise<Company[]> => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const toggleCompanyActive = async (companyId: string, active: boolean): Promise<void> => {
  const { error } = await supabase
    .from('companies')
    .update({ is_active: active })
    .eq('id', companyId)
  if (error) throw error
}
