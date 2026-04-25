import { veltzy } from '@/lib/supabase'

export interface Goal {
  id: string
  company_id: string
  title: string
  cycle_type: 'monthly' | 'sprint' | 'custom'
  start_date: string
  end_date: string
  is_active: boolean
  visible_to_sellers: boolean
  created_at: string
  updated_at: string
  goal_metrics?: GoalMetric[]
}

export type MetricType = 'revenue' | 'deals_closed' | 'leads_attended' | 'conversion_rate' | 'avg_response_time'

export interface GoalMetric {
  id: string
  goal_id: string
  metric_type: MetricType
  target_value: number
  applies_to: 'team' | 'individual'
  profile_id: string | null
  created_at: string
}

export type CreateGoalInput = Pick<Goal, 'title' | 'cycle_type' | 'start_date' | 'end_date' | 'visible_to_sellers'>
export type UpdateGoalInput = Partial<CreateGoalInput & { is_active: boolean }>
export type CreateGoalMetricInput = Pick<GoalMetric, 'goal_id' | 'metric_type' | 'target_value' | 'applies_to' | 'profile_id'>
export type UpdateGoalMetricInput = Partial<Pick<GoalMetric, 'metric_type' | 'target_value' | 'applies_to' | 'profile_id'>>

export const getGoals = async (companyId: string): Promise<Goal[]> => {
  const { data, error } = await veltzy()
    .from('goals')
    .select('*, goal_metrics(*)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const createGoal = async (companyId: string, input: CreateGoalInput): Promise<Goal> => {
  const { data, error } = await veltzy()
    .from('goals')
    .insert({ ...input, company_id: companyId })
    .select('*, goal_metrics(*)')
    .single()
  if (error) throw error
  return data
}

export const updateGoal = async (id: string, input: UpdateGoalInput): Promise<Goal> => {
  const { data, error } = await veltzy()
    .from('goals')
    .update(input)
    .eq('id', id)
    .select('*, goal_metrics(*)')
    .single()
  if (error) throw error
  return data
}

export const deleteGoal = async (id: string): Promise<void> => {
  const { error } = await veltzy()
    .from('goals')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export const createGoalMetric = async (input: CreateGoalMetricInput): Promise<GoalMetric> => {
  const { data, error } = await veltzy()
    .from('goal_metrics')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateGoalMetric = async (id: string, input: UpdateGoalMetricInput): Promise<GoalMetric> => {
  const { data, error } = await veltzy()
    .from('goal_metrics')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteGoalMetric = async (id: string): Promise<void> => {
  const { error } = await veltzy()
    .from('goal_metrics')
    .delete()
    .eq('id', id)
  if (error) throw error
}
