import { supabase } from '@/lib/supabase'
import type { WhatsAppConfig } from '@/types/database'

export const getConfig = async (companyId: string): Promise<WhatsAppConfig | null> => {
  const { data, error } = await supabase
    .from('oauth_integrations')
    .select('id, company_id, status, metadata, created_at, updated_at')
    .eq('provider', 'zapi')
    .eq('company_id', companyId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const m = data.metadata as Record<string, unknown>
  return {
    id: data.id,
    company_id: data.company_id,
    instance_id: (m.instance_id as string) ?? '',
    instance_token: (m.token as string) ?? '',
    client_token: (m.client_token as string) ?? '',
    phone_number: (m.phone_number as string) ?? null,
    status: data.status as WhatsAppConfig['status'],
    qr_code: (m.qr_code as string) ?? null,
    connected_at: (m.connected_at as string) ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

export const getStatus = async (companyId: string): Promise<{ status: string; phone_number: string | null }> => {
  const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
    body: { companyId, action: 'status' },
  })
  if (error) throw error
  return data
}

export const getQRCode = async (companyId: string): Promise<{ qr_code: string }> => {
  const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
    body: { companyId, action: 'qrcode' },
  })
  if (error) throw error
  return data
}

export const disconnect = async (companyId: string): Promise<void> => {
  const { error } = await supabase.functions.invoke('whatsapp-manager', {
    body: { companyId, action: 'disconnect' },
  })
  if (error) throw error
}
