import { useNavigate } from 'react-router-dom'
import { Bot, AlertCircle, Info, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/time'
import { useNotifications } from '@/hooks/use-notifications'
import type { Notification } from '@/types/database'

const PriorityIcon = ({ notification }: { notification: Notification }) => {
  const isHigh = notification.title === 'Tarefa vencida' || notification.title === 'Reuniao em breve'
  if (isHigh) return <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
  return <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
}

const CopilotCard = () => {
  const navigate = useNavigate()
  const { data: notifications } = useNotifications()

  const copilotAlerts = (notifications ?? [])
    .filter((n) => n.type === 'copilot' && !n.is_read)
    .slice(0, 5)

  return (
    <div className="bg-card border border-border/30 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
          <Bot className="h-4 w-4 text-purple-600" />
        </div>
        <h3 className="text-sm font-semibold">Copiloto</h3>
      </div>

      {copilotAlerts.length === 0 ? (
        <div className="flex items-center gap-2 py-4 justify-center">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <p className="text-xs text-muted-foreground">Nenhum alerta do copiloto. Tudo em ordem.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {copilotAlerts.map((n) => {
            const leadId = (n.action_data as Record<string, unknown>)?.leadId as string | undefined
            return (
              <button
                key={n.id}
                onClick={() => navigate(leadId ? `/inbox?lead=${leadId}` : '/tarefas')}
                className={cn(
                  'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-smooth',
                  'bg-purple-500/5 border border-purple-500/10 hover:bg-purple-500/10',
                )}
              >
                <PriorityIcon notification={n} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{n.title}</p>
                  {n.body && <p className="text-[10px] text-muted-foreground truncate">{n.body}</p>}
                </div>
                <span className="text-[9px] text-muted-foreground/60 shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { CopilotCard }
