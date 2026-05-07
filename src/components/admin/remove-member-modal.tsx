import { useState, useEffect } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useTeamMembers, useRemoveMember } from '@/hooks/use-team'
import { getMemberLeadsCount } from '@/services/team.service'
import { useAuthStore } from '@/stores/auth.store'

interface RemoveMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: { user_id: string; id: string; name: string } | null
}

const RemoveMemberModal = ({ open, onOpenChange, member }: RemoveMemberModalProps) => {
  const companyId = useAuthStore((s) => s.company?.id)
  const { data: members } = useTeamMembers()
  const removeMember = useRemoveMember()
  const [leadsCount, setLeadsCount] = useState<number | null>(null)
  const [reassignTo, setReassignTo] = useState<string>('none')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !member || !companyId) return
    setLeadsCount(null)
    setReassignTo('none')
    getMemberLeadsCount(companyId, member.id).then(setLeadsCount).catch(() => setLeadsCount(0))
  }, [open, member, companyId])

  const otherMembers = members?.filter((m) => m.user_id !== member?.user_id) ?? []

  const handleConfirm = () => {
    if (!member) return
    setLoading(true)
    removeMember.mutate(
      { userId: member.user_id, reassignTo: reassignTo === 'none' ? undefined : reassignTo },
      {
        onSuccess: () => {
          setLoading(false)
          onOpenChange(false)
        },
        onError: () => setLoading(false),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Remover {member?.name}
          </DialogTitle>
          <DialogDescription>
            Esta acao vai remover o membro da empresa. Essa acao nao pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        {leadsCount === null ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : leadsCount > 0 ? (
          <div className="space-y-3">
            <p className="text-sm">
              <strong>{member?.name}</strong> possui <strong>{leadsCount} lead{leadsCount > 1 ? 's' : ''}</strong> atribuido{leadsCount > 1 ? 's' : ''}.
              Para quem deseja transferi-los?
            </p>
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar membro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguem (leads ficam sem responsavel)</SelectItem>
                {otherMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Este membro nao possui leads atribuidos.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading || leadsCount === null}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar remocao
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { RemoveMemberModal }
