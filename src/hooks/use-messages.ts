import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import * as messagesService from '@/services/messages.service'
import type { SendMessagePayload, Message } from '@/types/database'

export const useMessages = (leadId: string | null) => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  const query = useQuery({
    queryKey: ['messages', leadId],
    queryFn: () => messagesService.getMessages(companyId!, leadId!),
    enabled: !!leadId && !!companyId,
    refetchInterval: false,
  })

  useEffect(() => {
    if (!leadId) return

    const channel = supabase
      .channel(`messages:${leadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'veltzy', table: 'messages', filter: `lead_id=eq.${leadId}` },
        (payload) => {
          queryClient.setQueryData<Message[]>(['messages', leadId], (old) => {
            if (!old) return [payload.new as Message]
            const exists = old.some((m) => m.id === (payload.new as Message).id)
            if (exists) return old
            return [...old, payload.new as Message]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leadId, queryClient])

  return query
}

export const useSendMessage = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: (payload: SendMessagePayload) =>
      messagesService.routeMessage(companyId!, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.leadId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao enviar mensagem')
    },
  })
}

export const useWhatsAppConnected = () => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['whatsapp-connected', companyId],
    queryFn: () => messagesService.isWhatsAppConnected(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useMarkAsRead = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: (leadId: string) => messagesService.markAsRead(companyId!, leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}
