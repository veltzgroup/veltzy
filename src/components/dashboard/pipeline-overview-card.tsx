import { usePipelineOverview } from '@/hooks/use-dashboard-metrics'
import { Skeleton } from '@/components/ui/skeleton'

const fmt = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const PipelineOverviewCard = () => {
  const { data: stages, isLoading } = usePipelineOverview()

  const totalLeads = stages?.reduce((s, st) => s + st.count, 0) ?? 0
  const totalValue = stages?.reduce((s, st) => s + st.value, 0) ?? 0
  const maxCount = Math.max(...(stages?.map((s) => s.count) ?? [1]), 1)

  if (isLoading) {
    return (
      <div className="bg-card border border-border/30 rounded-2xl p-5">
        <Skeleton className="h-5 w-36 mb-1" />
        <Skeleton className="h-3 w-52 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border/30 rounded-2xl p-5">
      <h3 className="text-base font-semibold text-foreground">Visão do Pipeline</h3>
      <p className="text-xs text-muted-foreground mt-0.5 mb-5">
        Distribuição de leads por etapa
      </p>

      <div className="space-y-4">
        {stages?.map((stage) => (
          <div key={stage.stage_id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-sm font-medium text-foreground">{stage.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">{stage.count}</span>
                {stage.value > 0 && (
                  <span className="font-semibold text-primary">{fmt(stage.value)}</span>
                )}
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.max((stage.count / maxCount) * 100, 2)}%`,
                  backgroundColor: stage.color,
                  boxShadow: `0 0 8px ${stage.color}40`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border/30 mt-5 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Total em Pipeline</span>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{totalLeads} leads</span>
            <span className="font-semibold text-primary">{fmt(totalValue)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export { PipelineOverviewCard }
