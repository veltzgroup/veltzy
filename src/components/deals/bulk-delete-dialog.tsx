import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useBulkDelete } from '@/hooks/use-bulk-leads'

interface BulkDeleteDialogProps {
  open: boolean
  onClose: () => void
  leadIds: string[]
  onSuccess: () => void
}

export const BulkDeleteDialog = ({ open, onClose, leadIds, onSuccess }: BulkDeleteDialogProps) => {
  const [confirmText, setConfirmText] = useState('')
  const bulkDelete = useBulkDelete(() => {
    onSuccess()
    handleClose()
  })

  const handleClose = () => {
    setConfirmText('')
    onClose()
  }

  const handleDelete = async () => {
    if (confirmText !== 'EXCLUIR') return
    await bulkDelete.mutateAsync({ leadIds })
  }

  const isConfirmed = confirmText === 'EXCLUIR'

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            Excluir {leadIds.length} lead{leadIds.length > 1 ? 's' : ''} permanentemente
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acao nao pode ser desfeita. Todos os dados dos leads selecionados serao removidos permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Digite <span className="font-mono font-bold text-foreground">EXCLUIR</span> para confirmar:
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="EXCLUIR"
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={bulkDelete.isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || bulkDelete.isPending}
          >
            {bulkDelete.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Excluindo...
              </>
            ) : (
              'Excluir permanentemente'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
