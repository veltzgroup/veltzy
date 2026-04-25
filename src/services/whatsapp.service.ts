import { supabase, veltzy } from '@/lib/supabase'
import type { WhatsAppConfig } from '@/types/database'

export const getConfig = async (companyId: string): Promise<WhatsAppConfig | null> => {
  const { data, error } = await veltzy()
    .from('whatsapp_configs')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()
  if (error) throw error
  return data
}

export const saveConfig = async (
  companyId: string,
  config: { instance_id: string; instance_token: string; client_token: string }
): Promise<WhatsAppConfig> => {
  const { data, error } = await veltzy()
    .from('whatsapp_configs')
    .upsert({ ...config, company_id: companyId }, { onConflict: 'company_id' })
    .select()
    .single()
  if (error) throw error
  return data
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
