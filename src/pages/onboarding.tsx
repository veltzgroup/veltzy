import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CompanyForm } from '@/components/onboarding/company-form'

const OnboardingPage = () => {
  const navigate = useNavigate()
  const { companies } = useAuthStore()

  useEffect(() => {
    if (companies.length > 0) {
      navigate('/', { replace: true })
    }
  }, [companies, navigate])

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
