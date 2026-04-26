import { veltzy as db } from '@/lib/supabase'
import type { SdrConfig } from '@/types/database'

export const getSdrConfig = async (companyId: string): Promise<SdrConfig> => {
  const { data, error } = await db()
    .from('system_settings')
    .select('value')
    .eq('company_id', companyId)
    .eq('key', 'sdr_config')
    .single()
  if (error) throw error
  return data.value as SdrConfig
}

export const saveSdrConfig = async (companyId: string, config: SdrConfig): Promise<void> => {
  const { error } = await db()
    .from('system_settings')
    .update({ value: config as unknown as Record<string, unknown> })
    .eq('company_id', companyId)
    .eq('key', 'sdr_config')
  if (error) throw error
}

export const toggleSdrForLead = async (companyId: string, leadId: string, enabled: boolean): Promise<void> => {
  const { error } = await db()
    .from('leads')
    .update({ is_ai_active: enabled })
    .eq('id', leadId)
    .eq('company_id', companyId)
  if (error) throw error
}
