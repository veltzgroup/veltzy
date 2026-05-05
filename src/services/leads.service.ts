import { veltzy } from '@/lib/supabase'
import type { Lead, LeadWithDetails, CreateLeadInput, UpdateLeadInput } from '@/types/database'

const LEAD_WITH_DETAILS_SELECT = `
  *,
  lead_sources:source_id(*),
  pipeline_stages:stage_id(*),
  pipelines:pipeline_id(*)
`

interface LeadFilters {
  stageId?: string
  sourceId?: string | null
  temperature?: string | null
  assignedTo?: string | null
  pipelineId?: string
  search?: string
  limit?: number
  offset?: number
}

const sanitizeSearch = (search: string) =>
  search.replace(/[%_\\]/g, '\\$&')

export const getLeadsByCompany = async (companyId: string, filters?: LeadFilters): Promise<LeadWithDetails[]> => {
  const limit = filters?.limit ?? 100
  const offset = filters?.offset ?? 0

  let query = veltzy()
    .from('leads')
    .select(LEAD_WITH_DETAILS_SELECT)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters?.pipelineId) {
    query = query.eq('pipeline_id', filters.pipelineId)
  }
  if (filters?.stageId) {
    query = query.eq('stage_id', filters.stageId)
  }
  if (filters?.sourceId) {
    query = query.eq('source_id', filters.sourceId)
  }
  if (filters?.temperature) {
    query = query.eq('temperature', filters.temperature)
  }
  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo)
  }
  if (filters?.search) {
    const sanitized = sanitizeSearch(filters.search)
    query = query.or(`name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%,email.ilike.%${sanitized}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const getLeadById = async (companyId: string, leadId: string): Promise<LeadWithDetails> => {
  const { data, error } = await veltzy()
    .from('leads')
    .select(LEAD_WITH_DETAILS_SELECT)
    .eq('id', leadId)
    .eq('company_id', companyId)
    .single()
  if (error) throw error
  return data
}

export const createLead = async (companyId: string, input: CreateLeadInput): Promise<Lead> => {
  const { data, error } = await veltzy()
    .from('leads')
    .insert({ ...input, company_id: companyId })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateLead = async (companyId: string, leadId: string, input: UpdateLeadInput): Promise<Lead> => {
  const { data, error } = await veltzy()
    .from('leads')
    .update(input)
    .eq('id', leadId)
    .eq('company_id', companyId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteLead = async (companyId: string, leadId: string): Promise<void> => {
  const { error } = await veltzy()
    .from('leads')
    .delete()
    .eq('id', leadId)
    .eq('company_id', companyId)
  if (error) throw error
}

export const moveLeadToStage = async (companyId: string, leadId: string, stageId: string): Promise<Lead> => {
  const { data, error } = await veltzy()
    .from('leads')
    .update({ stage_id: stageId })
    .eq('id', leadId)
    .eq('company_id', companyId)
    .select()
    .single()
  if (error) throw error
  return data
}

const BATCH_SIZE = 50

const chunk = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export const bulkUpdateAssignedTo = async (companyId: string, leadIds: string[], targetUserId: string): Promise<void> => {
  const batches = chunk(leadIds, BATCH_SIZE)
  for (const batch of batches) {
    const { error } = await veltzy()
      .from('leads')
      .update({ assigned_to: targetUserId })
      .in('id', batch)
      .eq('company_id', companyId)
    if (error) throw error
  }
}

export const bulkArchive = async (companyId: string, leadIds: string[]): Promise<void> => {
  const batches = chunk(leadIds, BATCH_SIZE)
  for (const batch of batches) {
    const { error } = await veltzy()
      .from('leads')
      .update({ status: 'archived' as const })
      .in('id', batch)
      .eq('company_id', companyId)
    if (error) throw error
  }
}

export const bulkDelete = async (companyId: string, leadIds: string[], userId: string): Promise<void> => {
  const batches = chunk(leadIds, BATCH_SIZE)
  for (const batch of batches) {
    const { error } = await veltzy()
      .from('leads')
      .delete()
      .in('id', batch)
      .eq('company_id', companyId)
    if (error) throw error
  }

  // Log manual de bulk_delete (trigger nao cobre DELETE)
  const { error: logError } = await veltzy()
    .from('activity_logs')
    .insert({
      company_id: companyId,
      user_id: userId,
      action: 'bulk_delete',
      resource_type: 'lead',
      metadata: { lead_ids: leadIds, count: leadIds.length },
    })
  if (logError) throw logError
}

export const moveLeadToPipeline = async (companyId: string, leadId: string, targetPipelineId: string): Promise<Lead> => {
  const { data: firstStage, error: stageError } = await veltzy()
    .from('pipeline_stages')
    .select('id')
    .eq('pipeline_id', targetPipelineId)
    .order('position')
    .limit(1)
    .single()
  if (stageError) throw stageError

  const { data, error } = await veltzy()
    .from('leads')
    .update({ pipeline_id: targetPipelineId, stage_id: firstStage.id })
    .eq('id', leadId)
    .eq('company_id', companyId)
    .select()
    .single()
  if (error) throw error
  return data
}
