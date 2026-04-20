import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth.store'
import { updateCompany } from '@/services/company.service'

const CompanyPage = () => {
  const company = useAuthStore((s) => s.company)
  const setCompany = useAuthStore((s) => s.setCompany)
  const [saving, setSaving] = useState(false)
  const [primaryColor, setPrimaryColor] = useState(company?.primary_color ?? '158 64% 42%')
  const [secondaryColor, setSecondaryColor] = useState(company?.secondary_color ?? '240 5% 92%')

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
      const updated = await updateCompany(company.id, {
        ...values,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
      })
      setCompany(updated)
      toast.success('Empresa atualizada!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const hslToHex = (hsl: string): string => {
    const [h, s, l] = hsl.split(' ').map((v) => parseFloat(v))
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
    const f = (n: number) => {
      const k = (n + h / 30) % 12
      const color = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Empresa</h1>

      <Card>
        <CardHeader>
          <CardTitle>Informacoes</CardTitle>
          <CardDescription>Dados basicos da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input {...register('name')} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input {...register('slug')} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cor Primaria</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={hslToHex(primaryColor)}
                    onChange={(e) => {
                      const hex = e.target.value
                      setPrimaryColor(`158 64% 42%`)
                      const r = parseInt(hex.slice(1, 3), 16) / 255
                      const g = parseInt(hex.slice(3, 5), 16) / 255
                      const b = parseInt(hex.slice(5, 7), 16) / 255
                      const max = Math.max(r, g, b), min = Math.min(r, g, b)
                      const l = (max + min) / 2
                      if (max !== min) {
                        const d = max - min
                        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
                        let h = 0
                        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
                        else if (max === g) h = ((b - r) / d + 2) * 60
                        else h = ((r - g) / d + 4) * 60
                        setPrimaryColor(`${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`)
                      }
                    }}
                    className="h-8 w-8 cursor-pointer rounded border-0"
                  />
                  <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor Secundaria</Label>
                <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="text-xs" />
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default CompanyPage
