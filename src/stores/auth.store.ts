import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { AppRole, Company, CompanyWithRole, Profile } from '@/types/database'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  profile: Profile | null
  company: Company | null
  roles: AppRole[]
  permissions: string[]
  companies: CompanyWithRole[]
  activeCompanyId: string | null
  isLoading: boolean

  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setCompany: (company: Company | null) => void
  setRoles: (roles: AppRole[]) => void
  setPermissions: (permissions: string[]) => void
  setCompanies: (companies: CompanyWithRole[]) => void
  setActiveCompanyId: (id: string | null) => void
  setIsLoading: (isLoading: boolean) => void
  loadUserData: (userId: string) => Promise<void>
  switchCompany: (companyId: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  company: null,
  roles: [],
  permissions: [],
  companies: [],
  activeCompanyId: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setCompany: (company) => set({ company }),
  setRoles: (roles) => set({ roles }),
  setPermissions: (permissions) => set({ permissions }),
  setCompanies: (companies) => set({ companies }),
  setActiveCompanyId: (activeCompanyId) => set({ activeCompanyId }),
  setIsLoading: (isLoading) => set({ isLoading }),

  loadUserData: async (userId: string) => {
    try {
      // Busca perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      // Busca roles e empresas
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role, company_id, companies(id, name, slug)')
        .eq('user_id', userId)

      if (!userRoles) throw new Error('Roles não encontradas')

      const roles = [...new Set(userRoles.map(r => r.role))] as AppRole[]

      // Busca permissions das roles
      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('permission_key')
        .in('role', roles)

      const permissions = [...new Set(rolePerms?.map(p => p.permission_key) ?? [])]

      // Monta lista de empresas
      const companies: CompanyWithRole[] = userRoles
        .filter(r => r.company_id && r.companies)
        .map(r => ({
          id: r.company_id!,
          name: (r.companies as unknown as { name: string }).name,
          slug: (r.companies as unknown as { slug: string }).slug,
          role: r.role as AppRole,
        }))

      // Define empresa ativa
      const saved = localStorage.getItem('activeCompanyId')
      const activeCompanyId = saved && companies.find(c => c.id === saved)
        ? saved
        : companies[0]?.id ?? null

      // Carrega dados da empresa ativa
      let company: Company | null = null
      const companyId = activeCompanyId ?? profile?.company_id
      if (companyId) {
        const { data } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single()
        company = data
      }

      set({
        profile,
        roles,
        permissions,
        companies,
        activeCompanyId,
        company,
        isLoading: false,
      })
    } catch (error) {
      console.error('[Auth] loadUserData error:', error)
      set({ isLoading: false })
    }
  },

  switchCompany: (companyId: string) => {
    localStorage.setItem('activeCompanyId', companyId)
    set({ activeCompanyId: companyId })

    // Recarrega dados da empresa
    supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()
      .then(({ data }) => {
        if (data) set({ company: data })
      })
  },

  clear: () => {
    localStorage.removeItem('activeCompanyId')
    set({
      user: null,
      profile: null,
      company: null,
      roles: [],
      permissions: [],
      companies: [],
      activeCompanyId: null,
      isLoading: false,
    })
  },
}))
