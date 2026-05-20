import { useEffect, useRef } from 'react'
import { supabasePublic as supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

const HEARTBEAT_INTERVAL_MS = 60_000

export const usePresenceHeartbeat = () => {
  const profileId = useAuthStore((s) => s.profile?.id)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!profileId) return

    const sendHeartbeat = () => {
      supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', profileId)
        .then(({ error }) => {
          if (error) console.error('[presence] heartbeat failed:', error.message)
        })
    }

    sendHeartbeat()
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [profileId])
}
