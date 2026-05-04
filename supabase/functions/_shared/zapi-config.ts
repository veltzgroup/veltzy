import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface ZApiConfig {
  id: string
  company_id: string
  instance_id: string
  instance_token: string
  client_token: string
  server_url: string
  status: string
  phone_number: string | null
  qr_code: string | null
  connected_at: string | null
}

export async function getZApiConfigByCompany(
  supabase: SupabaseClient,
  companyId: string,
  extraFilters?: { status?: string }
): Promise<ZApiConfig | null> {
  let query = supabase
    .from('oauth_integrations')
    .select('id, company_id, provider, status, metadata')
    .eq('provider', 'zapi')
    .eq('company_id', companyId)

  if (extraFilters?.status) {
    query = query.eq('status', extraFilters.status)
  }

  const { data, error } = await query.maybeSingle()
  if (error || !data) return null

  return mapToZApiConfig(data)
}

export async function getZApiConfigByInstanceId(
  supabase: SupabaseClient,
  instanceId: string
): Promise<ZApiConfig | null> {
  const { data, error } = await supabase
    .from('oauth_integrations')
    .select('id, company_id, provider, status, metadata')
    .eq('provider', 'zapi')
    .eq('metadata->>instance_id', instanceId)
    .maybeSingle()

  if (error || !data) return null

  return mapToZApiConfig(data)
}

export async function getAllConnectedZApiConfigs(
  supabase: SupabaseClient
): Promise<ZApiConfig[]> {
  const { data, error } = await supabase
    .from('oauth_integrations')
    .select('id, company_id, provider, status, metadata')
    .eq('provider', 'zapi')
    .eq('status', 'connected')

  if (error || !data) return []

  return data.map(mapToZApiConfig)
}

export async function updateZApiMetadata(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Pick<ZApiConfig, 'status' | 'phone_number' | 'qr_code' | 'connected_at'>>
): Promise<void> {
  const { data: current } = await supabase
    .from('oauth_integrations')
    .select('metadata, status')
    .eq('id', id)
    .single()

  if (!current) return

  const newMetadata = { ...current.metadata }
  if (updates.phone_number !== undefined) newMetadata.phone_number = updates.phone_number
  if (updates.qr_code !== undefined) newMetadata.qr_code = updates.qr_code
  if (updates.connected_at !== undefined) newMetadata.connected_at = updates.connected_at

  const updatePayload: Record<string, unknown> = { metadata: newMetadata }
  if (updates.status !== undefined) updatePayload.status = updates.status

  await supabase
    .from('oauth_integrations')
    .update(updatePayload)
    .eq('id', id)
}

function mapToZApiConfig(row: {
  id: string
  company_id: string
  status: string
  metadata: Record<string, unknown>
}): ZApiConfig {
  const m = row.metadata
  return {
    id: row.id,
    company_id: row.company_id,
    instance_id: (m.instance_id as string) ?? '',
    instance_token: (m.token as string) ?? '',
    client_token: (m.client_token as string) ?? '',
    server_url: (m.server_url as string) ?? 'https://api.z-api.io',
    status: row.status,
    phone_number: (m.phone_number as string) ?? null,
    qr_code: (m.qr_code as string) ?? null,
    connected_at: (m.connected_at as string) ?? null,
  }
}

export function buildZApiUrl(config: ZApiConfig): string {
  return `${config.server_url}/instances/${config.instance_id}/token/${config.instance_token}`
}

export function buildZApiHeaders(config: ZApiConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Client-Token': config.client_token,
  }
}
