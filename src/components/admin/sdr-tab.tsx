import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SdrSettings } from '@/components/settings/sdr-settings'
import { SdrMetricsDashboard } from '@/components/admin/sdr-metrics-dashboard'
import { useSdrConfig } from '@/hooks/use-sdr-config'

const PromptPreview = () => {
  const { data: config } = useSdrConfig()

  const defaultPrompt = `Voce e um SDR especialista em qualificacao de leads.
Analise a conversa e retorne um JSON com:
- score: numero de 0-100 indicando potencial de compra
- temperature: cold/warm/hot/fire
- response: mensagem de resposta ao lead
- should_respond: true/false
- reasoning: breve explicacao`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Prompt Preview</CardTitle>
        <CardDescription>Prompt final enviado a IA (leitura apenas)</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-64 scrollbar-minimal">
          {config?.prompt || defaultPrompt}
        </pre>
      </CardContent>
    </Card>
  )
}

const SdrTab = () => {
  return (
    <Tabs defaultValue="config">
      <TabsList>
        <TabsTrigger value="config">Configuracao</TabsTrigger>
        <TabsTrigger value="metrics">Metricas</TabsTrigger>
        <TabsTrigger value="prompt">Prompt</TabsTrigger>
      </TabsList>
      <TabsContent value="config" className="mt-4">
        <SdrSettings />
      </TabsContent>
      <TabsContent value="metrics" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Metricas da IA SDR</CardTitle>
            <CardDescription>Performance da qualificacao automatica (ultimos 30 dias)</CardDescription>
          </CardHeader>
          <CardContent>
            <SdrMetricsDashboard />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="prompt" className="mt-4">
        <PromptPreview />
      </TabsContent>
    </Tabs>
  )
}

export { SdrTab }
