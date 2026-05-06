import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import type { AppRole } from '@/types/database'

interface ProtectedRouteProps {
  children: React.ReactNode
  skipCompanyCheck?: boolean
  requireRole?: AppRole[]
  requirePermission?: string
}

const ProtectedRoute = ({
  children,
  skipCompanyCheck = false,
  requireRole,
  requirePermission,
}: ProtectedRouteProps) => {
  const { user, company, roles, permissions, isLoading } = useAuthStore()
  const inviteAccepted = sessionStorage.getItem('invite_accepted')

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // Se veio de convite mas company ainda esta carregando, mostra loading
  if (!skipCompanyCheck && !company && inviteAccepted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!skipCompanyCheck && !company) {
    return <Navigate to="/onboarding" replace />
  }

  // Limpa flag apos company carregar
  if (company && inviteAccepted) {
    sessionStorage.removeItem('invite_accepted')
  }

  if (requireRole && !requireRole.some((r) => roles.includes(r))) {
    return <Navigate to="/acesso-negado" replace />
  }

  if (requirePermission && !permissions.includes(requirePermission)) {
    return <Navigate to="/acesso-negado" replace />
  }

  return <>{children}</>
}

export { ProtectedRoute }
