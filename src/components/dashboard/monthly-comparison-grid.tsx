import { useState } from 'react'
import {
  BarChart3, Users, TrendingUp, CheckCircle, DollarSign,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { useMonthlyComparisonGrid } from '@/hooks/use-dashboard-metrics'
import type { MonthlyGridData } from '@/services/dashboard.service'

const periodOptions = [
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
] as const

interface MiniChartProps {
  title: string
  icon: React.ElementType
  dataKey: string
  color: string
  data: MonthlyGridData[]
  formatter?: (v: number) => string
}

const CustomTooltip = ({
  active,
  payload,
  formatter,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  formatter?: (v: number) => string
}) => {
  if (!active || !payload?.[0]) return null
  const val = payload[0].value
  return (
    <div className="glass-card rounded-lg px-2.5 py-1.5 shadow-lg">
      <span className="text-xs font-semibold">{formatter ? formatter(val) : val}</span>
    </div>
  )
}

const MiniChart = ({ title, icon: Icon, dataKey, color, data, formatter }: MiniChartProps) => (
  <div className="bg-card border border-border/30 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-sm font-medium text-muted-foreground">{title}</span>
    </div>
    <div className="h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="month"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            content={<CustomTooltip formatter={formatter} />}
            cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
          />
          <Bar
            dataKey={dataKey}
            fill={color}
            radius={[4, 4, 0, 0]}
            animationDuration={600}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
)

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const MonthlyComparisonGrid = () => {
  const [months, setMonths] = useState(6)
  const { data, isLoading } = useMonthlyComparisonGrid(months)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">Comparativo Mensal</h3>
        </div>
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="text-xs bg-card border border-border/40 rounded-lg px-3 py-1.5 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {periodOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border/30 rounded-xl p-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-[180px] w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MiniChart
            title="Negocios"
            icon={Users}
            dataKey="leads"
            color="hsl(var(--primary))"
            data={data ?? []}
          />
          <MiniChart
            title="Conversao %"
            icon={TrendingUp}
            dataKey="conversion"
            color="hsl(210 80% 55%)"
            data={data ?? []}
            formatter={(v) => `${v}%`}
          />
          <MiniChart
            title="Deals Fechados"
            icon={CheckCircle}
            dataKey="deals"
            color="hsl(var(--primary))"
            data={data ?? []}
          />
          <MiniChart
            title="Valor Fechados"
            icon={DollarSign}
            dataKey="value"
            color="hsl(25 95% 53%)"
            data={data ?? []}
            formatter={fmtCurrency}
          />
        </div>
      )}
    </div>
  )
}

export { MonthlyComparisonGrid }
