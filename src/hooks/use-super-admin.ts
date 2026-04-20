import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import * as superAdminService from '@/services/super-admin.service'

export const useAllCompanies = () => {
  return useQuery({
    queryKey: ['all-companies'],
    queryFn: () => superAdminService.getAllCompanies(),
  })
}

export const useImpersonation = () => {
  const company = useAuthStore((s) => s.company)
  const setCompany = useAuthStore((s) => s.setCompany)

  const impersonate = async (targetCompany: { id: string; name: string; slug: string }) => {
    setCompany(targetCompany as ReturnType<typeof useAuthStore.getState>['company'])
  }

  const stopImpersonation = () => {
    // Reload to restore original company from session
    window.location.reload()
  }

  return { currentCompany: company, impersonate, stopImpersonation }
}
