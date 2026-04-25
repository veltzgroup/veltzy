import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ThemeCustomizer } from '@/components/company/theme-customizer'
import { useAuthStore } from '@/stores/auth.store'
import { updateCompany } from '@/services/company.service'

const CompanyDataTab = () => {
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
        <CardDescription>Informacoes basicas da sua empresa</CardDescription>
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
              <p className="text-[10px] text-muted-foreground">Identificador unico da empresa</p>
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

const CompanyPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'data'

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <h1 className="text-2xl font-bold">Empresa</h1>

      <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList>
          <TabsTrigger value="data">Dados da Empresa</TabsTrigger>
          <TabsTrigger value="appearance">Aparencia</TabsTrigger>
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
