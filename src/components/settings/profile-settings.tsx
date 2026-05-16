import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth.store'
import { updateProfile } from '@/services/profile.service'
import { resetPassword } from '@/services/auth.service'
import { useWhatsAppStatus } from '@/hooks/use-whatsapp-status'
import { useEvolutionInstances } from '@/hooks/use-evolution-instances'

const roleLabels: Record<string, string> = { admin: 'Admin', manager: 'Gestor', seller: 'Vendedor', super_admin: 'Super Admin' }
const roleBadge: Record<string, string> = { admin: 'bg-purple-500/10 text-purple-500', manager: 'bg-blue-500/10 text-blue-500', seller: 'bg-muted text-muted-foreground', super_admin: 'bg-red-500/10 text-red-500' }

const ProfileSettings = () => {
  const profile = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)
  const roles = useAuthStore((s) => s.roles)
  const [saving, setSaving] = useState(false)
  const primaryRole = roles[0] ?? 'seller'
  const { data: whatsappStatus } = useWhatsAppStatus()
  const { data: instances } = useEvolutionInstances()
  const isEvolution = whatsappStatus?.provider === 'evolution'
  const [selectedInstance, setSelectedInstance] = useState(profile?.default_whatsapp_instance ?? '')

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { name: profile?.name ?? '' },
  })

  useEffect(() => {
    if (profile) {
      reset({ name: profile.name })
      setSelectedInstance(profile.default_whatsapp_instance ?? '')
    }
  }, [profile, reset])

  const onSubmit = async (values: { name: string }) => {
    if (!profile) return
    setSaving(true)
    try {
      const updates: Record<string, unknown> = { name: values.name }
      if (isEvolution) {
        updates.default_whatsapp_instance = selectedInstance || null
      }
      const updated = await updateProfile(profile.id, updates)
      setProfile(updated)
      toast.success('Perfil atualizado!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!profile) return
    try {
      await resetPassword(profile.email)
      toast.success('Email de redefinicao enviado!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Seus dados pessoais</CardDescription>
          </div>
          <span className={cn('rounded-full px-3 py-1 text-xs font-medium', roleBadge[primaryRole])}>
            {roleLabels[primaryRole]}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input {...register('name')} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile?.email ?? ''} disabled className="opacity-60" />
            <p className="text-[10px] text-muted-foreground">O email nao pode ser alterado</p>
          </div>
          {isEvolution && (
            <div className="space-y-2">
              <Label>Numero WhatsApp padrao</Label>
              <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu numero" />
                </SelectTrigger>
                <SelectContent>
                  {instances?.map((inst) => (
                    <SelectItem key={inst.instance_name} value={inst.instance_name}>
                      {inst.phone_number ?? inst.instance_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Numero que sera usado para enviar mensagens aos seus leads
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Perfil
            </Button>
            <Button type="button" variant="outline" onClick={handleResetPassword}>
              Alterar Senha
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export { ProfileSettings }
