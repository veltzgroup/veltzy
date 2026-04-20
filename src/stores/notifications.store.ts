import { create } from 'zustand'
import type { Notification } from '@/types/database'

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  isOpen: boolean
  setNotifications: (n: Notification[]) => void
  setUnreadCount: (n: number) => void
  setIsOpen: (open: boolean) => void
  addNotification: (n: Notification) => void
  markRead: (id: string) => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setIsOpen: (isOpen) => set({ isOpen }),
  addNotification: (n) =>
    set((s) => ({
      notifications: [n, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    })),
  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),
}))
