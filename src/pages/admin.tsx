import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AutomationRulesManager } from '@/components/admin/automation-rules-manager'
import { LeadSourcesManager } from '@/components/admin/lead-sources-manager'
import { ActivityLogsDashboard } from '@/components/admin/activity-logs-dashboard'
import { ReportsTab } from '@/components/admin/reports-tab'

const AdminPage = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Admin</h1>

      <Tabs defaultValue="automations">
        <TabsList>
          <TabsTrigger value="automations">Automacoes</TabsTrigger>
          <TabsTrigger value="sources">Origens</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="reports">Relatorios</TabsTrigger>
        </TabsList>
        <TabsContent value="automations" className="mt-4">
          <AutomationRulesManager />
        </TabsContent>
        <TabsContent value="sources" className="mt-4">
          <LeadSourcesManager />
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <ActivityLogsDashboard />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminPage
