import { supabase } from '@/lib/supabase'
import type { AppRole, UserRole } from '@/types/database'

export const getUserRoles = async (userId: string): Promise<UserRole[]> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return data
}

export const hasRole = async (userId: string, role: AppRole): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', role)
    .maybeSingle()
  if (error) throw error
  return !!data
}

export const isAdmin = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  return hasRole(user.id, 'admin')
}

export const isSuperAdmin = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  return hasRole(user.id, 'super_admin')
}
