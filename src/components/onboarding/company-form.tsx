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
import { supabase } from '@/lib/supabase'
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
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)
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
    setIsLoading(true)
    try {
      // Buscar profile se nao esta no store
      let currentProfile = profile
      if (!currentProfile && user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (data) {
          currentProfile = data
          setProfile(data)
        }
      }

      if (!currentProfile) {
        toast.error('Perfil nao encontrado. Tente fazer login novamente.')
        setIsLoading(false)
        return
      }

      // Criar empresa
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({ name: values.name, slug: values.slug })
        .select()
        .single()

      if (companyError) throw companyError

      // Vincular profile a empresa
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ company_id: company.id })
        .eq('id', currentProfile.id)

      if (profileError) throw profileError

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
