import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCompany } from '@/services/company.service'
import { updateProfile } from '@/services/profile.service'
import { useAuthStore } from '@/stores/auth.store'

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const companySchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres'),
  slug: z.string().min(2, 'Minimo 2 caracteres').regex(/^[a-z0-9-]+$/, 'Apenas letras, numeros e hifens'),
})

type CompanyValues = z.infer<typeof companySchema>

const CompanyForm = () => {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const setCompany = useAuthStore((s) => s.setCompany)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
  })

  const name = watch('name')

  useEffect(() => {
    if (name) {
      setValue('slug', slugify(name))
    }
  }, [name, setValue])

  const onSubmit = async (values: CompanyValues) => {
    if (!profile) return

    setIsLoading(true)
    try {
      const company = await createCompany(values.name, values.slug)
      await updateProfile(profile.id, { company_id: company.id })
      setCompany(company)
      toast.success('Empresa criada com sucesso!')
      navigate('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar empresa'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="company-name">Nome da Empresa</Label>
        <Input
          id="company-name"
          placeholder="Minha Empresa"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="company-slug">Slug (URL)</Label>
        <Input
          id="company-slug"
          placeholder="minha-empresa"
          {...register('slug')}
        />
        {errors.slug && (
          <p className="text-xs text-destructive">{errors.slug.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Identificador unico da sua empresa
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Criar Empresa
      </Button>
    </form>
  )
}

export { CompanyForm }
