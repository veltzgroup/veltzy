import { usePipelineOverview } from '@/hooks/use-dashboard-metrics'

const PipelineOverview = () => {
  const { data: stages } = usePipelineOverview()
  const maxCount = Math.max(...(stages?.map((s) => s.count) ?? [1]), 1)

  return (
    <div className="glass-premium rounded-xl p-5 h-full">
      <h3 className="text-sm font-semibold mb-4">Pipeline</h3>
      <div className="space-y-4">
        {stages?.map((stage) => {
          const isClosed = !!stage.is_final
          const stageColor = isClosed ? '#10b981' : stage.color
          return (
            <div key={stage.stage_id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: stageColor }} />
                  <span className={`text-xs font-medium ${isClosed ? 'text-emerald-500' : ''}`}>{stage.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">{stage.count} leads</span>
                  {stage.value > 0 && (
                    <span className={`font-semibold ${isClosed ? 'text-emerald-500' : 'text-primary'}`}>R$ {stage.value.toLocaleString('pt-BR')}</span>
                  )}
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.max((stage.count / maxCount) * 100, 2)}%`,
                    backgroundColor: stageColor,
                    boxShadow: `0 0 8px ${stageColor}40`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { PipelineOverview }
