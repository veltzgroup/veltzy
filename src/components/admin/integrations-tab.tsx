import { Calendar, MessageCircle, Globe, Mail, ExternalLink, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PaymentIntegrations } from '@/components/admin/payment-integrations'
import { useAuthStore } from '@/stores/auth.store'
import { useWhatsAppStatus } from '@/hooks/use-whatsapp-status'
import { useEvolutionInstances } from '@/hooks/use-evolution-instances'
import { cn } from '@/lib/utils'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const hubUrl = import.meta.env.VITE_HUB_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL

const HubManagedCard = ({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}) => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
          Configurado pelo suporte
        </span>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        Integração configurada pelo suporte. Entre em contato para alterar.
      </p>
    </CardContent>
  </Card>
)

const EvolutionInstancesCard = () => {
  const { data: instances, isLoading } = useEvolutionInstances()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">WhatsApp (Evolution API)</CardTitle>
              <CardDescription>Instancias gerenciadas no Hub</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : instances && instances.length > 0 ? (
          <div className="space-y-2">
            {instances.map((inst) => (
              <div key={inst.instance_name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-2 w-2 rounded-full',
                    inst.status === 'open' ? 'bg-green-500' : 'bg-red-500'
                  )} />
                  <div>
                    <p className="text-sm font-medium">{inst.instance_name}</p>
                    <p className="text-xs text-muted-foreground">{inst.phone_number ?? 'Sem numero'}</p>
                  </div>
                </div>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-medium',
                  inst.status === 'open' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                )}>
                  {inst.status === 'open' ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma instancia encontrada</p>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" asChild>
          <a href={hubUrl} target="_blank" rel="noopener noreferrer">
            Gerenciar no Hub <ExternalLink className="h-4 w-4 ml-1" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}

const WhatsAppCard = () => {
  const { data: whatsappStatus } = useWhatsAppStatus()

  if (whatsappStatus?.provider === 'evolution') {
    return <EvolutionInstancesCard />
  }

  return (
    <HubManagedCard
      title="WhatsApp (Z-API)"
      description="Envio e recebimento de mensagens via WhatsApp"
      icon={MessageCircle}
    />
  )
}

const WebhooksInfo = () => {
  const company = useAuthStore((s) => s.company)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhooks de Entrada</CardTitle>
        <CardDescription>Receba leads de landing pages e formularios externos</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          URL publica: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{supabaseUrl}/functions/v1/source-webhook?company={company?.slug ?? 'SEU_SLUG'}&source=manual</code>
        </p>
      </CardContent>
    </Card>
  )
}

const IntegrationsTab = () => {
  return (
    <Tabs defaultValue="channels">
      <TabsList>
        <TabsTrigger value="channels">Canais</TabsTrigger>
        <TabsTrigger value="calendar">Calendario</TabsTrigger>
        <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        <TabsTrigger value="payments">Pagamentos</TabsTrigger>
      </TabsList>

      <TabsContent value="channels" className="mt-4 space-y-4">
        <WhatsAppCard />
        <HubManagedCard
          title="Instagram Business"
          description="DMs e comentarios do Instagram"
          icon={Globe}
        />
        <HubManagedCard
          title="Email (Brevo)"
          description="Envio de emails transacionais e lembretes"
          icon={Mail}
        />
      </TabsContent>

      <TabsContent value="calendar" className="mt-4">
        <HubManagedCard
          title="Google Calendar"
          description="Sincronizacao de reunioes com Google Calendar"
          icon={Calendar}
        />
      </TabsContent>

      <TabsContent value="webhooks" className="mt-4"><WebhooksInfo /></TabsContent>
      <TabsContent value="payments" className="mt-4"><PaymentIntegrations /></TabsContent>
    </Tabs>
  )
}

export { IntegrationsTab }
