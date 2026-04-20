import { useState } from 'react'
import { Users, Handshake, TrendingUp, DollarSign, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePersonalReport } from '@/hooks/use-personal-report'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const PersonalReports = () => {
  const [days, setDays] = useState(30)
  const { data: report, isLoading } = usePersonalReport(days)

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  }

  const metrics = [
    { label: 'Leads Atribuidos', value: String(report?.assigned_leads ?? 0), icon: Users },
    { label: 'Deals Fechados', value: String(report?.deals_closed ?? 0), icon: Handshake },
    { label: 'Taxa de Conversao', value: `${report?.conversion_rate ?? 0}%`, icon: TrendingUp },
    { label: 'Receita Gerada', value: fmt(report?.revenue ?? 0), icon: DollarSign },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Meus Relatorios</CardTitle>
            <CardDescription>Sua performance pessoal</CardDescription>
          </div>
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <TabsList>
              <TabsTrigger value="7">7d</TabsTrigger>
              <TabsTrigger value="30">30d</TabsTrigger>
              <TabsTrigger value="90">90d</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {metrics.map((m) => (
            <div key={m.label} className="flex items-center gap-3 rounded-lg border border-border/20 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <m.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-lg font-bold">{m.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export { PersonalReports }
