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

export const updateGoal = async (companyId: string, id: string, input: UpdateGoalInput): Promise<Goal> => {
  const { data, error } = await veltzy()
    .from('goals')
    .update(input)
    .eq('id', id)
    .eq('company_id', companyId)
    .select('*, goal_metrics(*)')
    .single()
  if (error) throw error
  return data
}

export const deleteGoal = async (companyId: string, id: string): Promise<void> => {
  const { error } = await veltzy()
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) throw error
}

export const createGoalWithMetrics = async (
  companyId: string,
  goalInput: CreateGoalInput,
  metrics: Omit<CreateGoalMetricInput, 'goal_id'>[]
): Promise<Goal> => {
  const goal = await createGoal(companyId, goalInput)
  try {
    for (const m of metrics) {
      await createGoalMetric(companyId, { ...m, goal_id: goal.id })
    }
    const updated = await getGoals(companyId)
    return updated.find((g) => g.id === goal.id) ?? goal
  } catch (err) {
    await deleteGoal(companyId, goal.id).catch(() => {})
    throw err
  }
}

export const createGoalMetric = async (companyId: string, input: CreateGoalMetricInput): Promise<GoalMetric> => {
  const { data: goal } = await veltzy()
    .from('goals')
    .select('id')
    .eq('id', input.goal_id)
    .eq('company_id', companyId)
    .single()
  if (!goal) throw new Error('Meta nao encontrada')

  const { data, error } = await veltzy()
    .from('goal_metrics')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateGoalMetric = async (companyId: string, id: string, input: UpdateGoalMetricInput): Promise<GoalMetric> => {
  const { data: metric } = await veltzy()
    .from('goal_metrics')
    .select('goal_id')
    .eq('id', id)
    .single()
  if (!metric) throw new Error('Metrica nao encontrada')

  const { data: goal } = await veltzy()
    .from('goals')
    .select('id')
    .eq('id', metric.goal_id)
    .eq('company_id', companyId)
    .single()
  if (!goal) throw new Error('Meta nao pertence a esta empresa')

  const { data, error } = await veltzy()
    .from('goal_metrics')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteGoalMetric = async (companyId: string, id: string): Promise<void> => {
  const { data: metric } = await veltzy()
    .from('goal_metrics')
    .select('goal_id')
    .eq('id', id)
    .single()
  if (!metric) throw new Error('Metrica nao encontrada')

  const { data: goal } = await veltzy()
    .from('goals')
    .select('id')
    .eq('id', metric.goal_id)
    .eq('company_id', companyId)
    .single()
  if (!goal) throw new Error('Meta nao pertence a esta empresa')

  const { error } = await veltzy()
    .from('goal_metrics')
    .delete()
    .eq('id', id)
  if (error) throw error
}
