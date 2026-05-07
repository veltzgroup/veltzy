import { supabase, veltzy } from '@/lib/supabase'
import { logAuditEvent } from '@/lib/audit'
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
  // Revogar convites pendentes anteriores para o mesmo email na mesma empresa
  await supabase
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('company_id', companyId)
    .eq('email', email)
    .eq('status', 'pending')

  const { data, error } = await supabase
    .from('invitations')
    .insert({ company_id: companyId, email, role, invited_by: invitedBy })
    .select()
    .single()
  if (error) throw error
  await logAuditEvent('invite_sent', { email, role, invite_id: data.id }, companyId)

  // Enviar email de convite via Edge Function
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single()
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('user_id', invitedBy)
    .single()

  const { error: emailError } = await supabase.functions.invoke('send-invite-email', {
    body: {
      invite_id: data.id,
      email,
      role,
      company_name: company?.name,
      token: data.token,
      invited_by_name: profile?.name,
    },
  })

  if (emailError) {
    console.error('[Convite] Falha ao enviar email:', emailError)
    throw new Error('Convite criado, mas falha ao enviar email. Tente reenviar.')
  }

  return data
}

export const getInvites = async (companyId: string): Promise<CompanyInvite[]> => {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const cancelInvite = async (inviteId: string): Promise<void> => {
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'revoked' as const })
    .eq('id', inviteId)
  if (error) throw error
  await logAuditEvent('invite_revoked', { invite_id: inviteId })
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
  await logAuditEvent('role_changed', { target_user_id: userId, new_role: role }, companyId)
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
