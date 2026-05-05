import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useTeamMembers } from '@/hooks/use-team'
import { useBulkTransfer } from '@/hooks/use-bulk-leads'

interface BulkTransferModalProps {
  open: boolean
  onClose: () => void
  leadIds: string[]
  onSuccess: () => void
}

export const BulkTransferModal = ({ open, onClose, leadIds, onSuccess }: BulkTransferModalProps) => {
  const [targetUserId, setTargetUserId] = useState<string>('')
  const { data: members } = useTeamMembers()
  const bulkTransfer = useBulkTransfer(() => {
    onSuccess()
    handleClose()
  })

  const handleClose = () => {
    setTargetUserId('')
    onClose()
  }

  const handleTransfer = async () => {
    if (!targetUserId) return
    await bulkTransfer.mutateAsync({ leadIds, targetUserId })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir {leadIds.length} lead{leadIds.length > 1 ? 's' : ''}</DialogTitle>
          <DialogDescription>
            Selecione o membro da equipe que recebera os leads selecionados.
          </DialogDescription>
        </DialogHeader>

        <Select value={targetUserId} onValueChange={setTargetUserId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um membro" />
          </SelectTrigger>
          <SelectContent>
            {members?.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name} ({member.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={bulkTransfer.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleTransfer} disabled={!targetUserId || bulkTransfer.isPending}>
            {bulkTransfer.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Transferindo...
              </>
            ) : (
              'Transferir'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
