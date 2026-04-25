import { useState } from 'react'
import {
  Clock, Calendar, CalendarDays, BarChart3,
  DollarSign, Users, TrendingUp, Plus, Flame,
  Thermometer, Snowflake, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLeads } from '@/hooks/use-leads'
import { usePipelineStages } from '@/hooks/use-pipeline-stages'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { LeadWithDetails, LeadTemperature } from '@/types/database'

const periodOptions = [
  { label: 'Hoje', icon: Clock, days: 1 },
  { label: 'Semana', icon: Calendar, days: 7 },
  { label: 'Mês', icon: CalendarDays, days: 30 },
  { label: 'Total', icon: BarChart3, days: undefined },
] as const

const fmt = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const tempConfig: Record<LeadTemperature, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  cold: { label: 'Frio', color: 'text-blue-400', icon: Snowflake },
  warm: { label: 'Morno', color: 'text-yellow-500', icon: Thermometer },
  hot: { label: 'Quente', color: 'text-orange-500', icon: Flame },
  fire: { label: 'Fire', color: 'text-red-500', icon: Zap },
}

const filterByPeriod = (leads: LeadWithDetails[], days: number | undefined) => {
  if (!days) return leads
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return leads.filter((l) => new Date(l.created_at) >= cutoff)
}

const DealsPage = () => {
  const { data: allLeads } = useLeads()
  const { data: stages } = usePipelineStages()
  const [selectedDays, setSelectedDays] = useState<number | undefined>(30)

  const leads = filterByPeriod(allLeads ?? [], selectedDays)

  const openLeads = leads.filter((l) => l.status === 'new' || l.status === 'qualifying' || l.status === 'open')
  const closedLeads = leads.filter((l) => l.status === 'deal')
  const lostLeads = leads.filter((l) => l.status === 'lost')

  const totalValue = leads.reduce((sum, l) => sum + (l.deal_value ?? 0), 0)
  const openValue = openLeads.reduce((sum, l) => sum + (l.deal_value ?? 0), 0)
  const closedValue = closedLeads.reduce((sum, l) => sum + (l.deal_value ?? 0), 0)
  const lostValue = lostLeads.reduce((sum, l) => sum + (l.deal_value ?? 0), 0)
  const avgTicket = leads.length > 0 ? totalValue / leads.length : 0

  const stageMap = new Map(stages?.map((s) => [s.id, s]) ?? [])

  const cardBase = 'bg-card border border-border/30 rounded-2xl p-5'

  return (
    <div className="min-h-full p-6">
      <div className="space-y-6 animate-fade-in">

        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Negócios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestão completa de leads e oportunidades
            </p>
          </div>
          <div className="flex items-center gap-3">
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
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Novo Negócio
            </Button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-3 gap-6">
          <div className={cardBase}>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total de Negócios</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">{leads.length}</p>
            <div className="border-t border-border/30 my-3" />
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-bold text-yellow-500">{openLeads.length}</span>
                <span className="text-[10px] text-muted-foreground">
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle bg-yellow-500" />
                  Aberto
                </span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-bold text-primary">{closedLeads.length}</span>
                <span className="text-[10px] text-muted-foreground">
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle bg-primary" />
                  Fechado
                </span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-bold text-red-500">{lostLeads.length}</span>
                <span className="text-[10px] text-muted-foreground">
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle bg-red-500" />
                  Perdido
                </span>
              </div>
            </div>
          </div>

          <div className={cardBase}>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Ticket Médio</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">{fmt(avgTicket)}</p>
          </div>

          <div className={cardBase}>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor Total</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-primary mt-2">{fmt(totalValue)}</p>
            <div className="border-t border-border/30 my-3" />
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-bold text-yellow-500">{fmt(openValue)}</span>
                <span className="text-[10px] text-muted-foreground">Aberto</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-bold text-primary">{fmt(closedValue)}</span>
                <span className="text-[10px] text-muted-foreground">Fechado</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-bold text-red-500">{fmt(lostValue)}</span>
                <span className="text-[10px] text-muted-foreground">Perdido</span>
              </div>
            </div>
          </div>
        </div>

        {/* TABELA */}
        <div className="glass-card rounded-xl p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="pb-3 text-left font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Contato</th>
                  <th className="pb-3 text-right font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Valor</th>
                  <th className="pb-3 text-left font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Etapa</th>
                  <th className="pb-3 text-center font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Temperatura</th>
                  <th className="pb-3 text-left font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Origem</th>
                  <th className="pb-3 text-left font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Responsável</th>
                  <th className="pb-3 text-right font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const stage = stageMap.get(lead.stage_id)
                  const temp = tempConfig[lead.temperature]
                  const TempIcon = temp.icon
                  const initials = lead.name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() ?? '?'
                  const assignedName = (lead.profiles as { name?: string } | null)?.name

                  return (
                    <tr key={lead.id} className="border-b border-border/10 last:border-0 hover:bg-muted/20 transition-smooth">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            {lead.avatar_url ? (
                              <img src={lead.avatar_url} alt={lead.name ?? ''} className="h-full w-full rounded-full object-cover" />
                            ) : (
                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials}</AvatarFallback>
                            )}
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{lead.name ?? 'Sem nome'}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{lead.email ?? lead.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right font-semibold text-primary">
                        {lead.deal_value ? fmt(lead.deal_value) : '-'}
                      </td>
                      <td className="py-3">
                        {stage && (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                            {stage.name}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <span className={cn('inline-flex items-center gap-1 text-xs', temp.color)}>
                          <TempIcon className="h-3.5 w-3.5" />
                          {temp.label}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {(lead.lead_sources as { name?: string } | null)?.name ?? '-'}
                      </td>
                      <td className="py-3 text-xs">
                        {assignedName ?? <span className="text-muted-foreground/40">Sem responsável</span>}
                      </td>
                      <td className="py-3 text-right text-xs text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  )
                })}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      Nenhum negócio encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DealsPage
