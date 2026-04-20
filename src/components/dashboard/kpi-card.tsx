import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string
  change: number
  icon: React.ComponentType<{ className?: string }>
}

const KpiCard = ({ title, value, change, icon: Icon }: KpiCardProps) => {
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div className="glass-card group relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:glow-primary">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight text-gradient-shine">
            {value}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-smooth">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="relative mt-3 flex items-center gap-1.5">
        <div className={cn(
          'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
          trend === 'up' && 'bg-primary/10 text-primary',
          trend === 'down' && 'bg-destructive/10 text-destructive',
          trend === 'neutral' && 'bg-muted text-muted-foreground',
        )}>
          <TrendIcon className="h-3 w-3" />
          {Math.abs(change).toFixed(1)}%
        </div>
        <span className="text-[11px] text-muted-foreground/60">vs anterior</span>
      </div>
    </div>
  )
}

export { KpiCard }
