import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import * as tasksService from '@/services/tasks.service'
import type { TaskFilters, CreateTaskPayload, UpdateTaskPayload } from '@/services/tasks.service'
import type { TaskStatus } from '@/types/database'

export const useTasks = (filters?: TaskFilters) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['tasks', companyId, filters],
    queryFn: () => tasksService.getTasks(companyId!, filters),
    enabled: !!companyId,
    staleTime: 1000 * 30,
  })
}

export const useLeadTasks = (leadId: string | null) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['tasks', companyId, { leadId }],
    queryFn: () => tasksService.getTasks(companyId!, { leadId: leadId! }),
    enabled: !!companyId && !!leadId,
    staleTime: 1000 * 30,
  })
}

export const useTask = (taskId: string | null) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['task', companyId, taskId],
    queryFn: () => tasksService.getTaskById(companyId!, taskId!),
    enabled: !!companyId && !!taskId,
  })
}

export const useCreateTask = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksService.createTask(companyId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Tarefa criada')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao criar tarefa')
    },
  })
}

export const useUpdateTask = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskPayload }) =>
      tasksService.updateTask(companyId!, taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Tarefa atualizada')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao atualizar tarefa')
    },
  })
}

export const useDeleteTask = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: (taskId: string) => tasksService.deleteTask(companyId!, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Tarefa removida')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao remover tarefa')
    },
  })
}

export const useCompleteTask = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: (taskId: string) => tasksService.completeTask(companyId!, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Tarefa concluida')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao concluir tarefa')
    },
  })
}

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      tasksService.updateTaskStatus(companyId!, taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao atualizar status')
    },
  })
}

export const useLeadTaskCount = (leadId: string) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['task-count', companyId, leadId],
    queryFn: () => tasksService.getLeadTaskCount(companyId!, leadId),
    enabled: !!companyId && !!leadId,
    staleTime: 1000 * 60,
  })
}
