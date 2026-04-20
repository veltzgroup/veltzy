import { useAuthStore } from '@/stores/auth.store'
import type { AppRole } from '@/types/database'

export const useRoles = () => {
  const roles = useAuthStore((s) => s.roles)

  const hasRole = (role: AppRole) => roles.includes(role)
  const isAdmin = hasRole('admin') || hasRole('super_admin')
  const isManager = hasRole('manager') || isAdmin
  const isSuperAdmin = hasRole('super_admin')

  return {
    roles,
    hasRole,
    isAdmin,
    isManager,
    isSuperAdmin,
  }
}
