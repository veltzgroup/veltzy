import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import * as teamService from '@/services/team.service'
import type { AppRole } from '@/types/database'

export const useTeamMembers = () => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['team-members', companyId],
    queryFn: () => teamService.getMembers(companyId!),
    enabled: !!companyId,
  })
}

export const useInvites = () => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['team-invites', companyId],
    queryFn: () => teamService.getInvites(companyId!),
    enabled: !!companyId,
  })
}

export const useInviteMember = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)
  const userId = useAuthStore((s) => s.user?.id)

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: AppRole }) =>
      teamService.inviteMember(companyId!, email, role, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invites'] })
      toast.success('Convite enviado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export const useCancelInvite = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => teamService.cancelInvite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invites'] })
      toast.success('Convite cancelado!')
    },
  })
}

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) =>
      teamService.updateMemberRole(companyId!, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      toast.success('Role atualizada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export const useRemoveMember = () => {
  const queryClient = useQueryClient()
  const companyId = useAuthStore((s) => s.company?.id)
  return useMutation({
    mutationFn: (userId: string) => teamService.removeMember(companyId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      toast.success('Membro removido!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
