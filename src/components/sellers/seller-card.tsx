import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreVertical } from 'lucide-react'
import { useState } from 'react'
import { useRoles } from '@/hooks/use-roles'
import { useUpdateMemberRole } from '@/hooks/use-team'
import { RemoveMemberModal } from '@/components/admin/remove-member-modal'
import type { ProfileWithRole, AppRole } from '@/types/database'

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Gestor',
  seller: 'Vendedor',
  super_admin: 'Super Admin',
}

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-purple-500/10 text-purple-500',
  manager: 'bg-blue-500/10 text-blue-500',
  seller: 'bg-muted text-muted-foreground',
  super_admin: 'bg-red-500/10 text-red-500',
}

interface SellerCardProps {
  member: ProfileWithRole
}

const SellerCard = ({ member }: SellerCardProps) => {
  const { isAdmin } = useRoles()
  const updateRole = useUpdateMemberRole()
  const [removeOpen, setRemoveOpen] = useState(false)

  const initials = member.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const role = member.user_roles?.[0]?.role ?? 'seller'

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
            </Avatar>
            <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card', member.is_available ? 'bg-green-500' : 'bg-muted-foreground/30')} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{member.name}</p>
            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium', roleBadgeColors[role])}>
              {roleLabels[role]}
            </span>
          </div>

          {isAdmin && role !== 'super_admin' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(['admin', 'manager', 'seller'] as AppRole[])
                  .filter((r) => r !== role)
                  .map((r) => (
                    <DropdownMenuItem key={r} onClick={() => updateRole.mutate({ userId: member.user_id, role: r })}>
                      Tornar {roleLabels[r]}
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setRemoveOpen(true)}
                >
                  Remover da empresa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
      <RemoveMemberModal
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        member={removeOpen ? { user_id: member.user_id, id: member.id, name: member.name } : null}
      />
    </Card>
  )
}

export { SellerCard }
