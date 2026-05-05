import { useNavigate } from 'react-router-dom'
import { Activity, RefreshCw, AlertTriangle, Lightbulb, AlertCircle, ExternalLink, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { useSalesPulse } from '@/hooks/use-sales-pulse'
import type { SalesPulseAlerta, SalesPulseAcao } from '@/hooks/use-sales-pulse'

const alertaConfig: Record<SalesPulseAlerta['tipo'], { color: string; bg: string; badge: string; icon: typeof AlertTriangle }> = {
  urgente: { color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20', badge: 'bg-red-500/20 text-red-600', icon: AlertCircle },
  atencao: { color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20', badge: 'bg-yellow-500/20 text-yellow-600', icon: AlertTriangle },
  oportunidade: { color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-600', icon: Lightbulb },
}

const tipoBadgeLabel: Record<SalesPulseAlerta['tipo'], string> = {
  urgente: 'Urgente',
  atencao: 'Atenção',
  oportunidade: 'Oportunidade',
}

const AlertaBadge = ({ alerta, onNavigate }: { alerta: SalesPulseAlerta; onNavigate: (leadId: string) => void }) => {
  const config = alertaConfig[alerta.tipo] ?? alertaConfig.atencao
  const Icon = config.icon
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5', config.bg)}>
      <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', config.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn('text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5', config.badge)}>
            {tipoBadgeLabel[alerta.tipo]}
          </span>
        </div>
        <p className="text-xs text-foreground leading-relaxed">{alerta.texto}</p>
      </div>
      {alerta.lead_id && (
        <button
          onClick={() => onNavigate(alerta.lead_id!)}
          className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-foreground/10 transition-smooth shrink-0 mt-0.5"
          title="Abrir no inbox"
        >
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

const AcaoItem = ({ acao, onCreateTask }: { acao: SalesPulseAcao; onCreateTask: (texto: string) => void }) => (
  <div className="flex w-full items-center gap-3 rounded-xl border border-border/30 bg-muted/30 px-4 py-3 group">
    <div className="flex-1 min-w-0">
      <p className="text-sm text-foreground leading-snug">{acao.texto}</p>
    </div>
    <button
      onClick={() => onCreateTask(acao.texto)}
      className="flex h-7 items-center gap-1.5 rounded-lg border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 shrink-0 px-2 overflow-hidden max-w-7 group-hover:max-w-[120px]"
    >
      <Plus className="h-3.5 w-3.5 shrink-0" />
      <span className="text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">Criar tarefa</span>
    </button>
  </div>
)

const LoadingSkeleton = () => (
  <div className="bg-card/80 backdrop-blur-sm border border-border/30 rounded-2xl overflow-hidden">
    <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div>
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-2.5 w-40" />
        </div>
      </div>
    </div>
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  </div>
)

const SalesPulseCard = () => {
  const navigate = useNavigate()
  const { data, isLoading, isError, refresh, isFetching } = useSalesPulse()

  const handleNavigateToLead = (leadId: string) => {
    navigate(`/inbox?lead=${leadId}`)
  }

  const handleCreateTask = (texto: string) => {
    navigate(`/tarefas?titulo=${encodeURIComponent(texto)}`)
  }

  if (isLoading) return <LoadingSkeleton />

  if (isError) {
    return (
      <div className="bg-card/80 backdrop-blur-sm border border-border/30 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 via-primary/8 to-primary/5 px-6 py-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shadow-sm">
              <Activity className="h-4.5 w-4.5 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Pulso de Vendas</h3>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-10 px-6">
          <AlertCircle className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Não foi possível gerar a análise</p>
          <button
            onClick={refresh}
            className="text-xs text-primary hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-card/80 backdrop-blur-sm border border-border/30 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 via-primary/8 to-primary/5 px-6 py-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shadow-sm">
              <Activity className="h-4.5 w-4.5 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Pulso de Vendas</h3>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-10 px-6">
          <Activity className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Adicione leads ao CRM para ver insights da IA</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/30 rounded-2xl overflow-hidden">
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/8 to-primary/5 px-6 py-4 border-b border-border/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shadow-sm">
              <Activity className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Pulso de Vendas</h3>
              <p className="text-[10px] text-muted-foreground">Análise em tempo real por IA</p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={isFetching}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-smooth disabled:opacity-50"
            title="Atualizar análise"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Situação Atual */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Situação Atual</h4>
            <p className="text-[15px] text-foreground leading-relaxed font-medium">{data.situacao}</p>
            {data.alertas.length > 0 && (
              <div className="space-y-2.5 pt-2">
                {data.alertas.slice(0, 3).map((alerta, i) => (
                  <AlertaBadge key={i} alerta={alerta} onNavigate={handleNavigateToLead} />
                ))}
              </div>
            )}
          </div>

          {/* Right: Próximas Ações */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Próximas Ações</h4>
            {data.acoes.length > 0 ? (
              <div className="space-y-2.5">
                {data.acoes.slice(0, 3).map((acao, i) => (
                  <AcaoItem key={i} acao={acao} onCreateTask={handleCreateTask} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Nenhuma ação sugerida no momento.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { SalesPulseCard }
