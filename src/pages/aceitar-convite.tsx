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

type InviteState = 'loading' | 'valid' | 'invalid' | 'expired' | 'accepting' | 'accepted' | 'needs_register' | 'needs_login'

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
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

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
      localStorage.removeItem('pending_invite_token')
      setState('invalid')
      return
    }

    if (data.status !== 'pending') {
      localStorage.removeItem('pending_invite_token')
      setState(data.status === 'expired' ? 'expired' : 'invalid')
      return
    }

    if (new Date(data.expires_at) < new Date()) {
      localStorage.removeItem('pending_invite_token')
      setState('expired')
      return
    }

    // Token validado com sucesso — salva no localStorage para preservar contexto (Google OAuth)
    localStorage.setItem('pending_invite_token', t)

    setInvite(data)
    setCompanyName((data.companies as unknown as { name: string })?.name ?? '')

    if (user) {
      setState('valid')
    } else {
      const { data: session } = await supabase.auth.getSession()
      if (session.session?.user) {
        setState('valid')
      } else {
        // Verifica se o email ja tem conta cadastrada
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', data.email)
          .single()

        if (existingProfile?.user_id) {
          setState('needs_login')
        } else {
          setState('needs_register')
        }
      }
    }
  }

  const acceptInvite = async () => {
    if (!invite) return
    setState('accepting')

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error('Usuario nao autenticado')

      // Usa RPC SECURITY DEFINER para aceitar convite (bypassa RLS)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('accept_invitation', {
        p_invitation_id: invite.id,
        p_user_id: currentUser.id,
      })

      if (rpcError) throw rpcError
      if (rpcResult && !rpcResult.success) {
        if (rpcResult.error?.includes('invalido') || rpcResult.error?.includes('expirado')) {
          setState('accepted')
          toast.success('Convite ja foi aceito!')
          setTimeout(() => navigate('/'), 2000)
          return
        }
        throw new Error(rpcResult.error ?? 'Erro ao aceitar convite')
      }

      await logAuditEvent('invite_accepted', {
        invite_id: invite.id,
        role: invite.role,
      }, invite.company_id)

      // Recarrega dados do usuario e aguarda completar
      await loadUserData(currentUser.id)
      sessionStorage.setItem('invite_accepted', 'true')
      localStorage.removeItem('pending_invite_token')

      setState('accepted')
      toast.success('Convite aceito com sucesso!')
      navigate('/')
    } catch (err) {
      console.error('Erro ao aceitar convite:', err)
      toast.error('Erro ao aceitar convite')
      setState('valid')
    }
  }

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invite || !loginPassword) return
    setIsSubmitting(true)
    setLoginError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password: loginPassword,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setLoginError('Senha incorreta.')
        } else if (error.message.includes('Email not confirmed')) {
          setLoginError('Confirme seu email antes de entrar.')
        } else {
          setLoginError(error.message)
        }
        return
      }

      if (!data.user) throw new Error('Erro ao fazer login')

      // Aceita convite via RPC
      const { data: rpcResult, error: rpcError } = await supabase.rpc('accept_invitation', {
        p_invitation_id: invite.id,
        p_user_id: data.user.id,
      })

      if (rpcError) throw rpcError
      if (rpcResult && !rpcResult.success) {
        throw new Error(rpcResult.error ?? 'Erro ao aceitar convite')
      }

      localStorage.removeItem('pending_invite_token')
      sessionStorage.setItem('invite_accepted', 'true')
      await loadUserData(data.user.id)
      setState('accepted')
      toast.success('Convite aceito com sucesso!')
      navigate('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
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

      // Usa RPC SECURITY DEFINER para aceitar convite (bypassa RLS)
      // A RPC atualiza profile (incluindo nome), cria user_role e marca convite aceito
      const { data: rpcResult, error: rpcError } = await supabase.rpc('accept_invitation', {
        p_invitation_id: invite.id,
        p_user_id: data.user.id,
        p_name: values.full_name,
      })

      if (rpcError) throw rpcError
      if (rpcResult && !rpcResult.success) {
        throw new Error(rpcResult.error ?? 'Erro ao aceitar convite')
      }

      localStorage.removeItem('pending_invite_token')

      // Se signUp retornou sessao (autoconfirm), redireciona para dashboard
      if (data.session) {
        sessionStorage.setItem('invite_accepted', 'true')
        await loadUserData(data.user.id)
        setState('accepted')
        toast.success('Conta criada e convite aceito!')
        navigate('/')
      } else {
        // Email confirmation necessario — mostra mensagem
        setState('accepted')
        toast.success('Conta criada e convite aceito! Confirme seu email para entrar.')
      }
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
              Voce agora faz parte de {companyName}.
              {user ? ' Redirecionando...' : ' Verifique seu email para confirmar sua conta e fazer login.'}
            </CardDescription>
          </CardHeader>
          {!user && (
            <CardContent className="text-center">
              <Button onClick={() => navigate('/auth')} variant="outline">
                Ir para o login
              </Button>
            </CardContent>
          )}
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

  const roleBadgeColors: Record<string, string> = {
    seller: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    admin: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    super_admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const inviteHeader = (
    <div className="mb-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
        V
      </div>
      <h1 className="text-2xl font-bold text-gradient-primary">Veltzy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Voce foi convidado para entrar como
      </p>
      <span className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${roleBadgeColors[invite?.role ?? ''] ?? 'bg-muted text-muted-foreground'}`}>
        {roleLabels[invite?.role ?? ''] ?? invite?.role}
      </span>
      <p className="mt-1 text-sm font-medium">{companyName}</p>
    </div>
  )

  // needs_login — usuario ja tem conta, precisa fazer login para aceitar
  if (state === 'needs_login') {
    return (
      <div className="ambient-bg flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          {inviteHeader}
          <Card className="glass-card">
            <CardHeader className="text-center">
              <CardTitle className="text-lg">Entrar para aceitar convite</CardTitle>
              <CardDescription>
                Ja existe uma conta com este email. Faca login para aceitar.
              </CardDescription>
            </CardHeader>
          <CardContent>
            <form onSubmit={onLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={invite?.email ?? ''} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Sua senha"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                {loginError && (
                  <p className="text-xs text-destructive">{loginError}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || !loginPassword}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar e aceitar convite
              </Button>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
    )
  }

  // needs_register
  return (
    <div className="ambient-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {inviteHeader}
        <Card className="glass-card">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Criar sua conta</CardTitle>
            <CardDescription>Preencha os dados para continuar</CardDescription>
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
    </div>
  )
}

export default AceitarConvitePage
