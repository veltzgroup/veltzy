import { veltzy as db } from '@/lib/supabase'
import type { Task, TaskWithRelations, TaskStatus, TaskType } from '@/types/database'

export interface TaskFilters {
  assignedTo?: string
  status?: TaskStatus
  leadId?: string
  type?: TaskType
  search?: string
}

export interface CreateTaskPayload {
  lead_id?: string | null
  assigned_to?: string | null
  created_by?: string | null
  type: TaskType
  title: string
  description?: string | null
  due_date?: string | null
}

export interface UpdateTaskPayload {
  lead_id?: string | null
  assigned_to?: string | null
  type?: TaskType
  title?: string
  description?: string | null
  status?: TaskStatus
  due_date?: string | null
}

const SELECT_WITH_RELATIONS = `
  *,
  leads:lead_id(id, name, phone),
  profiles:assigned_to(id, name, email)
`

export const getTasks = async (
  companyId: string,
  filters?: TaskFilters,
): Promise<TaskWithRelations[]> => {
  let query = db()
    .from('tasks')
    .select(SELECT_WITH_RELATIONS)
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true, nullsFirst: false })

  if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.leadId) query = query.eq('lead_id', filters.leadId)
  if (filters?.type) query = query.eq('type', filters.type)
  if (filters?.search) query = query.ilike('title', `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw error
  return data as TaskWithRelations[]
}

export const getTaskById = async (
  companyId: string,
  taskId: string,
): Promise<TaskWithRelations> => {
  const { data, error } = await db()
    .from('tasks')
    .select(SELECT_WITH_RELATIONS)
    .eq('id', taskId)
    .eq('company_id', companyId)
    .single()
  if (error) throw error
  return data as TaskWithRelations
}

export const createTask = async (
  companyId: string,
  payload: CreateTaskPayload,
): Promise<Task> => {
  const { data, error } = await db()
    .from('tasks')
    .insert({ company_id: companyId, ...payload })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateTask = async (
  companyId: string,
  taskId: string,
  payload: UpdateTaskPayload,
): Promise<Task> => {
  const { data, error } = await db()
    .from('tasks')
    .update(payload)
    .eq('id', taskId)
    .eq('company_id', companyId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteTask = async (companyId: string, taskId: string): Promise<void> => {
  const { error } = await db()
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('company_id', companyId)
  if (error) throw error
}

export const completeTask = async (companyId: string, taskId: string): Promise<Task> => {
  const { data, error } = await db()
    .from('tasks')
    .update({ status: 'done' as TaskStatus, completed_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('company_id', companyId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateTaskStatus = async (
  companyId: string,
  taskId: string,
  status: TaskStatus,
): Promise<Task> => {
  const update: Record<string, unknown> = { status }
  if (status === 'done') update.completed_at = new Date().toISOString()
  if (status !== 'done') update.completed_at = null

  const { data, error } = await db()
    .from('tasks')
    .update(update)
    .eq('id', taskId)
    .eq('company_id', companyId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const getLeadTaskCount = async (
  companyId: string,
  leadId: string,
): Promise<number> => {
  const { count, error } = await db()
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('lead_id', leadId)
    .in('status', ['pending', 'in_progress'])
  if (error) throw error
  return count ?? 0
}
