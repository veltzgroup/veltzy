import { MessageCircle, Camera, UserPlus, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeadSourceRecord } from '@/types/database'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCircle,
  Instagram: Camera,
  Camera,
  UserPlus,
  Globe,
}

interface LeadSourceBadgeProps {
  source: LeadSourceRecord | null | undefined
  className?: string
}

const LeadSourceBadge = ({ source, className }: LeadSourceBadgeProps) => {
  if (!source) return null

  const Icon = iconMap[source.icon_name] ?? Globe

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs text-muted-foreground',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {source.name}
    </span>
  )
}

export { LeadSourceBadge }
