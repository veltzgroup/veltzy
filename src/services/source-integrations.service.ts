import { veltzy } from '@/lib/supabase'
import type { SourceIntegration, IntegrationType } from '@/types/database'

export const getIntegrations = async (companyId: string): Promise<SourceIntegration[]> => {
  const { data, error } = await veltzy()
    .from('source_integrations')
    .select('*')
    .eq('company_id', companyId)
  if (error) throw error
  return data
}

export const saveIntegration = async (
  companyId: string,
  sourceId: string,
  type: IntegrationType,
  config: Record<string, unknown>
): Promise<SourceIntegration> => {
  const { data, error } = await veltzy()
    .from('source_integrations')
    .upsert(
      { company_id: companyId, source_id: sourceId, integration_type: type, config },
      { onConflict: 'company_id,source_id,integration_type' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteIntegration = async (id: string): Promise<void> => {
  const { error } = await veltzy().from('source_integrations').delete().eq('id', id)
  if (error) throw error
}
