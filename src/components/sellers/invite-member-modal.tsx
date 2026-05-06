import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useInviteMember } from '@/hooks/use-team'
import type { AppRole } from '@/types/database'
import { useState } from 'react'

const schema = z.object({
  email: z.string().email('Email invalido'),
  role: z.enum(['seller', 'manager', 'admin']),
})

type FormValues = z.infer<typeof schema>

interface InviteMemberModalProps {
  open: boolean
  onClose: () => void
}

const InviteMemberModal = ({ open, onClose }: InviteMemberModalProps) => {
  const inviteMember = useInviteMember()
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'seller' },
  })

  const onSubmit = async (values: FormValues) => {
    const invite = await inviteMember.mutateAsync({ email: values.email, role: values.role as AppRole })
    const link = `${window.location.origin}/aceitar-convite?token=${invite.token}`
    setInviteLink(link)
  }

  const handleClose = () => {
    setInviteLink(null)
    reset()
    onClose()
  }

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      toast.success('Link copiado!')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Convidar Membro</DialogTitle>
          <DialogDescription>Envie um convite para um novo membro da equipe</DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Convite enviado por email! Voce tambem pode compartilhar o link abaixo:
            </p>
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly className="text-xs" />
              <Button size="icon" variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Link valido por 7 dias</p>
            <Button className="w-full" onClick={handleClose}>Fechar</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="email@exemplo.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={watch('role')} onValueChange={(v) => setValue('role', v as FormValues['role'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="seller">Vendedor</SelectItem>
                  <SelectItem value="manager">Gestor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={inviteMember.isPending}>
                {inviteMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Convidar
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { InviteMemberModal }
