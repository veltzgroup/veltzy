import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useAllTickets, useUpdateTicketStatus } from '@/hooks/use-support-tickets'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { timeAgo } from '@/lib/time'
import type { TicketStatus } from '@/types/database'

const priorityStyles: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500',
  high: 'bg-orange-500/10 text-orange-500',
  medium: 'bg-yellow-500/10 text-yellow-500',
  low: 'bg-muted text-muted-foreground',
}

const statusOptions: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Aberto' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'resolved', label: 'Resolvido' },
  { value: 'closed', label: 'Fechado' },
]

const SupportTicketsDashboard = () => {
  const { data: tickets, isLoading } = useAllTickets()
  const updateStatus = useUpdateTicketStatus()

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

  return (
    <div className="space-y-2">
      {tickets?.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum ticket</p>}

      {tickets?.map((t) => (
        <div key={t.id} className="rounded-lg border border-border/30 p-3 space-y-2 hover:bg-muted/20 transition-smooth">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              <p className="text-xs text-muted-foreground truncate">{t.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', priorityStyles[t.priority])}>
                {t.priority}
              </span>
              <Select
                value={t.status}
                onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v as TicketStatus })}
              >
                <SelectTrigger className="h-6 w-28 text-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/60">{timeAgo(t.created_at)}</p>
        </div>
      ))}
    </div>
  )
}

export { SupportTicketsDashboard }
