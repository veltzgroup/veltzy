import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { usePaymentConfigs, useSavePaymentConfig, useTogglePaymentConfig } from '@/hooks/use-payment-configs'
import type { PaymentProvider, PaymentEnvironment } from '@/types/database'

const providers: { id: PaymentProvider; name: string; recommended?: boolean }[] = [
  { id: 'asaas', name: 'Asaas', recommended: true },
  { id: 'stripe', name: 'Stripe' },
  { id: 'mercadopago', name: 'Mercado Pago' },
]

const PaymentIntegrations = () => {
  const { data: configs, isLoading } = usePaymentConfigs()
  const saveConfig = useSavePaymentConfig()
  const toggleConfig = useTogglePaymentConfig()

  const [editing, setEditing] = useState<PaymentProvider | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [environment, setEnvironment] = useState<PaymentEnvironment>('production')

  const startEdit = (provider: PaymentProvider) => {
    const existing = configs?.find((c) => c.provider === provider)
    setApiKey(existing?.api_key ?? '')
    setApiSecret(existing?.api_secret ?? '')
    setWebhookSecret(existing?.webhook_secret ?? '')
    setEnvironment(existing?.environment ?? 'production')
    setEditing(provider)
  }

  const handleSave = async () => {
    if (!editing || !apiKey.trim()) return
    await saveConfig.mutateAsync({ provider: editing, api_key: apiKey, api_secret: apiSecret || undefined, webhook_secret: webhookSecret || undefined, environment })
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
        <p className="text-xs text-yellow-600">Esta configuracao sera usada quando o modulo de cobrancas for habilitado.</p>
      </div>

      {isLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}

      <div className="grid gap-4 sm:grid-cols-3">
        {providers.map((p) => {
          const config = configs?.find((c) => c.provider === p.id)
          const isEditing = editing === p.id

          return (
            <Card key={p.id} className="border-border/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {p.recommended && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Recomendado</span>}
                    {config && (
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" className="peer sr-only" checked={config.is_active} onChange={() => toggleConfig.mutate({ id: config.id, active: !config.is_active })} />
                        <div className="peer h-4 w-7 rounded-full bg-muted-foreground/40 after:absolute after:left-[2px] after:top-[2px] after:h-3 after:w-3 after:rounded-full after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-3" />
                      </label>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">API Key</Label>
                      <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="h-7 text-xs" type="password" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">API Secret</Label>
                      <Input value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} className="h-7 text-xs" type="password" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ambiente</Label>
                      <Select value={environment} onValueChange={(v) => setEnvironment(v as PaymentEnvironment)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox</SelectItem>
                          <SelectItem value="production">Producao</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(null)}>Cancelar</Button>
                      <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saveConfig.isPending}>
                        {saveConfig.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {config ? `Configurado (${config.environment})` : 'Nao configurado'}
                    </p>
                    <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => startEdit(p.id)}>
                      {config ? 'Editar' : 'Configurar'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export { PaymentIntegrations }
