import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members?.map((m) => <SellerCard key={m.id} member={m} />)}
      </div>

      {isAdmin && invites && invites.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Convites Pendentes</h2>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive"
                    onClick={() => cancelInvite.mutate(inv.id)}
                  >
                    Cancelar
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}

export default SellersPage
