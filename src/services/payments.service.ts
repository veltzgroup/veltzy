import { supabase } from '@/lib/supabase'
import type { PaymentConfig, PaymentProvider, PaymentEnvironment } from '@/types/database'

export const getPaymentConfigs = async (companyId: string): Promise<PaymentConfig[]> => {
  const { data, error } = await supabase
    .from('payment_configs')
    .select('*')
    .eq('company_id', companyId)
    .order('provider')
  if (error) throw error
  return data
}

export const savePaymentConfig = async (
  companyId: string,
  provider: PaymentProvider,
  input: { api_key: string; api_secret?: string; webhook_secret?: string; environment: PaymentEnvironment }
): Promise<PaymentConfig> => {
  const { data, error } = await supabase
    .from('payment_configs')
    .upsert({ company_id: companyId, provider, ...input }, { onConflict: 'company_id,provider' })
    .select()
    .single()
  if (error) throw error
  return data
}

export const togglePaymentConfig = async (id: string, active: boolean): Promise<void> => {
  const { error } = await supabase
    .from('payment_configs')
    .update({ is_active: active })
    .eq('id', id)
  if (error) throw error
}

export const deletePaymentConfig = async (id: string): Promise<void> => {
  const { error } = await supabase.from('payment_configs').delete().eq('id', id)
  if (error) throw error
}
