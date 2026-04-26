import { useState } from 'react'
import {
  BarChart3, Users, TrendingUp, CheckCircle, DollarSign,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { useMonthlyComparisonGrid } from '@/hooks/use-dashboard-metrics'
import type { MonthlyGridData } from '@/services/dashboard.service'

const periodOptions = [
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
] as const

interface GradientDef {
  id: string
  color: string
}

const gradients: GradientDef[] = [
  { id: 'greenGrad', color: '#10b981' },
  { id: 'blueGrad', color: '#3b82f6' },
  { id: 'greenGrad2', color: '#10b981' },
  { id: 'orangeGrad', color: '#f97316' },
]

interface MiniChartProps {
  title: string
  icon: React.ElementType
  dataKey: string
  gradient: GradientDef
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

const MiniChart = ({ title, icon: Icon, dataKey, gradient, data, formatter }: MiniChartProps) => (
  <div className="bg-card border border-border/30 rounded-xl p-3">
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
    </div>
    <div className="h-[120px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id={gradient.id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gradient.color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={gradient.color} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            content={<CustomTooltip formatter={formatter} />}
            cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
          />
          <Bar
            dataKey={dataKey}
            fill={`url(#${gradient.id})`}
            radius={[3, 3, 0, 0]}
            animationDuration={600}
            stroke={gradient.color}
            strokeWidth={1.5}
            strokeOpacity={0.9}
          >
            {data.map((_, idx) => (
              <Cell key={idx} strokeDasharray="" />
            ))}
          </Bar>
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
          <h3 className="text-base font-semibold text-foreground">Comparativo Mensal</h3>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border/30 rounded-xl p-3">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-[120px] w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniChart
            title="Negócios"
            icon={Users}
            dataKey="leads"
            gradient={gradients[0]}
            data={data ?? []}
          />
          <MiniChart
            title="Conversão %"
            icon={TrendingUp}
            dataKey="conversion"
            gradient={gradients[1]}
            data={data ?? []}
            formatter={(v) => `${v}%`}
          />
          <MiniChart
            title="Deals Fechados"
            icon={CheckCircle}
            dataKey="deals"
            gradient={gradients[2]}
            data={data ?? []}
          />
          <MiniChart
            title="Valor Fechados"
            icon={DollarSign}
            dataKey="value"
            gradient={gradients[3]}
            data={data ?? []}
            formatter={fmtCurrency}
          />
        </div>
      )}
    </div>
  )
}

export { MonthlyComparisonGrid }
