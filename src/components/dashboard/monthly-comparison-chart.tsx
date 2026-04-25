import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useMonthlyComparison } from '@/hooks/use-dashboard-metrics'
import { Skeleton } from '@/components/ui/skeleton'

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (!active || !payload) return null
  return (
    <div className="glass-card rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

interface MonthlyComparisonChartProps {
  days?: number
}

const MonthlyComparisonChart = ({ days }: MonthlyComparisonChartProps) => {
  const { data, isLoading } = useMonthlyComparison(days)

  return (
    <div className="glass-premium rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4">Leads vs Deals</h3>
      {isLoading ? (
        <Skeleton className="h-[260px] w-full" />
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data ?? []} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.3 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} animationDuration={800} animationBegin={0} />
              <Bar dataKey="deals" name="Deals" fill="hsl(var(--status-deal))" radius={[6, 6, 0, 0]} animationDuration={800} animationBegin={200} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export { MonthlyComparisonChart }
