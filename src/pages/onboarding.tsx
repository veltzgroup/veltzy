import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompanyForm } from '@/components/onboarding/company-form'

const OnboardingPage = () => {
  const navigate = useNavigate()
  const { companies, user } = useAuthStore()
  const [checking, setChecking] = useState(true)
  const [pendingInvite, setPendingInvite] = useState<{ token: string; company_name: string } | null>(null)

  useEffect(() => {
    if (companies.length > 0) {
      navigate('/', { replace: true })
      return
    }

    const checkPendingInvite = async () => {
      if (!user?.email) {
        setChecking(false)
        return
      }

      const { data, error } = await supabase
        .from('invitations')
        .select('token, companies(name)')
        .eq('email', user.email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .single()

      if (error) {
        console.warn('[Onboarding] Falha ao verificar convites pendentes:', error.message)
      }

      if (data?.token) {
        const companyName = (data.companies as unknown as { name: string })?.name ?? ''
        setPendingInvite({ token: data.token, company_name: companyName })
      }
      setChecking(false)
    }

    checkPendingInvite()
  }, [companies, navigate, user])

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (pendingInvite) {
    return (
      <div className="ambient-bg flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
              V
            </div>
            <h1 className="text-2xl font-bold text-gradient-primary">Convite pendente</h1>
            <p className="text-sm text-muted-foreground">
              Voce tem um convite para entrar em <strong>{pendingInvite.company_name}</strong>
            </p>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Aceitar convite</CardTitle>
              <CardDescription>
                Aceite o convite para entrar na empresa ou crie sua propria empresa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                onClick={() => navigate(`/aceitar-convite?token=${pendingInvite.token}`)}
              >
                Aceitar convite para {pendingInvite.company_name}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setPendingInvite(null)}
              >
                Ignorar e criar minha propria empresa
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="ambient-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
            V
          </div>
          <h1 className="text-2xl font-bold text-gradient-primary">Bem-vindo ao Veltzy</h1>
          <p className="text-sm text-muted-foreground">Crie sua empresa para comecar</p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Criar Empresa</CardTitle>
            <CardDescription>
              Configure o nome e identificador da sua empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompanyForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default OnboardingPage
