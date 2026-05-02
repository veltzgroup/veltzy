import { supabase } from '@/lib/supabase'

export type AuditEvent =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'invite_sent'
  | 'invite_accepted'
  | 'invite_revoked'
  | 'role_changed'
  | 'company_switched'
  | 'password_reset'
  | 'google_oauth_linked'
  | 'login_new_device'

export const logAuditEvent = async (
  event: AuditEvent,
  metadata: Record<string, unknown> = {},
  companyId?: string
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('auth_audit_log').insert({
      user_id: user?.id ?? null,
      company_id: companyId ?? null,
      event,
      metadata,
    })
  } catch (err) {
    console.error('[Audit] Erro ao registrar evento:', err)
  }
}
