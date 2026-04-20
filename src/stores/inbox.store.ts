import { create } from 'zustand'
import type { ConversationStatus } from '@/types/database'

interface InboxFilters {
  search: string
  status: ConversationStatus | 'all'
  assignedTo: string | 'mine' | 'all'
  sourceId: string | null
}

interface InboxState {
  selectedLeadId: string | null
  filters: InboxFilters
  unreadCount: number
  setSelectedLeadId: (id: string | null) => void
  setFilters: (f: Partial<InboxFilters>) => void
  setUnreadCount: (n: number) => void
}

export const useInboxStore = create<InboxState>((set) => ({
  selectedLeadId: null,
  filters: {
    search: '',
    status: 'all',
    assignedTo: 'all',
    sourceId: null,
  },
  unreadCount: 0,
  setSelectedLeadId: (id) => set({ selectedLeadId: id }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  setUnreadCount: (n) => set({ unreadCount: n }),
}))
