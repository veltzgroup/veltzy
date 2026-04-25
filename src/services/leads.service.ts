import { veltzy } from '@/lib/supabase'
import type { Lead, LeadWithDetails, CreateLeadInput, UpdateLeadInput } from '@/types/database'

const LEAD_WITH_DETAILS_SELECT = `
  *,
  lead_sources:source_id(*),
  pipeline_stages:stage_id(*)
`

interface LeadFilters {
  stageId?: string
  sourceId?: string | null
  temperature?: string | null
  assignedTo?: string | null
  search?: string
}

export const getLeadsByCompany = async (companyId: string, filters?: LeadFilters): Promise<LeadWithDetails[]> => {
  let query = veltzy()
    .from('leads')
    .select(LEAD_WITH_DETAILS_SELECT)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

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
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const getLeadById = async (leadId: string): Promise<LeadWithDetails> => {
  const { data, error } = await veltzy()
    .from('leads')
    .select(LEAD_WITH_DETAILS_SELECT)
    .eq('id', leadId)
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

export const updateLead = async (leadId: string, input: UpdateLeadInput): Promise<Lead> => {
  const { data, error } = await veltzy()
    .from('leads')
    .update(input)
    .eq('id', leadId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteLead = async (leadId: string): Promise<void> => {
  const { error } = await veltzy()
    .from('leads')
    .delete()
    .eq('id', leadId)
  if (error) throw error
}

export const moveLeadToStage = async (leadId: string, stageId: string): Promise<Lead> => {
  const { data, error } = await veltzy()
    .from('leads')
    .update({ stage_id: stageId })
    .eq('id', leadId)
    .select()
    .single()
  if (error) throw error
  return data
}
