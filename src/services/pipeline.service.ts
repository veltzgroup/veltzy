import { supabase } from '@/lib/supabase'
import type { PipelineStage } from '@/types/database'

export const getPipelineStages = async (companyId: string): Promise<PipelineStage[]> => {
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('company_id', companyId)
    .order('position')
  if (error) throw error
  return data
}

export const createStage = async (
  companyId: string,
  input: { name: string; slug: string; color: string; position: number }
): Promise<PipelineStage> => {
  const { data, error } = await supabase
    .from('pipeline_stages')
    .insert({ ...input, company_id: companyId })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateStage = async (
  stageId: string,
  input: Partial<Pick<PipelineStage, 'name' | 'color' | 'position' | 'is_final' | 'is_positive'>>
): Promise<PipelineStage> => {
  const { data, error } = await supabase
    .from('pipeline_stages')
    .update(input)
    .eq('id', stageId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteStage = async (stageId: string): Promise<void> => {
  const { error } = await supabase
    .from('pipeline_stages')
    .delete()
    .eq('id', stageId)
  if (error) throw error
}

export const reorderStages = async (stages: { id: string; position: number }[]): Promise<void> => {
  const updates = stages.map((s) =>
    supabase
      .from('pipeline_stages')
      .update({ position: s.position })
      .eq('id', s.id)
  )
  const results = await Promise.all(updates)
  const error = results.find((r) => r.error)?.error
  if (error) throw error
}
