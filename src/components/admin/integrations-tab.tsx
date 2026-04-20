import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PaymentIntegrations } from '@/components/admin/payment-integrations'

const WhatsAppPlaceholder = () => (
  <Card>
    <CardHeader>
      <CardTitle>WhatsApp (Z-API)</CardTitle>
      <CardDescription>Configure sua instancia Z-API para enviar e receber mensagens</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        Configure Instance ID, Token e Client Token no painel Z-API.
        O webhook URL e: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">https://SEU_PROJETO.supabase.co/functions/v1/zapi-webhook</code>
      </p>
    </CardContent>
  </Card>
)

const InstagramPlaceholder = () => (
  <Card>
    <CardHeader>
      <CardTitle>Instagram Business</CardTitle>
      <CardDescription>Conecte sua conta Instagram Business via OAuth</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        Configure as credenciais do Meta App no dashboard do Facebook Developers para habilitar a conexao.
      </p>
    </CardContent>
  </Card>
)

const WebhooksPlaceholder = () => (
  <Card>
    <CardHeader>
      <CardTitle>Webhooks de Entrada</CardTitle>
      <CardDescription>Receba leads de landing pages e formularios externos</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        URL publica: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">https://SEU_PROJETO.supabase.co/functions/v1/source-webhook?company=SEU_SLUG&source=manual</code>
      </p>
    </CardContent>
  </Card>
)

const IntegrationsTab = () => {
  return (
    <Tabs defaultValue="whatsapp">
      <TabsList>
        <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        <TabsTrigger value="instagram">Instagram</TabsTrigger>
        <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        <TabsTrigger value="payments">Pagamentos</TabsTrigger>
      </TabsList>
      <TabsContent value="whatsapp" className="mt-4"><WhatsAppPlaceholder /></TabsContent>
      <TabsContent value="instagram" className="mt-4"><InstagramPlaceholder /></TabsContent>
      <TabsContent value="webhooks" className="mt-4"><WebhooksPlaceholder /></TabsContent>
      <TabsContent value="payments" className="mt-4"><PaymentIntegrations /></TabsContent>
    </Tabs>
  )
}

export { IntegrationsTab }
