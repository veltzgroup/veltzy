import { supabase } from '@/lib/supabase'
import type { Company } from '@/types/database'

export const createCompany = async (name: string, slug: string): Promise<Company> => {
  const { data, error } = await supabase
    .from('companies')
    .insert({ name, slug })
    .select()
    .single()
  if (error) throw error
  return data
}

export const getCompany = async (companyId: string): Promise<Company> => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()
  if (error) throw error
  return data
}

export const updateCompany = async (companyId: string, updates: Partial<Company>): Promise<Company> => {
  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', companyId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const getCurrentCompany = async (): Promise<Company | null> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .single()

  if (!profile?.company_id) return null

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', profile.company_id)
    .single()
  if (error) throw error
  return data
}
