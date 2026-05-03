import { create } from 'zustand'
import type { LeadTemperature } from '@/types/database'

interface PipelineFilters {
  search: string
  sourceId: string | null
  temperature: LeadTemperature | null
  assignedTo: string | null
}

interface PipelineState {
  activePipelineId: string | null
  activeLeadId: string | null
  selectedLeadId: string | null
  filters: PipelineFilters
  setActivePipelineId: (id: string | null) => void
  setActiveLeadId: (id: string | null) => void
  setSelectedLeadId: (id: string | null) => void
  setFilters: (filters: Partial<PipelineFilters>) => void
}

export const usePipelineStore = create<PipelineState>((set) => ({
  activePipelineId: null,
  activeLeadId: null,
  selectedLeadId: null,
  filters: {
    search: '',
    sourceId: null,
    temperature: null,
    assignedTo: null,
  },
  setActivePipelineId: (id) => set({ activePipelineId: id }),
  setActiveLeadId: (id) => set({ activeLeadId: id }),
  setSelectedLeadId: (id) => set({ selectedLeadId: id }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
}))
