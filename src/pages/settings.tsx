import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileSettings } from '@/components/settings/profile-settings'
import { SdrSettings } from '@/components/settings/sdr-settings'
import { AutoReplySettings } from '@/components/settings/auto-reply-settings'

const SettingsPage = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Configuracoes</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="sdr">IA SDR</TabsTrigger>
          <TabsTrigger value="auto-reply">Auto-Reply</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="sdr" className="mt-4">
          <SdrSettings />
        </TabsContent>
        <TabsContent value="auto-reply" className="mt-4">
          <AutoReplySettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SettingsPage
