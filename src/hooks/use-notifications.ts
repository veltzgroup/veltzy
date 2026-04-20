import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import * as notificationsService from '@/services/notifications.service'

export const useNotifications = () => {
  const userId = useAuthStore((s) => s.user?.id)
  const setNotifications = useNotificationsStore((s) => s.setNotifications)
  const setUnreadCount = useNotificationsStore((s) => s.setUnreadCount)

  const query = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => notificationsService.getNotifications(userId!),
    enabled: !!userId,
    refetchInterval: 30000,
  })

  useEffect(() => {
    if (query.data) {
      setNotifications(query.data)
      setUnreadCount(query.data.filter((n) => !n.is_read).length)
    }
  }, [query.data, setNotifications, setUnreadCount])

  return query
}

export const useUnreadCount = () => {
  return useNotificationsStore((s) => s.unreadCount)
}

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient()
  const markRead = useNotificationsStore((s) => s.markRead)

  return useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: (_data, id) => {
      markRead(id)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)

  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
