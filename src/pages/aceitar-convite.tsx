import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { logAuditEvent } from '@/lib/audit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Invitation } from '@/types/database'

const registerSchema = z.object({
  full_name: z.string().min(2, 'Mínimo 2 caracteres'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Senhas não conferem',
  path: ['confirm_password'],
})

type RegisterValues = z.infer<typeof registerSchema>

type InviteState = 'loading' | 'valid' | 'invalid' | 'expired' | 'accepting' | 'accepted' | 'needs_register'

const roleLabels: Record<string, string> = {
  seller: 'Vendedor',
  manager: 'Gestor',
  admin: 'Administrador',
  super_admin: 'Super Admin',
}

const AceitarConvitePage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loadUserData } = useAuthStore()
  const token = searchParams.get('token')

  const [state, setState] = useState<InviteState>('loading')
  const [invite, setInvite] = useState<Invitation | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  })

  useEffect(() => {
    if (!token) {
      setState('invalid')
      return
    }
    validateToken(token)
  }, [token])

  const validateToken = async (t: string) => {
    const { data, error } = await supabase
      .from('invitations')
      .select('*, companies(name)')
      .eq('token', t)
      .single()

    if (error || !data) {
      setState('invalid')
      return
    }

    if (data.status !== 'pending') {
      setState(data.status === 'expired' ? 'expired' : 'invalid')
      return
    }

    if (new Date(data.expires_at) < new Date()) {
      setState('expired')
      return
    }

    setInvite(data)
    setCompanyName((data.companies as unknown as { name: string })?.name ?? '')

    if (user) {
      setState('valid')
    } else {
      const { data: session } = await supabase.auth.getSession()
      if (session.session?.user) {
        setState('valid')
      } else {
        setState('needs_register')
      }
    }
  }

  const acceptInvite = async () => {
    if (!invite) return
    setState('accepting')

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error('Usuario nao autenticado')

      // Verificar se convite ainda esta pendente (evita double-click)
      const { data: freshInvite } = await supabase
        .from('invitations')
        .select('status')
        .eq('id', invite.id)
        .single()
      if (freshInvite?.status !== 'pending') {
        setState('accepted')
        toast.success('Convite ja foi aceito!')
        setTimeout(() => navigate('/'), 2000)
        return
      }

      // Cria user_role (ignora se ja existir via unique constraint)
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: currentUser.id,
        company_id: invite.company_id,
        role: invite.role,
      })
      if (roleError && !roleError.message.includes('duplicate')) throw roleError

      // Atualiza convite
      await supabase
        .from('invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invite.id)

      await logAuditEvent('invite_accepted', {
        invite_id: invite.id,
        role: invite.role,
      }, invite.company_id)

      // Recarrega dados do usuario
      await loadUserData(currentUser.id)

      setState('accepted')
      toast.success('Convite aceito com sucesso!')

      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      console.error('Erro ao aceitar convite:', err)
      toast.error('Erro ao aceitar convite')
      setState('valid')
    }
  }

  const onRegister = async (values: RegisterValues) => {
    if (!invite) return
    setIsSubmitting(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: invite.email,
        password: values.password,
        options: {
          data: { name: values.full_name },
        },
      })

      if (error) throw error
      if (!data.user) throw new Error('Erro ao criar conta')

      // Cria profile
      await supabase.from('profiles').insert({
        user_id: data.user.id,
        name: values.full_name,
        email: invite.email,
        company_id: invite.company_id,
      })

      // Cria user_role (ignora duplicata)
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: data.user.id,
        company_id: invite.company_id,
        role: invite.role,
      })
      if (roleError && !roleError.message.includes('duplicate')) throw roleError

      // Atualiza convite
      await supabase
        .from('invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invite.id)

      await logAuditEvent('invite_accepted', {
        invite_id: invite.id,
        role: invite.role,
        new_account: true,
      }, invite.company_id)

      setState('accepted')
      toast.success('Conta criada e convite aceito!')

      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (state === 'invalid' || state === 'expired') {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4">
              {state === 'expired' ? 'Convite expirado' : 'Convite inválido'}
            </CardTitle>
            <CardDescription>
              {state === 'expired'
                ? 'Este convite expirou. Solicite um novo convite ao seu gestor.'
                : 'Este link de convite não é válido. Verifique o link ou solicite um novo convite.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/auth')} variant="outline">
              Ir para o login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === 'accepted') {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle className="mt-4">Convite aceito!</CardTitle>
            <CardDescription>
              Você agora faz parte de {companyName}. Redirecionando...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (state === 'valid' || state === 'accepting') {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Aceitar convite</CardTitle>
            <CardDescription>
              Voce foi convidado para {companyName} como <strong>{roleLabels[invite?.role ?? ''] ?? invite?.role}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Cancelar
            </Button>
            <Button onClick={acceptInvite} disabled={state === 'accepting'}>
              {state === 'accepting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aceitar convite
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // needs_register
  return (
    <div className="flex h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Criar sua conta</CardTitle>
          <CardDescription>
            Voce foi convidado para {companyName} como <strong>{roleLabels[invite?.role ?? ''] ?? invite?.role}</strong>.
            Crie sua conta para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onRegister)} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={invite?.email ?? ''} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                placeholder="Seu nome"
                {...register('full_name')}
              />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar senha</Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="Repita a senha"
                {...register('confirm_password')}
              />
              {errors.confirm_password && (
                <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar conta e aceitar convite
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AceitarConvitePage
