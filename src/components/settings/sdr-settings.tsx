import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useSdrConfig, useSaveSdrConfig } from '@/hooks/use-sdr-config'
import type { SdrConfig } from '@/types/database'

const SdrSettings = () => {
  const { data: config, isLoading } = useSdrConfig()
  const saveConfig = useSaveSdrConfig()

  const { register, handleSubmit, setValue, watch, reset } = useForm<SdrConfig>({
    defaultValues: { enabled: false, model: 'gpt-4o-mini', prompt: '' },
  })

  useEffect(() => {
    if (config) reset(config)
  }, [config, reset])

  const enabled = watch('enabled')

  const onSubmit = (values: SdrConfig) => {
    saveConfig.mutate(values)
  }

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>IA SDR</CardTitle>
        <CardDescription>Configure a inteligencia artificial para qualificar leads automaticamente</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" {...register('enabled')} />
              <div className="peer h-5 w-9 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full" />
            </label>
            <span className="text-sm">{enabled ? 'SDR Ativo' : 'SDR Desativado'}</span>
          </div>

          <div className="space-y-2">
            <Label>Modelo de IA</Label>
            <Select value={watch('model')} onValueChange={(v) => setValue('model', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gemini-1.5-flash">Gemini Flash</SelectItem>
                <SelectItem value="gemini-1.5-pro">Gemini Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>API Key (opcional)</Label>
            <Input type="password" placeholder="Deixe vazio para usar chave padrao" {...register('api_key')} />
          </div>

          <div className="space-y-2">
            <Label>Prompt Customizado</Label>
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm input-clean"
              placeholder="Deixe vazio para usar o prompt padrao do sistema..."
              {...register('prompt')}
            />
          </div>

          <Button type="submit" disabled={saveConfig.isPending}>
            {saveConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export { SdrSettings }
