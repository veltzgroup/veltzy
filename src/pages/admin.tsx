import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PipelineTab } from '@/components/admin/pipeline-tab'
import { IntegrationsTab } from '@/components/admin/integrations-tab'
import { ThemeCustomizer } from '@/components/company/theme-customizer'
import { ActivityLogsDashboard } from '@/components/admin/activity-logs-dashboard'
import { SdrTab } from '@/components/admin/sdr-tab'
import { useAuthStore } from '@/stores/auth.store'
import { updateCompany } from '@/services/company.service'

const PermissoesPlaceholder = () => (
  <Card>
    <CardHeader>
      <CardTitle>Permissões</CardTitle>
      <CardDescription>Gerenciamento de permissões e roles dos membros</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">Em breve</p>
    </CardContent>
  </Card>
)

const EmpresaTab = () => {
  const company = useAuthStore((s) => s.company)
  const setCompany = useAuthStore((s) => s.setCompany)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { name: company?.name ?? '', slug: company?.slug ?? '' },
  })

  useEffect(() => {
    if (company) reset({ name: company.name, slug: company.slug })
  }, [company, reset])

  const onSubmit = async (values: { name: string; slug: string }) => {
    if (!company) return
    setSaving(true)
    try {
      const updated = await updateCompany(company.id, values)
      setCompany(updated)
      toast.success('Empresa atualizada!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da Empresa</CardTitle>
        <CardDescription>Informações básicas da sua empresa</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input {...register('name')} />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input {...register('slug')} />
              <p className="text-[10px] text-muted-foreground">Identificador único da empresa</p>
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

const AdminPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'permissoes'

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Admin</h1>

      <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="permissoes">Permissões</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="logs-avancados">Logs avançados</TabsTrigger>
          <TabsTrigger value="ia-sdr-avancado">IA SDR avançado</TabsTrigger>
        </TabsList>
        <TabsContent value="permissoes" className="mt-4"><PermissoesPlaceholder /></TabsContent>
        <TabsContent value="integracoes" className="mt-4"><IntegrationsTab /></TabsContent>
        <TabsContent value="empresa" className="mt-4"><EmpresaTab /></TabsContent>
        <TabsContent value="aparencia" className="mt-4"><ThemeCustomizer /></TabsContent>
        <TabsContent value="logs-avancados" className="mt-4"><ActivityLogsDashboard /></TabsContent>
        <TabsContent value="ia-sdr-avancado" className="mt-4"><SdrTab /></TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminPage
