import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

export const useAuthInit = () => {
  const initialized = useRef(false)
  const { setUser, loadUserData, clear, setIsLoading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadUserData(session.user.id)
      } else {
        setIsLoading(false)
      }
      initialized.current = true
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!initialized.current) return
        if (event === 'INITIAL_SESSION') return

        if (session?.user) {
          setUser(session.user)
          loadUserData(session.user.id)
        } else {
          clear()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
