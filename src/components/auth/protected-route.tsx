import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

interface ProtectedRouteProps {
  children: React.ReactNode
  skipCompanyCheck?: boolean
}

const ProtectedRoute = ({ children, skipCompanyCheck = false }: ProtectedRouteProps) => {
  const { user, company, isLoading } = useAuthStore()

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

  if (!skipCompanyCheck && !company) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

export { ProtectedRoute }
