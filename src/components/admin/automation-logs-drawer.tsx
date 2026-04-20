import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/time'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAutomationLogs } from '@/hooks/use-automation-logs'

interface AutomationLogsDrawerProps {
  open: boolean
  onClose: () => void
}

const statusStyles: Record<string, string> = {
  success: 'bg-green-500/10 text-green-500',
  failed: 'bg-red-500/10 text-red-500',
  skipped: 'bg-muted text-muted-foreground',
}

const AutomationLogsDrawer = ({ open, onClose }: AutomationLogsDrawerProps) => {
  const { data: logs, isLoading } = useAutomationLogs()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background border-l shadow-xl animate-fade-in">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Logs de Automacao</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto scrollbar-minimal h-[calc(100vh-57px)] p-4 space-y-2">
          {isLoading && (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          )}

          {!isLoading && logs?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhum log registrado</p>
          )}

          {logs?.map((log) => (
            <div key={log.id} className="rounded-lg border border-border/50 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', statusStyles[log.status])}>
                  {log.status}
                </span>
                <span className="text-[10px] text-muted-foreground">{timeAgo(log.executed_at)}</span>
              </div>
              {log.error_message && (
                <p className="text-xs text-destructive">{log.error_message}</p>
              )}
              {log.new_value && (
                <pre className="text-[10px] text-muted-foreground bg-muted rounded p-1.5 overflow-x-auto">
                  {JSON.stringify(log.new_value, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { AutomationLogsDrawer }
