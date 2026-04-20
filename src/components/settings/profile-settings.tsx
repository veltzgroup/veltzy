import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth.store'
import { updateProfile } from '@/services/profile.service'
import { resetPassword } from '@/services/auth.service'

const ProfileSettings = () => {
  const profile = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { name: profile?.name ?? '' },
  })

  useEffect(() => {
    if (profile) reset({ name: profile.name })
  }, [profile, reset])

  const onSubmit = async (values: { name: string }) => {
    if (!profile) return
    setSaving(true)
    try {
      const updated = await updateProfile(profile.id, { name: values.name })
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
        <CardTitle>Perfil</CardTitle>
        <CardDescription>Seus dados pessoais</CardDescription>
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
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
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
