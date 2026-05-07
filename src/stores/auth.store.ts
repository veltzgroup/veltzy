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

export const useAuthStore = create<AuthState>((set, _get) => ({
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

      // Sem empresa: verifica se há convite pendente antes de permitir onboarding
      // Pula essa verificação se já estamos na página de aceitar convite (evita loop)
      if (companies.length === 0 && !roles.includes('super_admin') && !window.location.pathname.includes('aceitar-convite')) {
        const userEmail = profile?.email
        if (userEmail) {
          const { data: pendingInvite, error: inviteError } = await supabase
            .from('invitations')
            .select('token')
            .eq('email', userEmail)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .limit(1)
            .single()

          if (inviteError) {
            console.warn('[Auth] Falha ao verificar convites pendentes:', inviteError.message)
          }

          if (pendingInvite?.token) {
            set({ isLoading: false, profile, roles, permissions, companies: [], activeCompanyId: null, company: null })
            window.location.href = `/aceitar-convite?token=${encodeURIComponent(pendingInvite.token)}`
            return
          }
        }
      }

      // Super admin sem empresa vinculada: busca primeira empresa do sistema
      if (companies.length === 0 && roles.includes('super_admin')) {
        const { data: allCompanies } = await supabase
          .from('companies')
          .select('id, name, slug')
          .eq('is_active', true)
          .order('created_at')
          .limit(1)
        if (allCompanies && allCompanies.length > 0) {
          companies.push({
            id: allCompanies[0].id,
            name: allCompanies[0].name,
            slug: allCompanies[0].slug,
            role: 'super_admin',
          })
        }
      }

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

      // Bloqueia acesso se empresa esta desativada (exceto super_admin)
      if (company && !company.is_active && !roles.includes('super_admin')) {
        await supabase.auth.signOut()
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
        localStorage.removeItem('activeCompanyId')
        window.location.href = '/auth?error=company_inactive'
        return
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
