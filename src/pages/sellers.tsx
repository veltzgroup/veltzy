import { useState } from 'react'
import { Plus, Loader2, Copy, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SellerCard } from '@/components/sellers/seller-card'
import { InviteMemberModal } from '@/components/sellers/invite-member-modal'
import { useTeamMembers, useInvites, useCancelInvite } from '@/hooks/use-team'
import { useRoles } from '@/hooks/use-roles'
import { timeAgo } from '@/lib/time'

const SellersPage = () => {
  const { data: members, isLoading } = useTeamMembers()
  const { data: invites } = useInvites()
  const cancelInvite = useCancelInvite()
  const { isAdmin } = useRoles()
  const [inviteOpen, setInviteOpen] = useState(false)

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/aceitar-convite?token=${token}`
    navigator.clipboard.writeText(link)
    toast.success('Link copiado!')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Equipe</h1>
        {isAdmin && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Convidar
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      )}

      {!isLoading && members && members.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 bg-card border border-border/30 rounded-2xl">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum membro na equipe ainda</p>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Convidar primeiro membro
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members?.map((m) => <SellerCard key={m.id} member={m} />)}
      </div>

      {isAdmin && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Convites Pendentes</h2>
          {invites && invites.length > 0 ? (
            <div className="space-y-2">
              {invites.map((inv) => {
                const expired = new Date(inv.expires_at) < new Date()
                return (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <div>
                      <p className="text-sm">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.role} - enviado {timeAgo(inv.created_at)}
                        {expired && <span className="ml-2 text-destructive">Expirado</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!expired && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Copiar link"
                          onClick={() => copyInviteLink(inv.token)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive"
                        onClick={() => cancelInvite.mutate(inv.id)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum convite pendente</p>
          )}
        </div>
      )}

      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}

export default SellersPage
