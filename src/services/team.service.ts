import { supabase } from '@/lib/supabase'
import type { ProfileWithRole, CompanyInvite, AppRole } from '@/types/database'

export const getMembers = async (companyId: string): Promise<ProfileWithRole[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, user_roles(*)')
    .eq('company_id', companyId)
    .order('name')
  if (error) throw error
  return data
}

export const inviteMember = async (companyId: string, email: string, role: AppRole, invitedBy: string): Promise<CompanyInvite> => {
  const { data, error } = await supabase
    .from('company_invites')
    .insert({ company_id: companyId, email, role, invited_by: invitedBy })
    .select()
    .single()
  if (error) throw error
  return data
}

export const getInvites = async (companyId: string): Promise<CompanyInvite[]> => {
  const { data, error } = await supabase
    .from('company_invites')
    .select('*')
    .eq('company_id', companyId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const cancelInvite = async (inviteId: string): Promise<void> => {
  const { error } = await supabase
    .from('company_invites')
    .delete()
    .eq('id', inviteId)
  if (error) throw error
}

export const updateMemberRole = async (userId: string, role: AppRole): Promise<void> => {
  await supabase.from('user_roles').delete().eq('user_id', userId).neq('role', 'super_admin')
  const { error } = await supabase.from('user_roles').insert({ user_id: userId, role })
  if (error) throw error
}

export const removeMember = async (targetUserId: string): Promise<void> => {
  const { error } = await supabase.rpc('remove_user_from_company', { p_target_user_id: targetUserId })
  if (error) throw error
}

export const acceptInvite = async (inviteCode: string, userId: string): Promise<{ success: boolean; company_id?: string; error?: string }> => {
  const { data, error } = await supabase.rpc('accept_invite', { p_invite_code: inviteCode, p_user_id: userId })
  if (error) throw error
  return data
}
