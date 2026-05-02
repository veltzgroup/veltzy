import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import * as authService from '@/services/auth.service'
import { logAuditEvent } from '@/lib/audit'
import type { AppRole } from '@/types/database'

export const useAuth = () => {
  const store = useAuthStore()
  const navigate = useNavigate()

  const signIn = async (email: string, password: string) => {
    try {
      await authService.signIn(email, password)
      await logAuditEvent('login_success', { method: 'email' })
    } catch (err) {
      await logAuditEvent('login_failed', { email, method: 'email' })
      throw err
    }
  }

  const signInWithGoogle = async () => {
    await authService.signInWithGoogle()
  }

  const signUp = async (email: string, password: string, name: string) => {
    await authService.signUp(email, password, name)
  }

  const signOut = async () => {
    const companyId = store.activeCompanyId
    await logAuditEvent('logout', {}, companyId ?? undefined)
    await authService.signOut()
    store.clear()
    navigate('/auth')
  }

  const hasRole = (role: AppRole) => store.roles.includes(role)

  const hasPermission = (key: string): boolean => {
    return store.permissions.includes(key)
  }

  const isSuperAdmin = (): boolean => {
    return store.roles.includes('super_admin')
  }

  const isRepresentative = (): boolean => {
    return store.roles.includes('representative') &&
      !store.roles.includes('admin') &&
      !store.roles.includes('manager')
  }

  return {
    user: store.user,
    profile: store.profile,
    company: store.company,
    roles: store.roles,
    permissions: store.permissions,
    companies: store.companies,
    activeCompanyId: store.activeCompanyId,
    isLoading: store.isLoading,
    isAuthenticated: !!store.user,
    hasCompany: !!store.company,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    hasRole,
    hasPermission,
    isSuperAdmin,
    isRepresentative,
    switchCompany: store.switchCompany,
  }
}
