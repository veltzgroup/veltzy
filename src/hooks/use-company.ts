import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { getCompany } from '@/services/company.service'

export const useCompany = () => {
  const companyId = useAuthStore((s) => s.company?.id)

  return useQuery({
    queryKey: ['company', companyId],
    queryFn: () => getCompany(companyId!),
    enabled: !!companyId,
  })
}
