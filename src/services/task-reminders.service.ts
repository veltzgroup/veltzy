import { veltzy as db } from '@/lib/supabase'
import type { TaskReminder, ReminderChannel } from '@/types/database'

interface ReminderInput {
  content: string
  channel: ReminderChannel
  scheduled_at: string
}

export const createReminders = async (
  companyId: string,
  taskId: string,
  leadId: string | null,
  reminders: ReminderInput[],
): Promise<TaskReminder[]> => {
  const rows = reminders.map((r) => ({
    task_id: taskId,
    company_id: companyId,
    lead_id: leadId,
    channel: r.channel,
    scheduled_at: r.scheduled_at,
    content: r.content,
    status: 'pending' as const,
  }))

  const { data, error } = await db()
    .from('task_reminders')
    .insert(rows)
    .select()
  if (error) throw error
  return data
}

export const getReminders = async (
  companyId: string,
  taskId: string,
): Promise<TaskReminder[]> => {
  const { data, error } = await db()
    .from('task_reminders')
    .select('*')
    .eq('company_id', companyId)
    .eq('task_id', taskId)
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return data
}

export const updateReminder = async (
  companyId: string,
  reminderId: string,
  content: string,
): Promise<TaskReminder> => {
  const { data, error } = await db()
    .from('task_reminders')
    .update({ content, status: 'edited' as const })
    .eq('id', reminderId)
    .eq('company_id', companyId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const cancelReminder = async (
  companyId: string,
  reminderId: string,
): Promise<void> => {
  const { error } = await db()
    .from('task_reminders')
    .update({ status: 'cancelled' as const })
    .eq('id', reminderId)
    .eq('company_id', companyId)
  if (error) throw error
}

export const buildMeetingReminders = (
  meetingDate: string,
  contents: { reminder_48h: string; reminder_2h: string; reminder_15min: string },
): ReminderInput[] => {
  const date = new Date(meetingDate)
  return [
    {
      content: contents.reminder_48h,
      channel: 'both',
      scheduled_at: new Date(date.getTime() - 48 * 60 * 60 * 1000).toISOString(),
    },
    {
      content: contents.reminder_2h,
      channel: 'both',
      scheduled_at: new Date(date.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      content: contents.reminder_15min,
      channel: 'whatsapp',
      scheduled_at: new Date(date.getTime() - 15 * 60 * 1000).toISOString(),
    },
  ]
}
