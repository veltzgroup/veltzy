import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SellersTab } from '@/components/admin/sellers-tab'
import { PipelineTab } from '@/components/admin/pipeline-tab'
import { AutomationRulesManager } from '@/components/admin/automation-rules-manager'
import { SdrTab } from '@/components/admin/sdr-tab'
import { IntegrationsTab } from '@/components/admin/integrations-tab'
import { AutoReplySettings } from '@/components/settings/auto-reply-settings'
import { ReportsTab } from '@/components/admin/reports-tab'
import { ActivityLogsDashboard } from '@/components/admin/activity-logs-dashboard'

const AdminPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'sellers'

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Admin</h1>

      <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="sellers">Vendedores</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="automations">Automacoes</TabsTrigger>
          <TabsTrigger value="sdr">IA SDR</TabsTrigger>
          <TabsTrigger value="integrations">Integracoes</TabsTrigger>
          <TabsTrigger value="auto-reply">Auto-Reply</TabsTrigger>
          <TabsTrigger value="reports">Relatorios</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="sellers" className="mt-4"><SellersTab /></TabsContent>
        <TabsContent value="pipeline" className="mt-4"><PipelineTab /></TabsContent>
        <TabsContent value="automations" className="mt-4"><AutomationRulesManager /></TabsContent>
        <TabsContent value="sdr" className="mt-4"><SdrTab /></TabsContent>
        <TabsContent value="integrations" className="mt-4"><IntegrationsTab /></TabsContent>
        <TabsContent value="auto-reply" className="mt-4"><AutoReplySettings /></TabsContent>
        <TabsContent value="reports" className="mt-4"><ReportsTab /></TabsContent>
        <TabsContent value="logs" className="mt-4"><ActivityLogsDashboard /></TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminPage
