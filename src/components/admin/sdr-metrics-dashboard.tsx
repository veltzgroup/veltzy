import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Target, TrendingUp, Users } from 'lucide-react'
import { useSdrMetrics } from '@/hooks/use-sdr-metrics'

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { range: string; color: string } }> }) => {
  if (!active || !payload?.[0]) return null
  const d = payload[0]
  return (
    <div className="glass-card rounded-lg px-3 py-2 shadow-lg text-[11px]">
      <p className="font-medium">Score {d.payload.range}</p>
      <p className="text-muted-foreground">{d.value} leads</p>
    </div>
  )
}

const SdrMetricsDashboard = () => {
  const { kpis, distribution, isLoading } = useSdrMetrics(30)

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Carregando metricas...</p>

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border border-border/20 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Qualificados pela IA</p>
            <p className="text-xl font-bold">{kpis?.qualified_count ?? 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border/20 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Score Medio</p>
            <p className="text-xl font-bold">{kpis?.avg_score ?? 0}%</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border/20 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Taxa de Qualificacao</p>
            <p className="text-xl font-bold">{kpis?.qualification_rate ?? 0}%</p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Distribuicao por Faixa de Score</h4>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution ?? []}>
              <XAxis dataKey="range" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={800}>
                {distribution?.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export { SdrMetricsDashboard }
