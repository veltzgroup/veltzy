import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

export const useTypingIndicator = (leadId: string | null) => {
  const [isTyping, setIsTyping] = useState(false)
  const profile = useAuthStore((s) => s.profile)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!leadId) return

    const channel = supabase.channel(`typing:${leadId}`)
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.userId !== profile?.user_id) {
          setIsTyping(true)
          clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => setIsTyping(false), 3000)
        }
      })
      .subscribe()

    return () => {
      clearTimeout(timeoutRef.current)
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [leadId, profile?.user_id])

  const sendTyping = useCallback(() => {
    if (!channelRef.current || !profile) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: profile.user_id, name: profile.name },
    })
  }, [profile])

  return { isTyping, sendTyping }
}
