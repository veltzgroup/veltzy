import { useAuthStore } from '@/stores/auth.store'
import type { AppRole } from '@/types/database'

export const useRoles = () => {
  const roles = useAuthStore((s) => s.roles)

  const hasRole = (role: AppRole) => roles.includes(role)
  const isSuperAdmin = hasRole('super_admin')
  const isAdmin = hasRole('admin') || isSuperAdmin
  const isManager = hasRole('manager') || isAdmin
  const isRepresentative = hasRole('representative')
  const isSellerOrRep = hasRole('seller') || isRepresentative
  const canAccessGestao = isManager
  const canAccessAdmin = isAdmin
  const canReceiveAutoDistribution = isSellerOrRep && !isRepresentative

  return {
    roles,
    hasRole,
    isAdmin,
    isManager,
    isSuperAdmin,
    isRepresentative,
    isSellerOrRep,
    canAccessGestao,
    canAccessAdmin,
    canReceiveAutoDistribution,
  }
}
