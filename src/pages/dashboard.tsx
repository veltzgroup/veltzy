import { useState } from 'react'
import {
  Building2, Clock, Calendar, CalendarDays, BarChart3,
  TrendingUp, Target, DollarSign, Users,
} from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardKpis } from '@/hooks/use-dashboard-metrics'
import { MonthlyComparisonChart } from '@/components/dashboard/monthly-comparison-chart'
import { SellerPerformanceTable } from '@/components/dashboard/seller-performance-table'

const curveData = [5, 8, 15, 35, 60, 75, 60, 35, 15, 8, 5].map((v, i) => ({ x: i, y: v }))

const periodOptions = [
  { label: 'Hoje', icon: Clock, days: 1 },
  { label: 'Semana', icon: Calendar, days: 7 },
  { label: 'Mês', icon: CalendarDays, days: 30 },
  { label: 'Total', icon: BarChart3, days: undefined },
] as const

const fmt = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const DecorativeLine = () => (
  <div className="h-[80px] mt-4 opacity-60">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={curveData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <Line
          type="monotone"
          dataKey="y"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          filter="url(#glow)"
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
)

interface BreakdownItem {
  value: string
  color: string
  dotColor: string
  label: string
}

const Breakdown = ({ items }: { items: BreakdownItem[] }) => (
  <>
    <div className="border-t border-border/30 my-3" />
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-0.5">
          <span className={cn('text-sm font-bold', item.color)}>{item.value}</span>
          <span className="text-[10px] text-muted-foreground">
            <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle', item.dotColor)} />
            {item.label}
          </span>
        </div>
      ))}
    </div>
  </>
)

const DashboardPage = () => {
  const company = useAuthStore((s) => s.company)
  const [selectedDays, setSelectedDays] = useState<number | undefined>(30)
  const { data: kpis } = useDashboardKpis(selectedDays)

  const cardBase = 'bg-card border border-border/30 rounded-2xl p-5'

  return (
    <div className="min-h-full p-6">
      <div className="space-y-8 animate-fade-in">

        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Olá, {company?.name}!
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Bem-vindo ao seu painel de gestão
              </p>
            </div>
          </div>

          {/* SELETOR DE PERIODO */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Exibir:</span>
            <div className="flex gap-1.5">
              {periodOptions.map((p) => {
                const active = selectedDays === p.days
                return (
                  <button
                    key={p.label}
                    onClick={() => setSelectedDays(p.days)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-smooth',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border/40 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <p.icon className="h-4 w-4" />
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* GRID 3x2 DE KPI CARDS */}
        <div className="grid grid-cols-3 gap-6">

          {/* LINHA 1 - Cards com grafico decorativo */}

          {/* Taxa de Conversão */}
          <div className={cardBase}>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Taxa de Conversão</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">
              {kpis?.conversionRate ?? 0}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">Leads convertidos em deals</p>
            <DecorativeLine />
          </div>

          {/* Score Médio IA */}
          <div className={cardBase}>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Score Médio IA</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Target className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">
              {kpis?.avgAiScore ?? 0}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">Qualificação média dos leads</p>
            <DecorativeLine />
          </div>

          {/* Deals Fechados */}
          <div className={cardBase}>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Deals Fechados</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">
              {kpis?.dealsClosed ?? 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Negócios concluídos com sucesso</p>
            <DecorativeLine />
          </div>

          {/* LINHA 2 - Cards com breakdown */}

          {/* Negócios */}
          <div className={cardBase}>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Negócios</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">
              {kpis?.totalLeads ?? 0}
            </p>
            <Breakdown items={[
              { value: String(kpis?.openCount ?? 0), color: 'text-yellow-500', dotColor: 'bg-yellow-500', label: 'Aberto' },
              { value: String(kpis?.closedCount ?? 0), color: 'text-primary', dotColor: 'bg-primary', label: 'Fechado' },
              { value: String(kpis?.lostCount ?? 0), color: 'text-red-500', dotColor: 'bg-red-500', label: 'Perdido' },
            ]} />
          </div>

          {/* Ticket Médio */}
          <div className={cardBase}>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Ticket Médio</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">
              {fmt(kpis?.avgTicket ?? 0)}
            </p>
          </div>

          {/* Valor Total */}
          <div className={cardBase}>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor Total</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-primary mt-2">
              {fmt(kpis?.totalValue ?? 0)}
            </p>
            <Breakdown items={[
              { value: fmt(kpis?.openValue ?? 0), color: 'text-yellow-500', dotColor: 'bg-yellow-500', label: 'Aberto' },
              { value: fmt(kpis?.closedValue ?? 0), color: 'text-primary', dotColor: 'bg-primary', label: 'Fechado' },
              { value: fmt(kpis?.lostValue ?? 0), color: 'text-red-500', dotColor: 'bg-red-500', label: 'Perdido' },
            ]} />
          </div>
        </div>

        {/* COMPARATIVO MENSAL */}
        <MonthlyComparisonChart />

        {/* PERFORMANCE VENDEDORES */}
        <SellerPerformanceTable />

      </div>
    </div>
  )
}

export default DashboardPage
