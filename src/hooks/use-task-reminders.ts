import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import * as remindersService from '@/services/task-reminders.service'
import type { ReminderChannel } from '@/types/database'

export const useTaskReminders = (taskId: string | null) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['task-reminders', companyId, taskId],
    queryFn: () => remindersService.getReminders(companyId!, taskId!),
    enabled: !!companyId && !!taskId,
  })
}

export const useCreateReminders = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: (payload: {
      taskId: string
      leadId: string | null
      reminders: Array<{ content: string; channel: ReminderChannel; scheduled_at: string }>
    }) => remindersService.createReminders(
      companyId!,
      payload.taskId,
      payload.leadId,
      payload.reminders,
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-reminders'] })
      toast.success('Lembretes agendados')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao criar lembretes')
    },
  })
}

export const useUpdateReminder = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: ({ reminderId, content }: { reminderId: string; content: string }) =>
      remindersService.updateReminder(companyId!, reminderId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-reminders'] })
      toast.success('Lembrete atualizado')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao atualizar lembrete')
    },
  })
}

export const useCancelReminder = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: (reminderId: string) =>
      remindersService.cancelReminder(companyId!, reminderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-reminders'] })
      toast.success('Lembrete cancelado')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao cancelar lembrete')
    },
  })
}
