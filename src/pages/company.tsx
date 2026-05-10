import { useSearchParams } from 'react-router-dom'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ThemeCustomizer } from '@/components/company/theme-customizer'
import { useAuthStore } from '@/stores/auth.store'

const CompanyDataTab = () => {
  const company = useAuthStore((s) => s.company)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da Empresa</CardTitle>
        <CardDescription>Informações da sua empresa</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-muted-foreground">Nome</Label>
            <p className="text-sm font-medium">{company?.name ?? '-'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground">Slug (URL)</Label>
            <p className="text-sm font-medium">{company?.slug ?? '-'}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Para alterar os dados da empresa, entre em contato com o suporte.
        </p>
      </CardContent>
    </Card>
  )
}

const CompanyPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'data'

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <h1 className="text-2xl font-bold">Empresa</h1>

      <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList>
          <TabsTrigger value="data">Dados da Empresa</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
        </TabsList>
        <TabsContent value="data" className="mt-4">
          <CompanyDataTab />
        </TabsContent>
        <TabsContent value="appearance" className="mt-4">
          <ThemeCustomizer />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CompanyPage
