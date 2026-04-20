import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { AppRole, Company, Profile } from '@/types/database'

interface AuthState {
  user: User | null
  profile: Profile | null
  company: Company | null
  roles: AppRole[]
  isLoading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setCompany: (company: Company | null) => void
  setRoles: (roles: AppRole[]) => void
  setIsLoading: (isLoading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  company: null,
  roles: [],
  isLoading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setCompany: (company) => set({ company }),
  setRoles: (roles) => set({ roles }),
  setIsLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ user: null, profile: null, company: null, roles: [], isLoading: false }),
}))
