import { veltzy as db } from '@/lib/supabase'
import type { ReplyTemplate } from '@/types/database'

export const getTemplates = async (companyId: string): Promise<ReplyTemplate[]> => {
  const { data, error } = await db()
    .from('reply_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('category')
    .order('title')
  if (error) throw error
  return data
}

export const createTemplate = async (
  companyId: string,
  input: { title: string; content: string; category?: string }
): Promise<ReplyTemplate> => {
  const { data, error } = await db()
    .from('reply_templates')
    .insert({ ...input, company_id: companyId })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateTemplate = async (
  companyId: string,
  id: string,
  input: Partial<Pick<ReplyTemplate, 'title' | 'content' | 'category' | 'is_active'>>
): Promise<ReplyTemplate> => {
  const { data, error } = await db()
    .from('reply_templates')
    .update(input)
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteTemplate = async (companyId: string, id: string): Promise<void> => {
  const { error } = await db()
    .from('reply_templates')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) throw error
}
