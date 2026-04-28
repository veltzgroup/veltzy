import { Calendar, MessageCircle, Globe, Mail } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PaymentIntegrations } from '@/components/admin/payment-integrations'
import { useAuthStore } from '@/stores/auth.store'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

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
          Gerenciado pelo Hub
        </span>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        Integracao gerenciada pelo Hub. Entre em contato com o suporte para configurar.
      </p>
    </CardContent>
  </Card>
)

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
        <HubManagedCard
          title="WhatsApp (Z-API)"
          description="Envio e recebimento de mensagens via WhatsApp"
          icon={MessageCircle}
        />
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
