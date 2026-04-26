import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import * as supportService from '@/services/support.service'

export const useSupportTickets = () => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['support-tickets', companyId],
    queryFn: () => supportService.getTickets(companyId!),
    enabled: !!companyId,
  })
}

export const useCreateTicket = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: supportService.createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
      toast.success('Ticket criado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export const useAllTickets = () => {
  return useQuery({
    queryKey: ['all-support-tickets'],
    queryFn: () => supportService.getAllTickets(),
  })
}

export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Parameters<typeof supportService.updateTicketStatus>[2] }) =>
      supportService.updateTicketStatus(companyId!, id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['all-support-tickets'] })
      toast.success('Status atualizado!')
    },
  })
}
