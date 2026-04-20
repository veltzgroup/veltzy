import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import * as authService from '@/services/auth.service'
import type { AppRole } from '@/types/database'

export const useAuth = () => {
  const store = useAuthStore()
  const navigate = useNavigate()

  const signIn = async (email: string, password: string) => {
    await authService.signIn(email, password)
  }

  const signUp = async (email: string, password: string, name: string) => {
    await authService.signUp(email, password, name)
  }

  const signOut = async () => {
    await authService.signOut()
    store.clear()
    navigate('/auth')
  }

  const hasRole = (role: AppRole) => store.roles.includes(role)

  return {
    user: store.user,
    profile: store.profile,
    company: store.company,
    roles: store.roles,
    isLoading: store.isLoading,
    isAuthenticated: !!store.user,
    hasCompany: !!store.company,
    signIn,
    signUp,
    signOut,
    hasRole,
  }
}
