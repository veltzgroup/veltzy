import { veltzy as db } from '@/lib/supabase'
import type { AutomationRule, AutomationLog } from '@/types/database'

export const getRules = async (companyId: string): Promise<AutomationRule[]> => {
  const { data, error } = await db()
    .from('automation_rules')
    .select('*')
    .eq('company_id', companyId)
    .order('priority', { ascending: false })
  if (error) throw error
  return data
}

export const createRule = async (
  companyId: string,
  input: Omit<AutomationRule, 'id' | 'company_id' | 'created_at' | 'updated_at'>
): Promise<AutomationRule> => {
  const { data, error } = await db()
    .from('automation_rules')
    .insert({ ...input, company_id: companyId })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateRule = async (
  companyId: string,
  id: string,
  input: Partial<Pick<AutomationRule, 'name' | 'trigger_type' | 'conditions' | 'action_type' | 'action_data' | 'priority' | 'is_enabled'>>
): Promise<AutomationRule> => {
  const { data, error } = await db()
    .from('automation_rules')
    .update(input)
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteRule = async (companyId: string, id: string): Promise<void> => {
  const { error } = await db()
    .from('automation_rules')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) throw error
}

export const toggleRule = async (companyId: string, id: string, enabled: boolean): Promise<void> => {
  const { error } = await db()
    .from('automation_rules')
    .update({ is_enabled: enabled })
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) throw error
}

export const getLogs = async (companyId: string, limit = 50): Promise<AutomationLog[]> => {
  const { data, error } = await db()
    .from('automation_logs')
    .select('*')
    .eq('company_id', companyId)
    .order('executed_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
