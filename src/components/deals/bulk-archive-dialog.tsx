import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useBulkArchive } from '@/hooks/use-bulk-leads'

interface BulkArchiveDialogProps {
  open: boolean
  onClose: () => void
  leadIds: string[]
  onSuccess: () => void
}

export const BulkArchiveDialog = ({ open, onClose, leadIds, onSuccess }: BulkArchiveDialogProps) => {
  const bulkArchive = useBulkArchive(() => {
    onSuccess()
    onClose()
  })

  const handleArchive = async () => {
    await bulkArchive.mutateAsync({ leadIds })
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Arquivar {leadIds.length} lead{leadIds.length > 1 ? 's' : ''}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Os leads serao ocultados da view padrao. Voce pode recupera-los usando o filtro "Mostrar arquivados".
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={bulkArchive.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleArchive} disabled={bulkArchive.isPending}>
            {bulkArchive.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Arquivando...
              </>
            ) : (
              'Arquivar'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
