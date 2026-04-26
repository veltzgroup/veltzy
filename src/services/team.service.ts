import { supabase, veltzy } from '@/lib/supabase'
import type { ProfileWithRole, CompanyInvite, AppRole } from '@/types/database'

export const getMembers = async (companyId: string): Promise<ProfileWithRole[]> => {
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('*')
    .eq('company_id', companyId)
    .order('name')
  if (profError) throw profError

  const userIds = profiles.map((p) => p.user_id)
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .in('user_id', userIds)
  if (rolesError) throw rolesError

  return profiles.map((p) => ({
    ...p,
    user_roles: roles.filter((r) => r.user_id === p.user_id),
  }))
}

export const inviteMember = async (companyId: string, email: string, role: AppRole, invitedBy: string): Promise<CompanyInvite> => {
  const { data, error } = await veltzy()
    .from('company_invites')
    .insert({ company_id: companyId, email, role, invited_by: invitedBy })
    .select()
    .single()
  if (error) throw error
  return data
}

export const getInvites = async (companyId: string): Promise<CompanyInvite[]> => {
  const { data, error } = await veltzy()
    .from('company_invites')
    .select('*')
    .eq('company_id', companyId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const cancelInvite = async (inviteId: string): Promise<void> => {
  const { error } = await veltzy()
    .from('company_invites')
    .delete()
    .eq('id', inviteId)
  if (error) throw error
}

export const updateMemberRole = async (companyId: string, userId: string, role: AppRole): Promise<void> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .single()
  if (!profile) throw new Error('Membro nao pertence a esta empresa')

  await supabase.from('user_roles').delete().eq('user_id', userId).neq('role', 'super_admin')
  const { error } = await supabase.from('user_roles').insert({ user_id: userId, role })
  if (error) throw error
}

export const removeMember = async (companyId: string, targetUserId: string): Promise<void> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', targetUserId)
    .eq('company_id', companyId)
    .single()
  if (!profile) throw new Error('Membro nao pertence a esta empresa')

  const { error } = await supabase.rpc('remove_user_from_company', { p_target_user_id: targetUserId })
  if (error) throw error
}

export const acceptInvite = async (inviteCode: string, userId: string): Promise<{ success: boolean; company_id?: string; error?: string }> => {
  const { data, error } = await supabase.rpc('accept_invite', { p_invite_code: inviteCode, p_user_id: userId })
  if (error) throw error
  return data
}

export const resetMemberPassword = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/update-password`,
  })
  if (error) throw error
}

export const setFallbackLeadOwner = async (companyId: string, profileId: string | null): Promise<void> => {
  const { data: existing } = await veltzy()
    .from('system_settings')
    .select('value')
    .eq('company_id', companyId)
    .eq('key', 'business_rules')
    .single()

  const value = { ...(existing?.value as Record<string, unknown> ?? {}), fallback_lead_owner: profileId }
  const { error } = await veltzy()
    .from('system_settings')
    .update({ value })
    .eq('company_id', companyId)
    .eq('key', 'business_rules')
  if (error) throw error
}

export const getFallbackLeadOwner = async (companyId: string): Promise<string | null> => {
  const { data } = await veltzy()
    .from('system_settings')
    .select('value')
    .eq('company_id', companyId)
    .eq('key', 'business_rules')
    .single()
  return (data?.value as Record<string, unknown>)?.fallback_lead_owner as string | null ?? null
}
