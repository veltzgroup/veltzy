import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useNotificationPreferences } from '@/hooks/use-notification-preferences'
import type { NotificationPreferences as NotifPrefs } from '@/types/database'

const toggles: { key: keyof NotifPrefs; label: string; description: string }[] = [
  { key: 'new_lead', label: 'Novo lead atribuido', description: 'Quando um lead for atribuido a voce' },
  { key: 'new_message', label: 'Nova mensagem', description: 'Quando receber mensagem nao lida' },
  { key: 'lead_transferred', label: 'Lead transferido', description: 'Quando um lead for transferido para voce' },
  { key: 'system_alerts', label: 'Alertas do sistema', description: 'Notificacoes de manutencao e atualizacoes' },
  { key: 'sound_enabled', label: 'Som de notificacao', description: 'Tocar som ao receber mensagem' },
]

const NotificationPreferencesPanel = () => {
  const { prefs, isLoading, savePrefs } = useNotificationPreferences()

  const handleToggle = (key: keyof NotifPrefs) => {
    savePrefs.mutate({ ...prefs, [key]: !prefs[key] })
  }

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificacoes</CardTitle>
        <CardDescription>Configure quais alertas voce deseja receber</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between rounded-lg border border-border/20 p-3">
            <div>
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={prefs[t.key]}
                onChange={() => handleToggle(t.key)}
              />
              <div className="peer h-5 w-9 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full" />
            </label>
          </div>
        ))}

        {savePrefs.isPending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Salvando...
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { NotificationPreferencesPanel }
