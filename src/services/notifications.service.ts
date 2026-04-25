import { veltzy as db } from '@/lib/supabase'
import type { Notification } from '@/types/database'

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  const { data, error } = await db()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

export const markAsRead = async (notificationId: string): Promise<void> => {
  const { error } = await db()
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
  if (error) throw error
}

export const markAllAsRead = async (userId: string): Promise<void> => {
  const { error } = await db()
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw error
}

export const getUnreadCount = async (userId: string): Promise<number> => {
  const { count, error } = await db()
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw error
  return count ?? 0
}
