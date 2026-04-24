import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { getProfile } from '@/services/profile.service'
import { getCompany } from '@/services/company.service'
import { getUserRoles } from '@/services/roles.service'

export const useAuthInit = () => {
  const setUser = useAuthStore((s) => s.setUser)
  const setProfile = useAuthStore((s) => s.setProfile)
  const setCompany = useAuthStore((s) => s.setCompany)
  const setRoles = useAuthStore((s) => s.setRoles)
  const setIsLoading = useAuthStore((s) => s.setIsLoading)
  const clear = useAuthStore((s) => s.clear)

  useEffect(() => {
    const loadUserData = async (userId: string) => {
      try {
        const [profile, roles] = await Promise.all([
          getProfile(userId),
          getUserRoles(userId),
        ])

        setProfile(profile)
        setRoles(roles.map((r) => r.role))

        if (profile?.company_id) {
          const company = await getCompany(profile.company_id)
          setCompany(company)
        }
      } catch (err) {
        console.error('Erro ao carregar dados do usuario:', err)
      } finally {
        setIsLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadUserData(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        loadUserData(session.user.id)
      } else {
        clear()
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
