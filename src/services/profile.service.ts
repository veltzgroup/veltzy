import { supabasePublic as supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

export const getProfile = async (userId: string): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data
}

export const getCurrentProfile = async (): Promise<Profile | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()
  if (error) throw error
  return data
}

export const updateProfile = async (profileId: string, updates: Partial<Profile>): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const getCompanyMembers = async (companyId: string): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('company_id', companyId)
    .order('name')
  if (error) throw error
  return data
}
