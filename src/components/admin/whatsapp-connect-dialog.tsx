import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useCreateInstance,
  useReconnectInstance,
  useInstanceStatus,
  useRefreshQr,
  useDeleteInstance,
} from '@/hooks/use-whatsapp-instances'

type DialogState = 'idle' | 'loading' | 'qr_pending' | 'connected' | 'error' | 'expired'

interface WhatsAppConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'reconnect'
  instanceName?: string
}

const QR_TIMEOUT_MS = 120_000 // 2 minutos

export const WhatsAppConnectDialog = ({
  open,
  onOpenChange,
  mode,
  instanceName: propInstanceName,
}: WhatsAppConnectDialogProps) => {
  const [state, setState] = useState<DialogState>('idle')
  const [displayName, setDisplayName] = useState('')
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [instanceName, setInstanceName] = useState<string | null>(propInstanceName ?? null)
  const [errorMessage, setErrorMessage] = useState('')

  const createMutation = useCreateInstance()
  const reconnectMutation = useReconnectInstance()
  const refreshQrMutation = useRefreshQr()
  const deleteMutation = useDeleteInstance()

  // Polling de status direto da tabela (a cada 3s enquanto qr_pending)
  const { data: currentStatus } = useInstanceStatus(
    instanceName,
    state === 'qr_pending'
  )

  // Quando status muda para connected, transicionar
  useEffect(() => {
    if (currentStatus === 'connected' && state === 'qr_pending') {
      setState('connected')
    }
  }, [currentStatus, state])

  // Auto-fechar apos conexao bem sucedida
  useEffect(() => {
    if (state === 'connected') {
      const timer = setTimeout(() => onOpenChange(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [state, onOpenChange])

  // Timeout do QR (2 minutos)
  useEffect(() => {
    if (state !== 'qr_pending') return
    const timer = setTimeout(() => setState('expired'), QR_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [state, qrBase64])

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setState(mode === 'reconnect' ? 'idle' : 'idle')
      setDisplayName('')
      setQrBase64(null)
      setInstanceName(propInstanceName ?? null)
      setErrorMessage('')
    }
  }, [open, mode, propInstanceName])

  // Auto-iniciar reconexao ao abrir
  useEffect(() => {
    if (open && mode === 'reconnect' && propInstanceName && state === 'idle') {
      handleReconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, propInstanceName])

  const handleCreate = useCallback(async () => {
    setState('loading')
    try {
      const result = await createMutation.mutateAsync(displayName || undefined)
      setInstanceName(result.instance_name)
      setQrBase64(result.qr_code_base64)
      setState('qr_pending')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao criar instancia')
      setState('error')
    }
  }, [createMutation, displayName])

  const handleReconnect = useCallback(async () => {
    if (!propInstanceName) return
    setState('loading')
    try {
      const result = await reconnectMutation.mutateAsync(propInstanceName)
      setInstanceName(propInstanceName)
      setQrBase64(result.qr_code_base64)
      setState('qr_pending')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao reconectar')
      setState('error')
    }
  }, [reconnectMutation, propInstanceName])

  const handleRefreshQr = useCallback(async () => {
    if (!instanceName) return
    setState('loading')
    try {
      const result = await refreshQrMutation.mutateAsync(instanceName)
      setQrBase64(result.qr_code_base64)
      setState('qr_pending')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao gerar QR')
      setState('error')
    }
  }, [refreshQrMutation, instanceName])

  const handleCancelAndRemove = useCallback(async () => {
    if (!instanceName) return
    try {
      await deleteMutation.mutateAsync(instanceName)
    } catch {
      // best effort
    }
    onOpenChange(false)
  }, [deleteMutation, instanceName, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Conectar WhatsApp' : 'Reconectar WhatsApp'}
          </DialogTitle>
        </DialogHeader>

        {/* Estado: idle (formulario de criacao) */}
        {state === 'idle' && mode === 'create' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Nome de exibicao (opcional)</Label>
              <Input
                id="display-name"
                placeholder="Ex: Atendimento, Vendas..."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleCreate}>
              Criar e gerar QR
            </Button>
          </div>
        )}

        {/* Estado: loading */}
        {state === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Preparando...</p>
          </div>
        )}

        {/* Estado: qr_pending */}
        {state === 'qr_pending' && (
          <div className="flex flex-col items-center gap-4 py-4">
            {qrBase64 ? (
              <img
                src={qrBase64}
                alt="QR Code WhatsApp"
                className="w-64 h-64 rounded-lg border"
              />
            ) : (
              <div className="w-64 h-64 rounded-lg border flex items-center justify-center bg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Escaneie o QR code</p>
              <p className="text-xs text-muted-foreground">
                Abra o WhatsApp → Aparelhos conectados → Conectar um aparelho
              </p>
            </div>
          </div>
        )}

        {/* Estado: connected */}
        {state === 'connected' && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium">Conectado com sucesso!</p>
          </div>
        )}

        {/* Estado: error */}
        {state === 'error' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-destructive text-center">{errorMessage}</p>
            <Button
              variant="outline"
              onClick={() => {
                setState('idle')
                if (mode === 'reconnect') handleReconnect()
              }}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Estado: expired */}
        {state === 'expired' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <AlertTriangle className="h-10 w-10 text-yellow-500" />
            <p className="text-sm text-muted-foreground text-center">
              O QR code expirou. Gere um novo ou cancele a operacao.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefreshQr}>
                Gerar novo QR
              </Button>
              <Button variant="destructive" onClick={handleCancelAndRemove}>
                Cancelar e remover
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {state !== 'connected' && (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
