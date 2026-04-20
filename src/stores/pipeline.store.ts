import { create } from 'zustand'
import type { LeadTemperature } from '@/types/database'

interface PipelineFilters {
  search: string
  sourceId: string | null
  temperature: LeadTemperature | null
  assignedTo: string | null
}

interface PipelineState {
  activeLeadId: string | null
  selectedLeadId: string | null
  filters: PipelineFilters
  setActiveLeadId: (id: string | null) => void
  setSelectedLeadId: (id: string | null) => void
  setFilters: (filters: Partial<PipelineFilters>) => void
}

export const usePipelineStore = create<PipelineState>((set) => ({
  activeLeadId: null,
  selectedLeadId: null,
  filters: {
    search: '',
    sourceId: null,
    temperature: null,
    assignedTo: null,
  },
  setActiveLeadId: (id) => set({ activeLeadId: id }),
  setSelectedLeadId: (id) => set({ selectedLeadId: id }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
}))
