import { veltzy as db } from '@/lib/supabase'
import type { LeadSourceRecord } from '@/types/database'

export const getLeadSources = async (companyId: string): Promise<LeadSourceRecord[]> => {
  const { data, error } = await db()
    .from('lead_sources')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data
}

export const getAllLeadSources = async (companyId: string): Promise<LeadSourceRecord[]> => {
  const { data, error } = await db()
    .from('lead_sources')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at')
  if (error) throw error
  return data
}

export const createLeadSource = async (
  companyId: string,
  input: { name: string; slug: string; color: string; icon_name: string }
): Promise<LeadSourceRecord> => {
  const { data, error } = await db()
    .from('lead_sources')
    .insert({ ...input, company_id: companyId })
    .select()
    .single()
  if (error) throw error
  return data
}

export const toggleLeadSourceActive = async (
  companyId: string,
  id: string,
  isActive: boolean
): Promise<void> => {
  const { error } = await db()
    .from('lead_sources')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) throw error
}

export const deleteLeadSource = async (companyId: string, id: string): Promise<void> => {
  const { error } = await db()
    .from('lead_sources')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) throw error
}
